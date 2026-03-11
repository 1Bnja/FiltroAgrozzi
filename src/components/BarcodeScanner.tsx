"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface BarcodeScannerProps {
  onScan: (value: string) => void;
  paused: boolean;
}

export default function BarcodeScanner({ onScan, paused }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pausedRef = useRef(paused);
  const lastScanned = useRef<string | null>(null);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep pausedRef in sync
  useEffect(() => {
    pausedRef.current = paused;
    // When unpaused, clear the last scanned so it can scan the same code again if needed
    if (!paused) {
      lastScanned.current = null;
    }
  }, [paused]);

  const handleDecode = useCallback(
    (decodedText: string) => {
      if (pausedRef.current) return;
      // Ignore if same as last scanned (within cooldown)
      if (lastScanned.current === decodedText) return;
      lastScanned.current = decodedText;
      onScan(decodedText);
      // Reset cooldown after 3 seconds to allow re-scanning different codes
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
      cooldownTimer.current = setTimeout(() => {
        lastScanned.current = null;
      }, 3000);
    },
    [onScan]
  );

  useEffect(() => {
    const regionId = "barcode-reader";
    let mounted = true;

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode(regionId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 120 },
          },
          (decodedText) => handleDecode(decodedText),
          () => {}
        );
      } catch {
        if (mounted) {
          setError("No se pudo acceder a la cámara. Verifica los permisos.");
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [handleDecode]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        id="barcode-reader"
        className="w-full rounded-2xl overflow-hidden"
      />
      <p className="text-center text-slate-400 text-xs mt-2">
        {paused ? "Procesando..." : "Apunta la cámara al código de barras"}
      </p>
    </div>
  );
}
