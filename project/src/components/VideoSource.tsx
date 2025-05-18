import React, { useState } from 'react';
import { Video, Link, Upload } from 'lucide-react';

interface VideoSourceProps {
  onSourceSelected: (source: { type: 'ip' | 'file', url: string }) => void;
}

const VideoSource: React.FC<VideoSourceProps> = ({ onSourceSelected }) => {
  const [ipAddress, setIpAddress] = useState('');
  const [showIpForm, setShowIpForm] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onSourceSelected({ type: 'file', url });
    }
  };

  const handleIpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ipAddress) {
      onSourceSelected({ type: 'ip', url: ipAddress });
      setIpAddress('');
      setShowIpForm(false);
    }
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

        <div>
          {!showIpForm ? (
            <button
              onClick={() => setShowIpForm(true)}
              className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:text-blue-500 transition-colors"
            >
              <Link className="w-5 h-5" />
              <span>Add IP Camera</span>
            </button>
          ) : (
            <form onSubmit={handleIpSubmit} className="space-y-2">
              <input
                type="text"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="rtsp:// or http:// stream URL"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Add Stream
                </button>
                <button
                  type="button"
                  onClick={() => setShowIpForm(false)}
                  className="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoSource