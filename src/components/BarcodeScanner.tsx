"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface BarcodeScannerProps {
  onScan: (value: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const hasScanned = useRef(false);

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
          (decodedText) => {
            if (!hasScanned.current) {
              hasScanned.current = true;
              onScan(decodedText);
            }
          },
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
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60">
        <p className="text-white text-sm font-medium">Escanear código de barras</p>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20 active:scale-95"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      {/* Scanner area */}
      <div className="flex-1 flex items-center justify-center px-4" ref={containerRef}>
        <div className="w-full max-w-sm">
          {error ? (
            <div className="bg-red-500/20 border border-red-500/40 rounded-2xl p-6 text-center">
              <p className="text-red-200 text-sm">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <div
              id="barcode-reader"
              className="w-full rounded-2xl overflow-hidden"
            />
          )}
        </div>
      </div>

      {/* Hint */}
      {!error && (
        <p className="text-center text-white/60 text-xs pb-6 px-4">
          Apunta la cámara al código de barras del pallet
        </p>
      )}
    </div>
  );
}
