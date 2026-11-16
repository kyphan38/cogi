"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface SpokenAnswer {
  base64: string;
  /** Without `;codecs=...`: Gemini takes the base type only. */
  mimeType: string;
}

/** A tap released at once is a mistake, not an answer. */
const MIN_MS = 1500;

// iOS WebKit has no audio/webm, so audio/mp4 is in the list.
function pickMime(): string {
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"]) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error ?? new Error("Could not read the recording."));
    fr.onload = () => {
      const s = String(fr.result);
      resolve(s.slice(s.indexOf(",") + 1));
    };
    fr.readAsDataURL(blob);
  });
}

function micError(e: unknown): string {
  const name = (e as DOMException | undefined)?.name;
  if (name === "NotAllowedError" || name === "SecurityError") return "Microphone access is off. Allow it in the browser settings.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No microphone found.";
  if (name === "NotReadableError") return "The microphone is busy in another app.";
  return "Could not start recording.";
}

/**
 * Record one spoken answer: tap to start, tap to stop, and it stops by itself at
 * `maxMs`. The audio lives only in memory until it is sent; it is never stored.
 */
export function useSpeakRecorder(maxMs: number, onDone: (answer: SpokenAnswer) => void) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timersRef = useRef<{ cap?: ReturnType<typeof setTimeout>; tick?: ReturnType<typeof setInterval> }>({});
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  const release = useCallback(() => {
    clearTimeout(timersRef.current.cap);
    clearInterval(timersRef.current.tick);
    timersRef.current = {};
    // Without this the mic light stays on.
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recRef.current = null;
  }, []);

  // Leaving the page gives the mic back and drops the audio.
  useEffect(
    () => () => {
      const rec = recRef.current;
      if (rec && rec.state !== "inactive") {
        rec.onstop = null;
        rec.stop();
      }
      release();
    },
    [release],
  );

  /** Call straight from the tap: Safari needs getUserMedia inside the user gesture. */
  const start = useCallback(async () => {
    if (recRef.current) return;
    setError(null);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Recording is not supported in this browser. Type your answer.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setError(micError(e));
      return;
    }
    streamRef.current = stream;
    const picked = pickMime();
    let rec: MediaRecorder;
    try {
      rec = picked ? new MediaRecorder(stream, { mimeType: picked }) : new MediaRecorder(stream);
    } catch (e) {
      release();
      setError(micError(e));
      return;
    }
    const mimeType = (rec.mimeType || picked || "audio/mp4").split(";")[0]!;
    const chunks: BlobPart[] = [];
    const startedAt = Date.now();
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    rec.onstop = () => {
      release();
      setRecording(false);
      if (Date.now() - startedAt < MIN_MS || chunks.length === 0) {
        setError("That was too short. Tap Speak, answer, then tap Stop.");
        return;
      }
      blobToBase64(new Blob(chunks, { type: mimeType }))
        .then((base64) => onDoneRef.current({ base64, mimeType }))
        .catch(() => setError("Could not read the recording. Try again."));
    };
    recRef.current = rec;
    rec.start();
    setSeconds(0);
    setRecording(true);
    timersRef.current.tick = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 500);
    timersRef.current.cap = setTimeout(() => {
      if (rec.state !== "inactive") rec.stop();
    }, maxMs);
  }, [maxMs, release]);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }, []);

  return { recording, seconds, error, start, stop };
}
