import { create } from 'zustand';
import { AnalyticsState, CameraState } from '../types';

const HISTORY_SIZE = 10;

export const useCameraStore = create<CameraState>((set) => ({
  isActive: false,
  streams: {},
  error: null,
  addStream: (id: string, stream: MediaStream) =>
    set((state) => ({
      streams: { ...state.streams, [id]: stream }
    })),
  removeStream: (id: string) =>
    set((state) => {
      const { [id]: removed, ...streams } = state.streams;
      return { streams };
    }),
}));

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  data: [],
  isRecording: false,
  startTime: null,
  customers: [],
  addCustomer: async (
    detection: [number, number],
    bbox: [number, number, number, number]
  ) => {
    const now = new Date();
    const newCustomer = {
      id: crypto.randomUUID(),
      firstSeen: now,
      lastSeen: now,
      position: detection,
      positionHistory: [{
        x: detection[0],
        y: detection[1],
        timestamp: now.getTime(),
      }],
      isActive: true,
      boundingBox: bbox
    };

    set((state) => ({
      customers: [...state.customers, newCustomer],
    }));

    return newCustomer.id;
  },
  updateCustomer: async (
    customerId: string,
    position: [number, number],
    bbox: [number, number, number, number]
  ) => {
    const now = new Date();
    set((state) => ({
      customers: state.customers.map(customer => 
        customer.id === customerId
          ? {
              ...customer,
              lastSeen: now,
              position,
              boundingBox: bbox,
              positionHistory: [
                ...customer.positionHistory,
                {
                  x: position[0],
                  y: position[1],
                  timestamp: now.getTime(),
                }
              ].slice(-HISTORY_SIZE),
              isActive: true,
            }
          : customer
      ),
    }));
  },
  deactivateCustomer: async (customerId: string) => {
    const now = new Date();
    set((state) => ({
      customers: state.customers.map(customer =>
        customer.id === customerId
          ? { ...customer, isActive: false, lastSeen: now }
          : customer
      ),
    }));
  },
  updateCustomerSnapshot: (customerId: string, snapshot: string) => {
    set((state) => ({
      customers: state.customers.map(customer =>
        customer.id === customerId
          ? { ...customer, snapshot }
          : customer
      ),
    }));
  },
}));