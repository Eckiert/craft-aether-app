import { useCallback, useRef, useState } from "react";

export interface AudioRecorder {
  isRecording: boolean;
  start: () => Promise<{ ok: boolean; error?: string }>;
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
      if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        const msg = "Mikrofon-API in diesem Browser nicht verfügbar";
        setError(msg);
        return { ok: false, error: msg };
      }
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
      return { ok: true };
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Mikrofon nicht verfügbar";
      const name = e instanceof Error ? e.name : "";
      let friendly = raw;
      if (name === "NotAllowedError" || /denied|permission/i.test(raw)) {
        friendly =
          "Mikrofon-Zugriff verweigert. In der Lovable-Vorschau (iframe) ist das Mikrofon oft blockiert — öffne die App in einem neuen Tab und erlaube den Zugriff.";
      } else if (name === "NotFoundError") {
        friendly = "Kein Mikrofon gefunden.";
      } else if (name === "NotReadableError") {
        friendly = "Mikrofon wird bereits von einer anderen App verwendet.";
      }
      setError(friendly);
      cleanup();
      setIsRecording(false);
      return { ok: false, error: friendly };
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
