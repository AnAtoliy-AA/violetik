// Stub for `server-only` in the Vitest jsdom environment.
// The real package throws at runtime when imported in a client bundle;
// this no-op replaces it so unit tests can import server modules directly.
export {};
