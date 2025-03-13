import { NetworkCamera } from '../types';

const COMMON_PORTS = [80, 8080, 554, 8554, 8000, 8081, 8082, 8083];
const COMMON_PATHS = [
  '/video.mjpg',
  '/mjpg/video.mjpg',
  '/videostream.cgi',
  '/video',
  '/stream',
  '/live',
  '/live.mjpg',
  '/cam',
  '/camera'
];

export async function testEndpoint(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      timeout: 1000
    });
    return true;
  } catch {
    return false;
  }
}

export async function scanNetwork(): Promise<NetworkCamera[]> {
  const cameras: NetworkCamera[] = [];
  const baseIP = '192.168.1'; // Most common local network prefix
  const scanPromises: Promise<void>[] = [];

  // Scan common IP ranges
  for (let i = 1; i <= 254; i++) {
    const ip = `${baseIP}.${i}`;
    
    for (const port of COMMON_PORTS) {
      const baseUrl = `http://${ip}${port === 80 ? '' : `:${port}`}`;
      
      for (const path of COMMON_PATHS) {
        const url = `${baseUrl}${path}`;
        
        const scanPromise = testEndpoint(url).then(isActive => {
          if (isActive) {
            cameras.push({
              ip,
              port,
              url,
              type: path.includes('mjpg') ? 'mjpeg' : 'unknown'
            });
          }
        });
        
        scanPromises.push(scanPromise);
      }
    }
  }

  await Promise.all(scanPromises);
  return cameras;
}