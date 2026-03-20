/**
 * Voice Input — Web Speech API wrapper for hands-free AI interaction.
 *
 * Wraps `SpeechRecognition` (browser-native, no npm dependency).
 * Provides continuous transcription with interim/final results.
 *
 * @module lab/ai
 * @layer L2
 */

export interface VoiceInput {
  start(): void;
  stop(): void;
  isListening(): boolean;
  onTranscript(cb: (text: string, isFinal: boolean) => void): () => void;
  onError(cb: (error: string) => void): () => void;
  isSupported(): boolean;
  destroy(): void;
}

export interface VoiceInputOptions {
  lang?: string;
  continuous?: boolean;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionInstance) | null {
  const win = globalThis as unknown as Record<string, unknown>;
  return (win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null) as
    (new () => SpeechRecognitionInstance) | null;
}

/**
 * Creates a voice input controller.
 */
export function createVoiceInput(options?: VoiceInputOptions): VoiceInput {
  const SpeechRecognition = getSpeechRecognitionConstructor();
  const transcriptCbs = new Set<(text: string, isFinal: boolean) => void>();
  const errorCbs = new Set<(error: string) => void>();
  let recognition: SpeechRecognitionInstance | null = null;
  let listening = false;
  let destroyed = false;

  function createRecognition(): SpeechRecognitionInstance | null {
    if (!SpeechRecognition) return null;
    const rec = new SpeechRecognition();
    rec.continuous = options?.continuous ?? true;
    rec.interimResults = true;
    rec.lang = options?.lang ?? 'en-US';

    rec.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        for (const cb of transcriptCbs) {
          cb(transcript, result.isFinal);
        }
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      const msg = event.message ?? event.error;
      for (const cb of errorCbs) {
        cb(msg);
      }
    };

    rec.onend = () => {
      listening = false;
      // Auto-restart in continuous mode if not destroyed/stopped explicitly
      if (!destroyed && options?.continuous && recognition === rec) {
        try { rec.start(); listening = true; } catch { /* no-op */ }
      }
    };

    return rec;
  }

  return {
    start() {
      if (destroyed || listening || !SpeechRecognition) return;
      recognition = createRecognition();
      if (!recognition) return;
      try {
        recognition.start();
        listening = true;
      } catch {
        listening = false;
      }
    },

    stop() {
      if (!recognition) return;
      const rec = recognition;
      recognition = null;
      listening = false;
      try { rec.stop(); } catch { /* no-op */ }
    },

    isListening() {
      return listening;
    },

    onTranscript(cb: (text: string, isFinal: boolean) => void): () => void {
      transcriptCbs.add(cb);
      return () => { transcriptCbs.delete(cb); };
    },

    onError(cb: (error: string) => void): () => void {
      errorCbs.add(cb);
      return () => { errorCbs.delete(cb); };
    },

    isSupported() {
      return SpeechRecognition !== null;
    },

    destroy() {
      destroyed = true;
      if (recognition) {
        try { recognition.abort(); } catch { /* no-op */ }
        recognition = null;
      }
      listening = false;
      transcriptCbs.clear();
      errorCbs.clear();
    },
  };
}
