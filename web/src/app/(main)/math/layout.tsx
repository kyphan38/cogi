import type { ReactNode } from "react";
import Link from "next/link";

export default function MathModuleLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      {/* Module Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/math"
              className="text-base font-bold tracking-tight text-slate-100 flex items-center space-x-2 hover:text-emerald-400 transition-colors"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-500/20 text-emerald-400 font-extrabold text-xs border border-emerald-500/30">
                ∑
              </span>
              <span>Math & Scenario Thinking</span>
            </Link>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              Applied Reasoning
            </span>
          </div>

          <div className="flex items-center space-x-4 text-xs font-medium text-slate-400">
            <Link href="/math" className="hover:text-slate-200 transition-colors">
              Scenarios Catalog
            </Link>
            <Link href="/dashboard" className="hover:text-slate-200 transition-colors">
              Back to Main Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
