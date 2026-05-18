// Lightweight safe AudioContext wrapper.
// Tries to use native `react-native-audio-api`, then Web Audio, then a no-op stub.
let AudioContext = null;

try {
  // Try native module first (may throw on Expo Go if native module missing)
  // eslint-disable-next-line global-require
  const native = require("react-native-audio-api");
  if (native && native.AudioContext) {
    AudioContext = native.AudioContext;
  }
} catch (err) {
  // ignore - we'll fall back
}

if (!AudioContext) {
  if (typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext)) {
    AudioContext = window.AudioContext || window.webkitAudioContext;
  } else {
    // Minimal no-op stub to avoid runtime crashes when no audio backend is available.
    /* eslint-disable @typescript-eslint/no-empty-function */
    AudioContext = class {
      constructor() {
        this.state = "running";
      }
      async resume() {}
      createBufferSource() {
        return {
          connect() {},
          disconnect() {},
          start() {},
          stop() {},
          onended: null,
        };
      }
      createGain() {
        return { gain: { value: 1 }, connect() {}, disconnect() {} };
      }
      async decodeAudioData() {
        return null;
      }
      async close() {}
    };
  }
}

export { AudioContext };
