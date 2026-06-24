import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const disciplines = [
  "Aerospace",
  "Agricultural",
  "Architecture",
  "Biomedical",
  "Biotechnology",
  "Chemical",
  "Chemistry",
  "Data Science & AI",
  "Engineering Sciences",
  "Environmental",
  "Geomatics",
  "Geology & Geophysics",
  "Humanities & Social Sciences",
  "Instrumentation",
  "Life Sciences",
  "Mathematics",
  "Metallurgical",
  "Mining",
  "Naval Architecture",
  "Petroleum",
  "Physics",
  "Production & Industrial",
  "Statistics",
  "Textile",
  "Ecology & Evolution",
];

export default function OnboardingMore() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const toggle = (d: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  const hasSelected = selected.size > 0;

  const handleInitialize = () => {
    if (hasSelected) {
      navigate("/");
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col font-sans"
      style={{
        background:
          "radial-gradient(116.55% 97.34% at 50% 0%, #2A2A2C 0%, #131315 60%), #131315",
      }}
    >
      {/* Header */}
      <header className="relative flex items-center justify-center h-[89px] border-b border-[#201F22] px-6 shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-6 sm:left-12 w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors"
          aria-label="Go back"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3.825 9L9.425 14.6L8 16L0 8L8 0L9.425 1.4L3.825 7H16V9H3.825Z"
              fill="#C2C6D6"
            />
          </svg>
        </button>

        <div className="flex items-center gap-5">
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/2d820a83d1d61eb1b70ca251f31eb0a04662f9ff?width=60"
            alt="GATEquest Logo"
            className="w-[30px] h-[30px]"
          />
          <span className="font-jetbrains text-[17.5px] font-semibold leading-[26.25px] tracking-[0.05em]">
            <span className="text-[#E5E1E4]">GATE</span>
            <span className="text-[#ADC6FF]">quest</span>
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center px-6 sm:px-10 pt-14 sm:pt-16 lg:pt-[64px] pb-8">
        {/* Titles */}
        <div className="flex flex-col items-center gap-4 mb-12 sm:mb-14 lg:mb-16 text-center max-w-[600px] w-full">
          <h1 className="text-[#E5E1E4] text-3xl sm:text-4xl lg:text-[48px] font-normal leading-tight lg:leading-[60px] tracking-[-0.025em]">
            Explore other Disciplines
          </h1>
          <p className="text-[#C2C6D6] text-base leading-6 font-normal px-2">
            Select your primary engineering discipline to configure your terminal
            workspace and initialize curriculum data.
          </p>
        </div>

        {/* Disciplines Grid */}
        <div className="w-full max-w-[1152px] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {disciplines.map((d) => (
            <button
              key={d}
              onClick={() => toggle(d)}
              className={cn(
                "py-3 px-4 rounded-lg border text-sm font-normal leading-5 text-center transition-all duration-150",
                selected.has(d)
                  ? "border-blue-500/50 bg-blue-500/10 text-white"
                  : "border-white/15 bg-white/[0.03] text-[#D1D5DB] hover:border-white/30 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="flex justify-center items-center py-6 px-6 shrink-0">
        <button
          onClick={handleInitialize}
          className={cn(
            "flex items-center gap-4 px-16 py-6 rounded text-white text-[13px] font-bold tracking-[0.2em] uppercase transition-opacity duration-200 shadow-lg",
            hasSelected
              ? "bg-blue-500 opacity-100 cursor-pointer hover:bg-blue-600"
              : "bg-blue-500 opacity-50 cursor-not-allowed"
          )}
          disabled={!hasSelected}
        >
          INITIALIZE QUEST
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10.1458 7.5H0V5.83333H10.1458L5.47917 1.16667L6.66667 0L13.3333 6.66667L6.66667 13.3333L5.47917 12.1667L10.1458 7.5Z"
              fill="white"
            />
          </svg>
        </button>
      </footer>
    </div>
  );
}
