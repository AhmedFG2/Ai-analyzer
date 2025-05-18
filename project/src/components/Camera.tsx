import React, { useRef, useEffect, useState } from 'react';
import { Camera as CameraIcon, Power, Plus, Minus, Video } from 'lucide-react';
import { useCameraStore, useAnalyticsStore } from '../store';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';
import VideoSource from './VideoSource';

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

interface VideoStreamProps {
  id: string;
  source?: { type: 'ip' | 'file' | 'webcam', url?: string };
  onRemove: () => void;
}

const VideoStream: React.FC<VideoStreamProps> = ({ id, source, onRemove }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { streams, addStream, removeStream } = useCameraStore();
  const { addCustomer, updateCustomer, deactivateCustomer } = useAnalyticsStore();
  const objectDetectorRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const lastDetectionTimeRef = useRef<Map<string, number>>(new Map());
  const lastPositionsRef = useRef<Map<string, [number, number]>>(new Map());

  const startStream = async () => {
    try {
      setStreamError(null);
      let stream: MediaStream | null = null;

      if (source?.type === 'webcam') {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      }

      if (!videoRef.current) return;

      if (stream) {
        videoRef.current.srcObject = stream;
        addStream(id, stream);
      } else if (source?.type === 'ip' || source?.type === 'file') {
        if (!source.url) throw new Error('No URL provided');
        videoRef.current.src = source.url;
      }

      await videoRef.current.play();
      setIsActive(true);
      await initializeDetection();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start video stream';
      console.error('Stream error:', err);
      setStreamError(errorMessage);
      stopStream();
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
      videoRef.current.src = '';
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
    setStreamError(null);
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
    if (!canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const now = Date.now();
    const currentDetections = new Set<string>();

    // Process person detections
    const personDetections = predictions
      .filter(pred => pred.class === 'person' && pred.score >= CONFIDENCE_THRESHOLD)
      .sort((a, b) => b.score - a.score);

    for (const prediction of personDetections) {
      const bbox = prediction.bbox as [number, number, number, number];
      const center: [number, number] = [
        bbox[0] + bbox[2] / 2,
        bbox[1] + bbox[3] / 2
      ];

      // Try to match with existing customer
      const customerId = findNearestCustomer(center);

      if (customerId) {
        // Update existing customer
        currentDetections.add(customerId);
        lastDetectionTimeRef.current.set(customerId, now);
        lastPositionsRef.current.set(customerId, center);
        await updateCustomer(customerId, center, bbox);
        
        // Draw bounding box
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(...bbox);
      } else {
        // New detection
        const newCustomerId = await addCustomer(center, bbox);
        currentDetections.add(newCustomerId);
        lastDetectionTimeRef.current.set(newCustomerId, now);
        lastPositionsRef.current.set(newCustomerId, center);
        
        // Draw bounding box
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(...bbox);
      }
    }

    // Deactivate customers that are no longer visible
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
      if (!isDetecting || !objectDetectorRef.current || !videoRef.current || !canvasRef.current) {
        if (animationFrame !== null) {
          cancelAnimationFrame(animationFrame);
        }
        return;
      }

      if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        if (timestamp - lastProcessTime >= DETECTION_INTERVAL) {
          try {
            const predictions = await objectDetectorRef.current.detect(videoRef.current);
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
        const { videoWidth, videoHeight } = videoRef.current;
        if (videoWidth && videoHeight) {
          setDimensions({ width: videoWidth, height: videoHeight });
          canvasRef.current.width = videoWidth;
          canvasRef.current.height = videoHeight;
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

  return (
    <div className="relative bg-white rounded-lg shadow-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          {source?.type === 'webcam' ? 'Webcam' : 
           source?.type === 'ip' ? 'IP Camera' : 
           source?.type === 'file' ? 'Video File' : 
           'Camera'} {id}
        </h3>
        <button
          onClick={onRemove}
          className="text-red-500 hover:text-red-700"
          title="Remove stream"
        >
          <Minus className="w-5 h-5" />
        </button>
      </div>

      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain"
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          width={dimensions.width}
          height={dimensions.height}
        />
        
        {(streamError || modelsLoading) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/75 text-white">
            {streamError ? (
              <p className="text-red-500 text-center px-4">{streamError}</p>
            ) : (
              <p className="text-blue-400">Loading detection model...</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-center">
        <button
          onClick={isActive ? stopStream : startStream}
          disabled={modelsLoading}
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
          Live Video Streams
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