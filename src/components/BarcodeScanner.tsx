"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Tesseract from "tesseract.js";

interface BarcodeScannerProps {
  onScan: (result: string) => void;
}

/**
 * Extracts the numeric value following "LOTE" from OCR text.
 * Handles variations like "LOTE:", "LOTE :", "LOTE 12345", "L0TE" (OCR misread), etc.
 */
function extractLote(text: string): string | null {
  // Normalize common OCR misreads: 0↔O, 1↔I/l
  const normalized = text.toUpperCase().replace(/\n/g, " ");

  // Match "LOTE" (with possible OCR noise) followed by optional separator then digits
  const match = normalized.match(/L[O0]TE\s*[:\-.\s]*\s*(\d[\d\s\-./]*\d)/);
  if (match) {
    // Clean extracted number: remove internal spaces/dashes that OCR may add
    return match[1].replace(/[\s\-]/g, "").trim();
  }
  return null;
}

export function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const [enabled, setEnabled] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<string>("Iniciando cámara...");
  const [lastResult, setLastResult] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start camera
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStatus("Apunta a la tarja para leer el LOTE");
        }
      } catch {
        setStatus("No se pudo acceder a la cámara");
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [enabled]);

  // Capture a frame from the video
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/png");
  }, []);

  // Run OCR on captured frame
  const runOcr = useCallback(async () => {
    if (scanningRef.current) return;

    const frame = captureFrame();
    if (!frame) return;

    scanningRef.current = true;
    setScanning(true);
    setStatus("Analizando imagen...");

    try {
      const { data } = await Tesseract.recognize(frame, "spa", {
        logger: () => {},
      });

      const lote = extractLote(data.text);
      if (lote && lote !== lastResult) {
        setLastResult(lote);
        setStatus(`LOTE detectado: ${lote}`);
        onScan(lote);
        // Cooldown to prevent duplicates
        setTimeout(() => setLastResult(null), 4000);
      } else if (!lote) {
        setStatus("No se detectó LOTE. Ajusta el encuadre.");
      }
    } catch {
      setStatus("Error en OCR. Reintentando...");
    } finally {
      scanningRef.current = false;
      setScanning(false);
    }
  }, [captureFrame, onScan, lastResult]);

  // Periodic OCR scan every 2.5 seconds
  useEffect(() => {
    if (!enabled) return;

    intervalRef.current = setInterval(() => {
      runOcr();
    }, 2500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, runOcr]);

  const handleDisable = () => {
    setEnabled(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-200 shadow-sm">
      <canvas ref={canvasRef} className="hidden" />
      {enabled ? (
        <>
          <video
            ref={videoRef}
            className="w-full aspect-[4/3] object-cover"
            playsInline
            muted
          />
          {/* Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-4/5 h-1/3 border-2 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.3)] transition-colors ${scanning ? "border-yellow-400/80" : "border-emerald-400/60"}`} />
          </div>
          {/* Status bar */}
          <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm px-4 py-2.5 flex items-center gap-2">
            {scanning && (
              <svg className="animate-spin h-4 w-4 text-yellow-400 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            <span className="text-sm text-white/90 truncate">{status}</span>
          </div>
          {/* Close button */}
          <button
            onClick={handleDisable}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center text-sm backdrop-blur-sm transition hover:bg-black/70"
          >
            ✕
          </button>
          {/* Manual capture button */}
          <button
            onClick={runOcr}
            disabled={scanning}
            className="absolute bottom-12 right-3 rounded-full bg-emerald-500/90 text-white px-3 py-1.5 text-xs font-semibold backdrop-blur-sm transition hover:bg-emerald-600 disabled:opacity-50"
          >
            📷 Capturar
          </button>
        </>
      ) : (
        <button
          onClick={() => setEnabled(true)}
          className="w-full flex flex-col items-center justify-center gap-3 py-12 text-slate-500 hover:text-emerald-600 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span className="text-sm font-medium">Activar cámara</span>
        </button>
      )}
    </div>
  );
}
