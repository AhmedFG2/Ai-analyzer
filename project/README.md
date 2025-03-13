# AI Analyzer

Real-time customer analytics using AI for emotion detection and tracking.

## Prerequisites

- Node.js 18.0+ installed
- Git installed
- OpenSSL (for certificate generation)
- install ffmpeg.exe

## Set-up
Convert RTSP streams from IP cameras to HLS format and serve them securely via HTTPS. Perfect for browser-based video streaming.
1. use rstp to hls.bat to convert your rstp url to hls
Configuration
Edit server.js:
javascript
// Replace with your camera's RTSP URL
const RTSP_URL = "rtsp://username:password@camera-ip:554/path";

Generate SSL certificates:
openssl req -x509 -newkey rsa:4096 -nodes -keyout ssl/key.pem -out ssl/cert.pem -days 365

Running the Server:

npm start
# Server running on https://localhost:443

Accessing the Stream:
HLS URL: https://localhost/stream.m3u8
you can use hls.js for testing the stream

## Features

- Customer tracking
- Visit duration monitoring
- Analytics dashboard

## Technologies Used

- React
- TypeScript
- TensorFlow.js
- Tailwind CSS
- Vite
