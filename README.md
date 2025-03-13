# Ai-analyzer

all files ( https://drive.google.com/drive/folders/18O-_ZX92iS7O-j1yJr-BH79FoOZqnGYr?usp=drive_link )

# AI Analyzer
https://zesty-creponne-bfc1f3.netlify.app/

Real-time customer analytics using AI for emotion detection and tracking.

## Prerequisites

- Node.js 18.0+ installed
- OpenSSL (for certificate generation)
- install ffmpeg release https://www.ffmpeg.org/download.html

## Set-up
Convert RTSP streams from IP cameras to HLS format and serve them securely via HTTPS. Perfect for browser-based video streaming.

 use rstp to hls.bat to convert your rstp url to hls

## Configuration

Edit server.js:

Replace with your camera's RTSP URL
<const RTSP_URL = "rtsp://username:password@camera-ip:554/path";>

### Generate SSL certificates:

<openssl req -x509 -newkey rsa:4096 -nodes -keyout ssl/key.pem -out ssl/cert.pem -days 365>

## Running the Server:

npm start 

Server running on https://localhost:443

## Accessing the Stream:
HLS URL: -https://localhost/stream.m3u8

you can use hls.js for testing the stream

## Access Ai analyzer:
https://zesty-creponne-bfc1f3.netlify.app/

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
