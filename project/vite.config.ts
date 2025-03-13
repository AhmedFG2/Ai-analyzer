import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import http from 'http';
import https from 'https';

export default defineConfig({
  plugins: [react(), {
    name: 'custom-proxy',
    configureServer(server) {
      server.middlewares.use('/proxy', (req, res, next) => {
        try {
          // Extract the target URL from the query parameter
          const url = new URL(req.url || '', 'http://localhost');
          const targetUrl = url.searchParams.get('url');
          
          if (!targetUrl) {
            res.statusCode = 400;
            res.end('Missing url parameter');
            return;
          }
          
          // Parse the target URL
          const parsedUrl = new URL(targetUrl);
          const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: req.method,
            headers: {
              ...req.headers,
              host: parsedUrl.host,
              origin: parsedUrl.origin,
              referer: parsedUrl.origin
            }
          };
          
          // Set appropriate headers for HLS streams
          if (targetUrl.endsWith('.m3u8')) {
            options.headers['Accept'] = 'application/vnd.apple.mpegurl';
          }
          
          // Create the appropriate client based on protocol
          const client = parsedUrl.protocol === 'https:' ? https : http;
          
          // Make the request
          const proxyRequest = client.request(options, (proxyResponse) => {
            // Copy status code and headers
            res.statusCode = proxyResponse.statusCode || 200;
            Object.keys(proxyResponse.headers).forEach(key => {
              res.setHeader(key, proxyResponse.headers[key] || '');
            });
            
            // For HLS streams, ensure correct content type
            if (targetUrl.endsWith('.m3u8')) {
              res.setHeader('content-type', 'application/vnd.apple.mpegurl');
            }
            
            // Pipe the response
            proxyResponse.pipe(res);
          });
          
          // Handle errors
          proxyRequest.on('error', (err) => {
            console.error('Proxy request error:', err);
            if (!res.headersSent) {
              res.statusCode = 500;
              res.end(`Proxy error: ${err.message}`);
            }
          });
          
          // Handle request body if any
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            req.pipe(proxyRequest);
          } else {
            proxyRequest.end();
          }
          
        } catch (error) {
          console.error('Proxy URL parsing error:', error);
          if (!res.headersSent) {
            res.statusCode = 400;
            res.end(`Invalid URL format: ${error.message}`);
          }
        }
      });
    }
  }],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range',
    }
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          tensorflow: ['@tensorflow/tfjs'],
          models: ['@tensorflow-models/coco-ssd']
        }
      }
    }
  }
});