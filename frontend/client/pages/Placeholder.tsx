import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useLocation } from "react-router-dom";

export default function Placeholder() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const pageName = location.pathname.replace("/", "");
  const displayName = pageName.charAt(0).toUpperCase() + pageName.slice(1);

  return (
    <div className="flex h-screen bg-gq-bg overflow-hidden font-inter">
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-[68px] shrink-0 bg-gq-header border-b border-gq-border flex items-center px-[34px] gap-4">
          <button
            className="lg:hidden text-gq-text-muted hover:text-white transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <span className="text-[15px]">
            <span className="text-white">{displayName}</span>
          </span>
        </header>

        {/* Content */}
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-gq-card border border-gq-border flex items-center justify-center mx-auto mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#5DA2FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="#5DA2FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="#5DA2FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">{displayName}</h2>
            <p className="text-gq-text-muted text-[15px] leading-relaxed">
              This page is coming soon. Continue prompting to build out the {displayName} section.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
