"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase";
import dynamic from "next/dynamic";

const BarcodeScanner = dynamic(() => import("@/components/BarcodeScanner"), {
  ssr: false,
});

const VALID_BARCODE = /^\d+$/;

export default function RecepcionPage() {
  const [lote, setLote] = useState("");
  const [sending, setSending] = useState(false);
  const [lastRegistered, setLastRegistered] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const enviarLote = useCallback(
    async (valor: string) => {
      const trimmed = valor.trim();
      if (!trimmed || sending) return;

      // Validate: only numeric codes
      if (!VALID_BARCODE.test(trimmed)) {
        toast.error("Código inválido", {
          description: "Solo se aceptan códigos numéricos",
        });
        return;
      }

      setSending(true);
      try {
        // Check for duplicates
        const { data: existing } = await getSupabase()
          .from("pallets")
          .select("id")
          .eq("lote", trimmed)
          .limit(1);

        if (existing && existing.length > 0) {
          toast.warning(`Lote ${trimmed} ya registrado`, {
            description: "Este pallet ya fue ingresado anteriormente",
          });
          return;
        }

        const { error } = await getSupabase()
          .from("pallets")
          .insert({ lote: trimmed, ubicado: false });

        if (error) throw error;

        setLastRegistered(trimmed);
        setLote("");
        inputRef.current?.focus();
        toast.success(`Lote ${trimmed} registrado`, {
          description: "Enviado a filtro correctamente",
        });
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

  const handleScan = useCallback(
    (value: string) => {
      enviarLote(value);
    },
    [enviarLote]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    enviarLote(lote);
  };

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
          <p className="text-xs text-slate-400">Escaneo automático de pallets</p>
        </div>
      </header>

      {/* Scanner always active */}
      <div className="flex-1 flex flex-col items-center px-4 py-6 gap-4">
        <div className="w-full max-w-sm">
          <BarcodeScanner onScan={handleScan} paused={sending} />
        </div>

        {/* Last registered feedback */}
        {lastRegistered && (
          <div className="w-full max-w-sm bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-emerald-900 truncate">
                Último registrado
              </p>
              <p className="text-xs text-emerald-600 font-mono truncate">
                {lastRegistered}
              </p>
            </div>
          </div>
        )}

        {sending && (
          <div className="flex items-center gap-2 text-slate-500">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Registrando...</span>
          </div>
        )}

        {/* Manual input */}
        <div className="w-full max-w-sm pt-2 border-t border-slate-200">
          <p className="text-xs text-slate-400 mb-2 text-center">o ingresa manualmente</p>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={lote}
              onChange={(e) => setLote(e.target.value)}
              placeholder="Número de lote..."
              autoComplete="off"
              className="flex-1 h-12 px-4 text-base rounded-2xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-shadow"
            />
            <button
              type="submit"
              disabled={!lote.trim() || sending}
              className="h-12 px-5 rounded-2xl bg-emerald-500 text-white text-sm font-semibold shadow-sm transition-all duration-150 hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Enviar
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
