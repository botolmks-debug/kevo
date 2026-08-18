// Deklarasi tipe global untuk Meta Pixel (fbq).
// Script pixel dimuat di app/layout.tsx; ini hanya memberi tahu TypeScript
// bahwa window.fbq ada, supaya pemanggilan fbq('track', ...) tidak error.

export {};

declare global {
  interface Window {
    fbq?: (
      command: string,
      eventName: string,
      params?: Record<string, unknown>
    ) => void;
  }
}
