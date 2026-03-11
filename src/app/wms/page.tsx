"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getSupabase, type Pallet } from "@/lib/supabase";
import { toast } from "sonner";

function formatTiempo(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Recién llegado";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const restMins = mins % 60;
  return `${hrs}h ${restMins}m`;
}

function useTiempoTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);
}

export default function WmsPage() {
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [ubicados, setUbicados] = useState<Pallet[]>([]);
  const [fadingOut, setFadingOut] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"espera" | "ubicados">("espera");

  useTiempoTick();

  // Fetch initial data
  useEffect(() => {
    async function fetchPallets() {
      const supabase = getSupabase();
      const [pendientes, completados] = await Promise.all([
        supabase
          .from("pallets")
          .select("*")
          .eq("ubicado", false)
          .order("created_at", { ascending: true }),
        supabase
          .from("pallets")
          .select("*")
          .eq("ubicado", true)
          .order("created_at", { ascending: false }),
      ]);

      if (pendientes.error || completados.error) {
        toast.error("Error al cargar pallets");
      } else {
        setPallets(pendientes.data ?? []);
        setUbicados(completados.data ?? []);
      }
      setLoading(false);
    }
    fetchPallets();
  }, []);

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = getSupabase();
    const channel = supabase
      .channel("pallets-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pallets",
        },
        (payload) => {
          const newPallet = payload.new as Pallet;
          if (!newPallet.ubicado) {
            setPallets((prev) => {
              if (prev.some((p) => p.id === newPallet.id)) return prev;
              return [...prev, newPallet];
            });
            toast.info(`Nuevo lote: ${newPallet.lote}`, {
              description: "Recibido en filtro",
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pallets",
        },
        (payload) => {
          const updated = payload.new as Pallet;
          if (updated.ubicado) {
            setPallets((prev) => prev.filter((p) => p.id !== updated.id));
            setUbicados((prev) => {
              if (prev.some((p) => p.id === updated.id)) return prev;
              return [updated, ...prev];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const marcarUbicado = useCallback(async (pallet: Pallet) => {
    setFadingOut((prev) => new Set(prev).add(pallet.id));

    // Animate out, then remove
    setTimeout(async () => {
      const { error } = await getSupabase()
        .from("pallets")
        .update({ ubicado: true })
        .eq("id", pallet.id);

      if (error) {
        toast.error("Error al marcar ubicado");
        setFadingOut((prev) => {
          const next = new Set(prev);
          next.delete(pallet.id);
          return next;
        });
      } else {
        setPallets((prev) => prev.filter((p) => p.id !== pallet.id));
        setUbicados((prev) => [{ ...pallet, ubicado: true }, ...prev]);
        setFadingOut((prev) => {
          const next = new Set(prev);
          next.delete(pallet.id);
          return next;
        });
        toast.success(`Lote ${pallet.lote} ubicado`);
      }
    }, 400);
  }, []);

  return (
    <main className="min-h-svh flex flex-col bg-slate-50">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 bg-white border-b border-slate-100">
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
          <h1 className="text-lg font-semibold text-slate-900">Modo WMS</h1>
          <p className="text-xs text-slate-400">
            Gestionar ubicaciones y dar salida
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-4 md:px-8 py-6 max-w-5xl mx-auto w-full">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6">
          <button
            onClick={() => setTab("espera")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === "espera"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            En Espera
            <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
              tab === "espera" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
            }`}>
              {pallets.length}
            </span>
          </button>
          <button
            onClick={() => setTab("ubicados")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === "ubicados"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Ubicados
            <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
              tab === "ubicados" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
            }`}>
              {ubicados.length}
            </span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg
              className="animate-spin h-8 w-8 text-emerald-500"
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
          </div>
        ) : tab === "espera" ? (
          pallets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <p className="text-lg font-medium text-slate-600">Sin pallets en espera</p>
              <p className="text-sm text-slate-400 mt-1">Los nuevos lotes aparecerán aquí en tiempo real</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Lote</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 hidden sm:table-cell">Tiempo en Filtro</th>
                    <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pallets.map((pallet) => (
                    <tr
                      key={pallet.id}
                      className={`group transition-colors hover:bg-slate-50 ${
                        fadingOut.has(pallet.id) ? "animate-fade-out" : "animate-fade-in"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900">{pallet.lote}</span>
                        <span className="block text-xs text-slate-400 sm:hidden mt-0.5">{formatTiempo(pallet.created_at)}</span>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                          {formatTiempo(pallet.created_at)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => marcarUbicado(pallet)}
                          disabled={fadingOut.has(pallet.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-100 active:scale-95 disabled:opacity-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                          Ubicado
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          ubicados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                  <rect width="18" height="18" x="3" y="3" rx="2" /><path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <p className="text-lg font-medium text-slate-600">Sin lotes ubicados</p>
              <p className="text-sm text-slate-400 mt-1">Los lotes marcados como ubicados aparecerán aquí</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Lote</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4 hidden sm:table-cell">Registrado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {ubicados.map((pallet) => (
                    <tr key={pallet.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900">{pallet.lote}</span>
                        <span className="block text-xs text-slate-400 sm:hidden mt-0.5">{formatTiempo(pallet.created_at)}</span>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M20 6 9 17l-5-5"/></svg>
                          {formatTiempo(pallet.created_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </main>
  );
}
