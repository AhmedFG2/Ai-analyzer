export interface Detection {
  bbox: [number, number, number, number];
  class: string;
  score: number;
}

export interface Position {
  x: number;
  y: number;
  timestamp: number;
}

export interface Customer {
  id: string;
  firstSeen: Date;
  lastSeen: Date;
  position: [number, number];
  positionHistory: Position[];
  isActive: boolean;
  boundingBox: [number, number, number, number];
  snapshot?: string;
}

export interface NetworkCamera {
  ip: string;
  port: number;
  url: string;
  type: 'mjpeg' | 'rtsp' | 'hls' | 'unknown';
}

export interface AnalyticsData {
  totalCustomers: number;
  timestamp: Date;
  detections: Detection[];
  activeCustomers: Customer[];
}

export interface CameraState {
  isActive: boolean;
  streams: { [key: string]: MediaStream };
  error: string | null;
  addStream: (id: string, stream: MediaStream) => void;
  removeStream: (id: string) => void;
}

export interface AnalyticsState {
  data: AnalyticsData[];
  isRecording: boolean;
  startTime: Date | null;
  customers: Customer[];
  addCustomer: (
    detection: [number, number],
    bbox: [number, number, number, number]
  ) => Promise<string>;
  updateCustomer: (
    customerId: string,
    position: [number, number],
    bbox: [number, number, number, number]
  ) => Promise<void>;
  deactivateCustomer: (customerId: string) => Promise<void>;
  updateCustomerSnapshot: (customerId: string, snapshot: string) => void;
}