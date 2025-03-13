# AI Analyzer

Real-time customer analytics using AI for emotion detection and tracking.

## Prerequisites

- Node.js 18+ installed
- Git installed
- A Supabase account and project

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ai-analyzer
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
```

5. Open `http://localhost:5173` in your browser

## Features

- Real-time face detection
- Emotion analysis
- Customer tracking
- Visit duration monitoring
- Analytics dashboard

## Database Setup

1. Create a new project in Supabase
2. Go to Project Settings > API to get your project URL and anon key
3. The required tables will be created automatically through migrations

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## Technologies Used

- React
- TypeScript
- TensorFlow.js
- face-api.js
- Supabase
- Tailwind CSS
- Vite