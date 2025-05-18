import React from 'react';
import { Camera, MonitorCheck } from 'lucide-react';
import CameraComponent from './components/Camera';
import Analytics from './components/Analytics';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <MonitorCheck className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900">AI Analyzer</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid gap-8">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Camera className="w-6 h-6 text-blue-500" />
              <h2 className="text-xl font-semibold">Live Camera Feed</h2>
            </div>
            <CameraComponent />
          </section>

          <Analytics />
        </div>
      </main>
    </div>
  );
}

export default App;