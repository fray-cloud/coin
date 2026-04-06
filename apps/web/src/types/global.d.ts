declare global {
  interface Window {
    __nativeWebSocket?: typeof WebSocket;
  }
}

export {};
