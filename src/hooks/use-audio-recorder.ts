import { useCallback, useRef, useState } from "react";

export interface AudioRecorder {
  isRecording: boolean;
  start: () => Promise<void>;
  stop: () => Promise<Blob | null>;
  cancel: () => void;
  error: string | null;
}

export function useAudioRecorder(): AudioRecorder {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const stopResolveRef = useRef<((blob: Blob | null) => void) | null>(null);

  const cleanup = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  };

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      // Pick a supported mime type
      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
      const mimeType = candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const resolve = stopResolveRef.current;
        stopResolveRef.current = null;
        cleanup();
        setIsRecording(false);
        resolve?.(blob.size > 0 ? blob : null);
      };
      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mikrofon nicht verfügbar");
      cleanup();
      setIsRecording(false);
    }
  }, []);

  const stop = useCallback(() => {
    return new Promise<Blob | null>((resolve) => {
      const rec = recorderRef.current;
      if (!rec || rec.state === "inactive") {
        resolve(null);
        return;
      }
      stopResolveRef.current = resolve;
      rec.stop();
    });
  }, []);

  const cancel = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.onstop = null;
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    }
    cleanup();
    setIsRecording(false);
  }, []);

  return { isRecording, start, stop, cancel, error };
}
