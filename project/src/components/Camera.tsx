import React, { useRef, useEffect, useState } from 'react';
import { Camera as CameraIcon, Power, Plus, Minus, Video, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';
import { useCameraStore, useAnalyticsStore } from '../store';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';
import VideoSource from './VideoSource';
import Hls from 'hls.js';

// Initialize TensorFlow.js
tf.ready().then(() => {
  tf.setBackend('webgl');
  console.log('TensorFlow.js initialized with backend:', tf.getBackend());
});

// Constants for detection
const CONFIDENCE_THRESHOLD = 0.5;
const DETECTION_INTERVAL = 100;
const TRACKING_DISTANCE_THRESHOLD = 100;
const CUSTOMER_TIMEOUT = 2000;
const SNAPSHOT_INTERVAL = 5000;
const HLS_CONFIG = {
  debug: false,
  enableWorker: true,
  lowLatencyMode: true,
  backBufferLength: 90,
  maxBufferLength: 30,
  maxMaxBufferLength: 600,
  maxBufferSize: 60 * 1000 * 1000,
  maxBufferHole: 0.5,
  highBufferWatchdogPeriod: 2,
  nudgeOffset: 0.1,
  nudgeMaxRetry: 3,
  maxFragLookUpTolerance: 0.25,
  liveSyncDurationCount: 3,
  liveMaxLatencyDurationCount: 10,
  liveDurationInfinity: true,
  liveBackBufferLength: null,
  progressive: true,
  xhrSetup: (xhr: XMLHttpRequest) => {
    xhr.withCredentials = false;
  }
};

interface VideoStreamProps {
  id: string;
  source?: { type: 'ip' | 'file' | 'webcam', url?: string };
  onRemove: () => void;
}

const VideoStream: React.FC<VideoStreamProps> = ({ id, source, onRemove }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { streams, addStream, removeStream } = useCameraStore();
  const { addCustomer, updateCustomer, deactivateCustomer, updateCustomerSnapshot } = useAnalyticsStore();
  const objectDetectorRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const lastDetectionTimeRef = useRef<Map<string, number>>(new Map());
  const lastPositionsRef = useRef<Map<string, [number, number]>>(new Map());
  const lastSnapshotTimeRef = useRef<Map<string, number>>(new Map());
  const [streamType, setStreamType] = useState<string>('');
  const hlsRef = useRef<Hls | null>(null);
  const mjpegRef = useRef<HTMLImageElement | null>(null);
  const mjpegIntervalRef = useRef<number | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        } else if ((containerRef.current as any).msRequestFullscreen) {
          await (containerRef.current as any).msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        document.fullscreenElement === containerRef.current ||
        (document as any).webkitFullscreenElement === containerRef.current ||
        (document as any).msFullscreenElement === containerRef.current
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const captureSnapshot = async (video: HTMLVideoElement | HTMLImageElement, boundingBox: [number, number, number, number]) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.width || video.clientWidth;
      canvas.height = video.height || video.clientHeight;
      
      if (canvas.width === 0 || canvas.height === 0) {
        console.warn('Invalid canvas dimensions:', { width: canvas.width, height: canvas.height });
        return null;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const [x, y, width, height] = boundingBox;
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      const padding = 20;
      const cropX = Math.max(0, x - padding);
      const cropY = Math.max(0, y - padding);
      const cropWidth = Math.min(width + padding * 2, canvas.width - cropX);
      const cropHeight = Math.min(height + padding * 2, canvas.height - cropY);

      if (cropWidth <= 0 || cropHeight <= 0) {
        console.warn('Invalid crop dimensions', { cropWidth, cropHeight });
        return null;
      }

      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = cropWidth;
      croppedCanvas.height = cropHeight;
      
      const croppedCtx = croppedCanvas.getContext('2d');
      if (!croppedCtx) return null;

      croppedCtx.drawImage(
        canvas,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      );

      return croppedCanvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
      console.warn('Failed to capture snapshot:', error);
      return null;
    }
  };

  const setupMjpegStream = (url: string) => {
    if (!videoRef.current || !videoRef.current.parentElement) return;
    
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    
    videoRef.current.parentElement.appendChild(img);
    videoRef.current.style.display = 'none';
    mjpegRef.current = img;
    
    const refreshMjpeg = () => {
      if (!mjpegRef.current) return;
      
      const timestamp = new Date().getTime();
      mjpegRef.current.src = `${url}?t=${timestamp}`;
      
      mjpegRef.current.onload = () => {
        if (mjpegRef.current) {
          setDimensions({
            width: mjpegRef.current.naturalWidth,
            height: mjpegRef.current.naturalHeight
          });
        }
      };
      
      mjpegRef.current.onerror = () => {
        if (isActive) {
          setStreamError('MJPEG stream error. Retrying...');
        }
      };
    };
    
    refreshMjpeg();
    mjpegIntervalRef.current = window.setInterval(refreshMjpeg, 100);
    setStreamType('MJPEG');
  };

  const initializeHls = (url: string) => {
    if (!videoRef.current) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    if (!Hls.isSupported()) {
      if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Fallback to native HLS support (Safari)
        videoRef.current.src = url;
        return true;
      }
      setStreamError('HLS is not supported in this browser');
      return false;
    }

    try {
      const hls = new Hls(HLS_CONFIG);
      hlsRef.current = hls;

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log('HLS: Media attached');
        hls.loadSource(url);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS: Manifest parsed');
        videoRef.current?.play()
          .then(() => {
            setIsActive(true);
            initializeDetection();
            retryCountRef.current = 0;
          })
          .catch(error => {
            console.error('HLS play error:', error);
            setStreamError(`Failed to play HLS stream: ${error.message}`);
          })
          .finally(() => {
            setIsInitializing(false);
          });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (retryCountRef.current < maxRetries) {
                console.log('HLS: Fatal network error encountered, trying to recover...');
                hls.startLoad();
                retryCountRef.current++;
              } else {
                setStreamError(`Network error: ${data.details}`);
                stopStream();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              if (retryCountRef.current < maxRetries) {
                console.log('HLS: Fatal media error encountered, trying to recover...');
                hls.recoverMediaError();
                retryCountRef.current++;
              } else {
                setStreamError(`Media error: ${data.details}`);
                stopStream();
              }
              break;
            default:
              setStreamError(`Stream error: ${data.details}`);
              stopStream();
              break;
          }
        }
      });

      hls.attachMedia(videoRef.current);
      return true;
    } catch (error) {
      console.error('HLS initialization error:', error);
      setStreamError(`Failed to initialize HLS: ${error.message}`);
      return false;
    }
  };

  const startStream = async () => {
    try {
      setStreamError(null);
      setIsInitializing(true);
      retryCountRef.current = 0;
      
      if (!videoRef.current) {
        throw new Error("Video element not found");
      }

      if (videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      videoRef.current.removeAttribute('src');
      videoRef.current.load();

      if (source?.type === 'webcam') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          });
          
          if (!videoRef.current) {
            stream.getTracks().forEach(track => track.stop());
            throw new Error("Video element no longer available");
          }
          
          videoRef.current.srcObject = stream;
          setStreamType('Webcam');
          addStream(id, stream);
          
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              videoRef.current.play()
                .then(() => {
                  setIsActive(true);
                  initializeDetection();
                })
                .catch(error => {
                  console.error('Webcam play error:', error);
                  setStreamError(`Failed to start webcam: ${error.message}`);
                  stopStream();
                })
                .finally(() => {
                  setIsInitializing(false);
                });
            }
          };
          
          videoRef.current.onerror = (e) => {
            console.error('Video error:', e);
            setStreamError('Failed to access webcam');
            stopStream();
            setIsInitializing(false);
          };
        } catch (error) {
          console.error('Webcam access error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to access webcam';
          setStreamError(errorMessage);
          setIsInitializing(false);
          return;
        }
      } else if (source?.type === 'ip' || source?.type === 'file') {
        if (!source.url) {
          setIsInitializing(false);
          throw new Error('No URL provided');
        }
        
        const url = source.url.toLowerCase();
        
        if (url.endsWith('.m3u8')) {
          setStreamType('HLS');
          const success = initializeHls(source.url);
          if (!success) {
            setIsInitializing(false);
          }
        } else if (url.includes('mjpg') || url.includes('mjpeg')) {
          setupMjpegStream(source.url);
          setIsActive(true);
          initializeDetection();
          setIsInitializing(false);
        } else {
          setStreamType('Direct');
          videoRef.current.src = source.url;
          
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play()
              .then(() => {
                setIsActive(true);
                initializeDetection();
              })
              .catch(error => {
                console.error('Video play error:', error);
                setStreamError(`Failed to play video: ${error.message}`);
              })
              .finally(() => {
                setIsInitializing(false);
              });
          };
          
          videoRef.current.onerror = (e) => {
            console.error('Video error:', e);
            setStreamError('Failed to load video');
            stopStream();
            setIsInitializing(false);
          };
        }
      } else {
        setIsInitializing(false);
        throw new Error('Invalid source type');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start video stream';
      console.error('Stream error:', err);
      setStreamError(errorMessage);
      stopStream();
      setIsInitializing(false);
    }
  };

  const stopStream = () => {
    setIsDetecting(false);
    const stream = streams[id];
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      removeStream(id);
    }
    if (videoRef.current) {
      videoRef.current.pause();
      if (videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      videoRef.current.removeAttribute('src');
      videoRef.current.style.display = '';
      videoRef.current.load();
    }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (mjpegRef.current) {
      mjpegRef.current.remove();
      mjpegRef.current = null;
    }
    if (mjpegIntervalRef.current !== null) {
      clearInterval(mjpegIntervalRef.current);
      mjpegIntervalRef.current = null;
    }
    setIsActive(false);
    setStreamError(null);
    setStreamType('');
    retryCountRef.current = 0;
  };

  const initializeDetection = async () => {
    if (!objectDetectorRef.current) {
      try {
        setModelsLoading(true);
        await tf.ready();
        objectDetectorRef.current = await cocoSsd.load({
          base: 'lite_mobilenet_v2'
        });
        setIsDetecting(true);
      } catch (error) {
        console.error('Model loading error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load detection model';
        setStreamError(errorMessage);
      } finally {
        setModelsLoading(false);
      }
    } else {
      setIsDetecting(true);
    }
  };

  const findNearestCustomer = (position: [number, number]): string | null => {
    let nearestCustomer: string | null = null;
    let minDistance = TRACKING_DISTANCE_THRESHOLD;

    for (const [id, lastPos] of lastPositionsRef.current.entries()) {
      const dx = position[0] - lastPos[0];
      const dy = position[1] - lastPos[1];
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        nearestCustomer = id;
      }
    }

    return nearestCustomer;
  };

  const handleDetections = async (predictions: cocoSsd.DetectedObject[]) => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const now = Date.now();
    const currentDetections = new Set<string>();

    const personDetections = predictions
      .filter(pred => pred.class === 'person' && pred.score >= CONFIDENCE_THRESHOLD)
      .sort((a, b) => b.score - a.score);

    for (const prediction of personDetections) {
      const bbox = prediction.bbox as [number, number, number, number];
      const center: [number, number] = [
        bbox[0] + bbox[2] / 2,
        bbox[1] + bbox[3] / 2
      ];

      const customerId = findNearestCustomer(center);

      if (customerId) {
        currentDetections.add(customerId);
        lastDetectionTimeRef.current.set(customerId, now);
        lastPositionsRef.current.set(customerId, center);
        await updateCustomer(customerId, center, bbox);
        
        const lastSnapshotTime = lastSnapshotTimeRef.current.get(customerId) || 0;
        if (now - lastSnapshotTime >= SNAPSHOT_INTERVAL) {
          const snapshot = await captureSnapshot(
            mjpegRef.current || videoRef.current,
            bbox
          );
          if (snapshot) {
            updateCustomerSnapshot(customerId, snapshot);
            lastSnapshotTimeRef.current.set(customerId, now);
          }
        }
        
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(...bbox);
      } else {
        const newCustomerId = await addCustomer(center, bbox);
        currentDetections.add(newCustomerId);
        lastDetectionTimeRef.current.set(newCustomerId, now);
        lastPositionsRef.current.set(newCustomerId, center);
        
        const snapshot = await captureSnapshot(
          mjpegRef.current || videoRef.current,
          bbox
        );
        if (snapshot) {
          updateCustomerSnapshot(newCustomerId, snapshot);
          lastSnapshotTimeRef.current.set(newCustomerId, now);
        }
        
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(...bbox);
      }
    }

    for (const [id, lastTime] of lastDetectionTimeRef.current.entries()) {
      if (!currentDetections.has(id) && (now - lastTime) > CUSTOMER_TIMEOUT) {
        await deactivateCustomer(id);
        lastDetectionTimeRef.current.delete(id);
        lastPositionsRef.current.delete(id);
      }
    }
  };

  useEffect(() => {
    let animationFrame: number | null = null;
    let lastProcessTime = 0;

    const processFrame = async (timestamp: number) => {
      if (!isDetecting || !objectDetectorRef.current || !canvasRef.current) {
        if (animationFrame !== null) {
          cancelAnimationFrame(animationFrame);
        }
        return;
      }

      const sourceElement = mjpegRef.current || videoRef.current;
      if (!sourceElement) {
        animationFrame = requestAnimationFrame(processFrame);
        return;
      }

      const hasData = sourceElement instanceof HTMLVideoElement 
        ? sourceElement.readyState === sourceElement.HAVE_ENOUGH_DATA
        : sourceElement.complete && sourceElement.naturalWidth > 0;

      if (hasData) {
        if (timestamp - lastProcessTime >= DETECTION_INTERVAL) {
          try {
            const predictions = await objectDetectorRef.current.detect(sourceElement);
            await handleDetections(predictions);
            lastProcessTime = timestamp;
          } catch (error) {
            console.error('Detection error:', error);
          }
        }
      }

      animationFrame = requestAnimationFrame(processFrame);
    };

    if (isActive && isDetecting) {
      animationFrame = requestAnimationFrame(processFrame);
    }

    return () => {
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isActive, isDetecting]);

  useEffect(() => {
    const updateDimensions = () => {
      if (videoRef.current && canvasRef.current) {
        const width = videoRef.current.videoWidth || videoRef.current.clientWidth;
        const height = videoRef.current.videoHeight || videoRef.current.clientHeight;
        if (width && height) {
          setDimensions({ width, height });
          canvasRef.current.width = width;
          canvasRef.current.height = height;
        }
      }
    };

    if (videoRef.current) {
      videoRef.current.addEventListener('loadedmetadata', updateDimensions);
      videoRef.current.addEventListener('playing', updateDimensions);
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener('loadedmetadata', updateDimensions);
        videoRef.current.removeEventListener('playing', updateDimensions);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  return (
    <div className="relative bg-white rounded-lg shadow-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">
            {source?.type === 'webcam' ? 'Webcam' : 
             source?.type === 'ip' ? 'IP Camera' : 
             source?.type === 'file' ? 'Video File' : 
             'Camera'} {id}
          </h3>
          {streamType && (
            <span className="text-sm text-gray-500">
              Stream type: {streamType}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="text-gray-600 hover:text-gray-800 transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={onRemove}
            className="text-red-500 hover:text-red-700"
            title="Remove stream"
          >
            <Minus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div 
        ref={containerRef}
        className={`relative bg-black rounded-lg overflow-hidden ${
          isFullscreen ? 'fixed inset-0 z-50' : 'aspect-video'
        }`}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          crossOrigin="anonymous"
          className="w-full h-full object-contain"
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          width={dimensions.width}
          height={dimensions.height}
        />
        
        {(streamError || modelsLoading || isInitializing) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/75 text-white">
            {streamError ? (
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="w-5 h-5" />
                <p className="text-center px-4">{streamError}</p>
              </div>
            ) : isInitializing ? (
              <p className="text-blue-400">Initializing stream...</p>
            ) : (
              <p className="text-blue-400">Loading detection model...</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-center">
        <button
          onClick={isActive ? stopStream : startStream}
          disabled={modelsLoading || isInitializing}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            isActive
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isActive ? (
            <>
              <Power className="w-5 h-5" />
              Stop Stream
            </>
          ) : isInitializing ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Initializing...
            </>
          ) : (
            <>
              <Video className="w-5 h-5" />
              Start Stream
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const Camera: React.FC = () => {
  const [streams, setStreams] = useState<Array<{ id: string; source?: { type: 'ip' | 'file' | 'webcam', url?: string } }>>([
    { id: 'camera-1', source: { type: 'webcam' } }
  ]);
  const [showVideoSource, setShowVideoSource] = useState(false);

  const addStream = (source?: { type: 'ip' | 'file', url: string }) => {
    const newId = `stream-${streams.length + 1}`;
    setStreams(prev => [...prev, { 
      id: newId, 
      source: source || { type: 'webcam' }
    }]);
    setShowVideoSource(false);
  };

  const removeStream = (id: string) => {
    setStreams(prev => prev.filter(stream => stream.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <CameraIcon className="w-6 h-6 text-blue-500" />
          Video Streams
        </h2>
        <button
          onClick={() => setShowVideoSource(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Stream
        </button>
      </div>

      {showVideoSource && (
        <VideoSource onSourceSelected={addStream} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {streams.map(({ id, source }) => (
          <VideoStream
            key={id}
            id={id}
            source={source}
            onRemove={() => removeStream(id)}
          />
        ))}
      </div>
    </div>
  );
};

export default Camera;