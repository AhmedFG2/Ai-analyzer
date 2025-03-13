import React, { useState } from 'react';
import { Video, Link, Upload, AlertCircle, Info } from 'lucide-react';
import { NetworkCamera } from '../types';

interface VideoSourceProps {
  onSourceSelected: (source: { type: 'ip' | 'file', url: string }) => void;
}

const VideoSource: React.FC<VideoSourceProps> = ({ onSourceSelected }) => {
  const [ipAddress, setIpAddress] = useState('');
  const [showIpForm, setShowIpForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateStreamUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onSourceSelected({ type: 'file', url });
    }
  };

  const handleIpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipAddress) {
      setError('Please enter a stream URL');
      return;
    }

    let streamUrl = ipAddress;
    
    // Handle URLs without protocol
    if (!streamUrl.startsWith('http://') && !streamUrl.startsWith('https://')) {
      streamUrl = `http://${streamUrl}`;
    }

    if (!validateStreamUrl(streamUrl)) {
      setError('Please enter a valid URL (e.g., http://example.com/stream)');
      return;
    }

    // Special case for the pendulum camera
    if (streamUrl.includes('pendelcam.kip.uni-heidelberg.de') && !streamUrl.includes('/mjpg/video.mjpg')) {
      streamUrl = 'http://pendelcam.kip.uni-heidelberg.de/mjpg/video.mjpg';
    }

    // Always use proxy for HTTP URLs to avoid mixed content issues
    if (streamUrl.startsWith('http://')) {
      streamUrl = `/proxy?url=${encodeURIComponent(streamUrl)}`;
    }

    onSourceSelected({ type: 'ip', url: streamUrl });
    setIpAddress('');
    setShowIpForm(false);
    setError(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Video className="w-6 h-6 text-blue-500" />
        Add Video Source
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block w-full cursor-pointer">
            <input
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors">
              <Upload className="w-5 h-5 text-gray-500" />
              <span className="text-gray-600">Upload Video File</span>
            </div>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => {
              setShowIpForm(true);
            }}
            className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:text-blue-500 transition-colors ${
              showIpForm ? 'border-blue-500 text-blue-500' : ''
            }`}
          >
            <Link className="w-5 h-5" />
            <span>Add IP Camera</span>
          </button>
        </div>

        {showIpForm && (
          <form onSubmit={handleIpSubmit} className="space-y-2">
            <div className="space-y-1">
              <input
                type="text"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="Camera stream URL (e.g., 192.168.1.100/video.mjpg)"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <p className="text-xs text-gray-500">
                Example: pendelcam.kip.uni-heidelberg.de or http://camera-ip/video.mjpeg
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Add Stream
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowIpForm(false);
                  setError(null);
                }}
                className="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-700 mb-2">Supported Stream Formats:</h4>
          <ul className="list-disc list-inside text-sm text-blue-600 space-y-1">
            <li>HLS streams (.m3u8)</li>
            <li>MJPEG streams</li>
            <li>Direct video streams (.mp4, .webm)</li>
            <li>Local video files</li>
          </ul>
          <p className="mt-2 text-sm text-blue-700">
            Note: RTSP streams are not supported in browsers. Use HLS or MJPEG instead.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VideoSource;