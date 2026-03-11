import Link from "next/link";

function BarcodeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-emerald-500"
    >
      <path d="M3 5v14" />
      <path d="M8 5v14" />
      <path d="M12 5v14" />
      <path d="M17 5v14" />
      <path d="M21 5v14" />
      <path d="M6 5v14" />
      <path d="M10 5v14" />
      <path d="M14 5v14" />
      <path d="M19 5v14" />
    </svg>
  );
}

function ClipboardCheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-emerald-500"
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-svh flex flex-col items-center justify-center px-6 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          Gestión de Filtro
        </h1>
        <p className="mt-2 text-lg text-slate-400 font-medium">Agrozzi</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        {/* Recepcionista */}
        <Link
          href="/recepcion"
          className="group relative flex flex-col items-center gap-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-200 hover:shadow-md hover:border-emerald-200 hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50 transition-colors group-hover:bg-emerald-100">
            <BarcodeIcon />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-slate-900">
              Modo Recepcionista
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
              Escanear tarjas y enviar a filtro
            </p>
          </div>
        </Link>

        {/* WMS */}
        <Link
          href="/wms"
          className="group relative flex flex-col items-center gap-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-200 hover:shadow-md hover:border-emerald-200 hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50 transition-colors group-hover:bg-emerald-100">
            <ClipboardCheckIcon />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-slate-900">Modo WMS</h2>
            <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
              Gestionar ubicaciones y dar salida
            </p>
          </div>
        </Link>
      </div>
    </main>
  );
}
