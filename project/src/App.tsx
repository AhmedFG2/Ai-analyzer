import React from 'react';
import { MonitorCheck } from 'lucide-react';
import CameraComponent from './components/Camera';
import Analytics from './components/Analytics';

function App() {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-[2000px] mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <MonitorCheck className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-800">AI Analyzer</h1>
          </div>
        </div>
      </header>

      <main className="max-w-[2000px] mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[2fr,1fr] gap-6">
          <section className="space-y-6">
            <CameraComponent />
          </section>

          <section className="lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:sticky lg:top-6">
            <Analytics />
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;