"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type BookingState = {
  serviceId: string | null;
  masterId: string | null;
  date: string | null;
  time: string | null;
  setService: (id: string | null) => void;
  setMaster: (id: string | null) => void;
  setDate: (date: string | null) => void;
  setTime: (time: string | null) => void;
  reset: () => void;
};

const inMemoryFallback = (): Storage => {
  let store: Record<string, string> = {};
  return {
    get length() {
      return Object.keys(store).length;
    },
    clear: () => {
      store = {};
    },
    getItem: (key) => (key in store ? store[key] : null),
    key: (index) => Object.keys(store)[index] ?? null,
    removeItem: (key) => {
      delete store[key];
    },
    setItem: (key, value) => {
      store[key] = value;
    },
  };
};

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      serviceId: null,
      masterId: null,
      date: null,
      time: null,
      // Picking a different service may shift the eligible-master set,
      // so clear the master assignment whenever the service changes.
      setService: (serviceId) => set({ serviceId, masterId: null }),
      setMaster: (masterId) => set({ masterId }),
      setDate: (date) => set({ date }),
      setTime: (time) => set({ time }),
      reset: () =>
        set({ serviceId: null, masterId: null, date: null, time: null }),
    }),
    {
      name: "violetta-booking",
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? inMemoryFallback() : window.sessionStorage,
      ),
    },
  ),
);
