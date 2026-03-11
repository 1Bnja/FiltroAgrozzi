"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase";
import dynamic from "next/dynamic";

const BarcodeScanner = dynamic(() => import("@/components/BarcodeScanner"), {
  ssr: false,
});

export default function RecepcionPage() {
  const [lote, setLote] = useState("");
  const [sending, setSending] = useState(false);
  const [scanning, setScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const enviarLote = useCallback(
    async (valor: string) => {
      const trimmed = valor.trim();
      if (!trimmed || sending) return;

      setSending(true);
      try {
        const { error } = await getSupabase()
          .from("pallets")
          .insert({ lote: trimmed, ubicado: false });

        if (error) throw error;

        toast.success(`Lote ${trimmed} registrado`, {
          description: "Enviado a filtro correctamente",
        });
        setLote("");
        inputRef.current?.focus();
      } catch {
        toast.error("Error al registrar", {
          description: "Intenta de nuevo",
        });
      } finally {
        setSending(false);
      }
    },
    [sending]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    enviarLote(lote);
  };

  const handleScan = useCallback(
    (value: string) => {
      setScanning(false);
      setLote(value);
      toast.info(`Código escaneado: ${value}`);
      enviarLote(value);
    },
    [enviarLote]
  );

  return (
    <main className="min-h-svh flex flex-col bg-slate-50">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 bg-white border-b border-slate-100">
        <Link
          href="/"
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 active:scale-95"
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
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Modo Recepcionista
          </h1>
          <p className="text-xs text-slate-400">Registrar lotes manualmente</p>
        </div>
      </header>

      {/* Barcode scanner overlay */}
      {scanning && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setScanning(false)}
        />
      )}

      {/* Manual input */}
      <div className="flex-1 flex flex-col justify-center px-4 py-6">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 w-full max-w-md mx-auto"
        >
          <div>
            <label
              htmlFor="lote"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Número de Lote
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                id="lote"
                type="text"
                value={lote}
                onChange={(e) => setLote(e.target.value)}
                placeholder="Ingresa el número de lote..."
                autoComplete="off"
                autoFocus
                className="flex-1 h-14 px-4 text-lg rounded-2xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-shadow"
              />
              <button
                type="button"
                onClick={() => setScanning(true)}
                className="flex items-center justify-center w-14 h-14 rounded-2xl border border-slate-200 bg-white text-slate-600 transition-all hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-300 active:scale-95"
                title="Escanear código de barras"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                  <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                  <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                  <line x1="7" y1="12" x2="17" y2="12" />
                  <line x1="7" y1="8" x2="17" y2="8" />
                  <line x1="7" y1="16" x2="17" y2="16" />
                </svg>
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={!lote.trim() || sending}
            className="w-full h-14 rounded-2xl bg-emerald-500 text-white text-lg font-semibold shadow-sm transition-all duration-150 hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {sending ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Enviando...
              </span>
            ) : (
              "Enviar a Filtro"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
