import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { setBranch as apiSetBranch } from "@/lib/auth";
import { BRANCH_SUBJECT, type WiredBranch } from "@/lib/gate-api";

type Branch = {
  id: string;
  label: string;
  code: string;
  icon: React.ReactNode;
  dashed?: boolean;
};

const branches: Branch[] = [
  {
    id: "cse",
    label: "Computer Science",
    code: "CSE",
    icon: (
      <svg width="36" height="28" viewBox="0 0 36 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3.23077 28C2.31026 28 1.54167 27.6917 0.925002 27.075C0.308334 26.4584 0 25.6898 0 24.7693V3.23077C0 2.31026 0.308334 1.54167 0.925002 0.925C1.54167 0.308333 2.31026 0 3.23077 0H32.7692C33.6898 0 34.4584 0.308333 35.075 0.925C35.6917 1.54167 36 2.31026 36 3.23077V24.7693C36 25.6898 35.6917 26.4584 35.075 27.075C34.4584 27.6917 33.6898 28 32.7692 28H3.23077ZM3.23077 26H32.7692C33.0769 26 33.359 25.8718 33.6154 25.6154C33.8718 25.359 34 25.0769 34 24.7693V6.00001H2.00001V24.7693C2.00001 25.0769 2.12822 25.359 2.38463 25.6154C2.64103 25.8718 2.92308 26 3.23077 26ZM9.00001 22.5769L7.62308 21.2L12.7731 16L7.57308 10.8L9.00001 9.42308L15.5769 16L9.00001 22.5769ZM19 23V21H29V23H19Z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: "da",
    label: "Data Science & AI",
    code: "DA",
    icon: (
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 0L18.5 8.5L27 12L18.5 15.5L15 24L11.5 15.5L3 12L11.5 8.5L15 0Z" fill="currentColor"/>
        <circle cx="24" cy="24" r="4.5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: "ece",
    label: "Electronics",
    code: "ECE",
    icon: (
      <svg width="31" height="31" viewBox="0 0 31 31" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11.0769 19.077V11.0769H19.077V19.077H11.0769ZM13.0769 17.0769H17.0769V13.0769H13.0769V17.0769ZM10.0769 30.1539V27.077H6.3077C5.38719 27.077 4.6186 26.7686 4.00193 26.152C3.38526 25.5353 3.07693 24.7667 3.07693 23.8462V20.0769H0V18.0769H3.07693V12.0769H0V10.0769H3.07693V6.3077C3.07693 5.38719 3.38526 4.6186 4.00193 4.00193C4.6186 3.38526 5.38719 3.07693 6.3077 3.07693H10.0769V0H12.0769V3.07693H18.0769V0H20.0769V3.07693H23.8462C24.7667 3.07693 25.5353 3.38526 26.152 4.00193C26.7686 4.6186 27.077 5.38719 27.077 6.3077V10.0769H30.1539V12.0769H27.077V18.0769H30.1539V20.0769H27.077V23.8462C27.077 24.7667 26.7686 25.5353 26.152 26.152C25.5353 26.7686 24.7667 27.077 23.8462 27.077H20.0769V30.1539H18.0769V27.077H12.0769V30.1539H10.0769ZM23.8462 25.0769C24.1539 25.0769 24.4359 24.9487 24.6923 24.6923C24.9487 24.4359 25.0769 24.1539 25.0769 23.8462V6.3077C25.0769 6.00001 24.9487 5.71796 24.6923 5.46155C24.4359 5.20515 24.1539 5.07694 23.8462 5.07694H6.3077C6.00001 5.07694 5.71796 5.20515 5.46155 5.46155C5.20515 5.71796 5.07694 6.00001 5.07694 6.3077V23.8462C5.07694 24.1539 5.20515 24.4359 5.46155 24.6923C5.71796 24.9487 6.00001 25.0769 6.3077 25.0769H23.8462Z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: "ee",
    label: "Electrical",
    code: "EE",
    icon: (
      <svg width="32" height="37" viewBox="0 0 32 37" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7.34616 36.0769L15.4231 22.0385L0 20.2308L22.5 0H24.7308L16.4616 14.0769L32 15.8462L9.50002 36.0769H7.34616ZM13.0231 30.0731L27.3808 17.3346L13.2385 15.75L19.0423 5.9385L4.61926 18.7154L18.7116 20.4039L13.0231 30.0731Z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: "me",
    label: "Mechanical",
    code: "ME",
    icon: (
      <svg width="33" height="33" viewBox="0 0 33 33" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 32.3042V29.0735H8.04615L2.86923 12.1427C1.99487 11.7196 1.29808 11.1145 0.778847 10.3273C0.259616 9.54011 0 8.63499 0 7.61191C0 6.22729 0.48718 5.0478 1.46154 4.07344C2.4359 3.09908 3.61539 2.6119 5.00001 2.6119C6.22308 2.6119 7.27244 2.9869 8.14808 3.7369C9.02373 4.4869 9.61027 5.44524 9.9077 6.6119H17.2308V3.61191C17.2308 3.32729 17.3263 3.08947 17.5173 2.89844C17.7083 2.70742 17.9462 2.6119 18.2308 2.6119C18.4539 2.6119 18.6494 2.67857 18.8173 2.8119C18.9853 2.94524 19.0923 3.11959 19.1385 3.33498V3.87344L22.7692 0.519593C23.0436 0.245233 23.3507 0.0792076 23.6904 0.0215152C24.0301 -0.0361773 24.3616 0.022156 24.6846 0.196515L32.2539 3.71959C32.5 3.84267 32.6853 4.01895 32.8096 4.24844C32.934 4.47793 32.9385 4.7119 32.8231 4.95037C32.7 5.19652 32.5237 5.35229 32.2942 5.41768C32.0648 5.48306 31.8308 5.45806 31.5923 5.34268L24.0077 1.81191L19.2308 6.21191V9.01191L24.0077 13.3119L31.5923 9.78114C31.8308 9.66576 32.0667 9.64268 32.3 9.71191C32.5333 9.78114 32.7077 9.93499 32.8231 10.1734C32.9462 10.4196 32.9436 10.6555 32.8154 10.8811C32.6872 11.1068 32.5 11.2811 32.2539 11.4042L24.6846 14.9504C24.3616 15.1247 24.0301 15.1767 23.6904 15.1061C23.3507 15.0356 23.0436 14.876 22.7692 14.6273L19.1385 11.3504V11.8888C19.0923 12.0888 18.9853 12.2593 18.8173 12.4004C18.6494 12.5414 18.4539 12.6119 18.2308 12.6119C17.9462 12.6119 17.7083 12.5164 17.5173 12.3254C17.3263 12.1343 17.2308 11.8965 17.2308 11.6119V8.61191H9.9077C9.8077 9.05807 9.64168 9.50037 9.40963 9.93883C9.17758 10.3773 8.92309 10.7427 8.64617 11.035L18.3385 29.0735H26V32.3042H2ZM5.00001 10.6119C5.82308 10.6119 6.52885 10.3177 7.11731 9.72921C7.70577 9.14075 8 8.43498 8 7.61191C8 6.78883 7.70577 6.08307 7.11731 5.4946C6.52885 4.90614 5.82308 4.61191 5.00001 4.61191C4.17693 4.61191 3.47116 4.90614 2.8827 5.4946C2.29424 6.08307 2.00001 6.78883 2.00001 7.61191C2.00001 8.43498 2.29424 9.14075 2.8827 9.72921C3.47116 10.3177 4.17693 10.6119 5.00001 10.6119ZM10.1462 29.0735H16.0462L6.98462 12.2273C6.77949 12.3555 6.48975 12.4645 6.11539 12.5542C5.74104 12.644 5.40001 12.6632 5.09232 12.6119L10.1462 29.0735Z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: "other",
    label: "Other Branches",
    code: "Explore",
    dashed: true,
    icon: (
      <svg width="33" height="33" viewBox="0 0 33 33" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M31.3539 32.7692L18.8308 20.2462C17.8308 21.0975 16.6808 21.7564 15.3808 22.2231C14.0808 22.6898 12.7744 22.9231 11.4615 22.9231C8.26411 22.9231 5.55449 21.8122 3.3327 19.5904C1.1109 17.3686 0 14.659 0 11.4615C0 8.26411 1.1109 5.55449 3.3327 3.3327C5.55449 1.1109 8.26411 0 11.4615 0C14.659 0 17.3686 1.1109 19.5904 3.3327C21.8122 5.55449 22.9231 8.26411 22.9231 11.4615C22.9231 12.8513 22.6769 14.1962 22.1846 15.4962C21.6923 16.7962 21.0462 17.9077 20.2462 18.8308L32.7692 31.3539L31.3539 32.7692ZM11.4615 20.9231C14.1154 20.9231 16.3558 20.0096 18.1827 18.1827C20.0096 16.3558 20.9231 14.1154 20.9231 11.4615C20.9231 8.8077 20.0096 6.56732 18.1827 4.7404C16.3558 2.91347 14.1154 2.00001 11.4615 2.00001C8.8077 2.00001 6.56732 2.91347 4.7404 4.7404C2.91347 6.56732 2.00001 8.8077 2.00001 11.4615C2.00001 14.1154 2.91347 16.3558 4.7404 18.1827C6.56732 20.0096 8.8077 20.9231 11.4615 20.9231Z" fill="currentColor"/>
      </svg>
    ),
  },
];

export default function Onboarding() {
  const [selected, setSelected] = useState<string>("cse");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, loading, refresh } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, user, navigate]);

  const handleInitialize = async () => {
    const branch = branches.find((b) => b.id === selected);
    if (!branch) return;

    // Wired branches (cse/da) persist the exact subject name the
    // question bank / quest system uses; everything else persists its
    // display label — not wired to real curriculum data yet, but still
    // a stable, human-readable value on the account.
    const value =
      selected in BRANCH_SUBJECT ? BRANCH_SUBJECT[selected as WiredBranch] : branch.label;

    setBusy(true);
    setError(null);
    try {
      await apiSetBranch(value);
      await refresh();
      navigate("/onboarding/username");
    } catch (err: any) {
      setError(err?.message || "Couldn't save your branch. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const hasBranch = !!user?.branch;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "radial-gradient(116.55% 97.34% at 50% 0%, #2A2A2C 0%, #131315 60%), #FFF" }}>
      {/* Header */}
      <header className="flex items-center justify-center relative border-b border-[#201F22] h-16 md:h-20 flex-shrink-0 px-6">
        {hasBranch && (
          <button onClick={() => navigate(-1)} className="absolute left-8 md:left-12 flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/5 transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3.825 9L9.425 14.6L8 16L0 8L8 0L9.425 1.4L3.825 7H16V9H3.825Z" fill="#C2C6D6"/>
            </svg>
          </button>
        )}
        <div className="flex items-center gap-5">
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/2d820a83d1d61eb1b70ca251f31eb0a04662f9ff?width=60"
            alt="GATEquest Logo"
            className="w-[30px] h-[30px]"
          />
          <div className="font-['JetBrains_Mono'] font-semibold text-[18px] leading-[1.5] tracking-[0.875px]">
            <span className="text-[#E5E1E4]">GATE</span>
            <span className="text-[#ADC6FF]">quest</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 flex flex-col items-center px-6 pt-4 pb-4 overflow-y-auto">
        {/* Titles */}
        <div className="flex flex-col items-center gap-3 mb-6 md:mb-8">
          <h1
            className="text-[#E5E1E4] text-center font-sans font-normal text-4xl md:text-5xl leading-[1.25] tracking-[-1.2px]"
          >
            Choose Your Path.
          </h1>
          <p className="text-[#C2C6D6] text-center font-sans font-normal text-base leading-6 max-w-[600px]">
            Select your primary engineering discipline to configure your terminal workspace
            and initialize curriculum data.
          </p>
        </div>

        {/* Branch Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-[1024px]">
          {branches.map((branch) => {
            const isSelected = selected === branch.id;
            return (
              <button
                key={branch.id}
                onClick={() => {
                  if (branch.id === "other") {
                    navigate("/onboarding/more");
                  } else {
                    setSelected(branch.id);
                  }
                }}
                className={[
                  "relative flex flex-col items-center justify-center gap-6 rounded-lg overflow-hidden",
                  "min-h-[220px] md:min-h-[262px] p-12 md:p-16",
                  "transition-all duration-200 cursor-pointer",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ADC6FF]",
                  isSelected
                    ? "border border-[#ADC6FF] bg-[rgba(173,198,255,0.05)]"
                    : branch.dashed
                    ? "border border-dashed border-[#424754] bg-[#201F22] hover:border-[#5a607a] hover:bg-[#252427]"
                    : "border border-[#424754] bg-[#201F22] hover:border-[#5a607a] hover:bg-[#252427]",
                ].join(" ")}
                style={
                  isSelected
                    ? {
                        boxShadow: "0 0 0 1px #ADC6FF, 0 0 15px 0 rgba(173, 198, 255, 0.10)",
                      }
                    : {}
                }
              >
                {/* Decorative accent at bottom for unselected cards */}
                {!isSelected && (
                  <span
                    className="pointer-events-none absolute -bottom-32 -right-8 w-full h-64 rounded-full blur-2xl opacity-[0.08]"
                    style={{ background: "#ADC6FF" }}
                  />
                )}

                {/* Icon */}
                <span
                  className={isSelected ? "text-[#ADC6FF]" : "text-[#C2C6D6]"}
                >
                  {branch.icon}
                </span>

                {/* Label + Badge */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[#E5E1E4] font-sans font-normal text-xl leading-[30px] text-center">
                    {branch.label}
                  </span>
                  <span
                    className={[
                      "font-['JetBrains_Mono'] font-normal text-xs leading-[18px] text-center px-4 py-1 rounded-[2px]",
                      isSelected
                        ? "text-[#ADC6FF] bg-[rgba(173,198,255,0.20)]"
                        : "text-[#8C909F] bg-[#353437]",
                    ].join(" ")}
                  >
                    {branch.code}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* Footer Action Area */}
      <footer className="flex flex-col items-center gap-2 px-6 py-3 md:py-4 flex-shrink-0">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
        <button
          onClick={handleInitialize}
          disabled={busy}
          className="relative flex items-center gap-4 rounded-[4px] px-10 md:px-16 py-4 md:py-5 overflow-hidden transition-opacity hover:opacity-90 active:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ADC6FF] disabled:opacity-60"
          style={{
            background: "linear-gradient(90deg, #3B82F6 0%, #60A5FA 100%)",
            boxShadow: "0 0 15px 0 rgba(173, 198, 255, 0.20)",
          }}
        >
          <span
            className="absolute inset-0 rounded-[4px]"
            style={{ background: "rgba(255,255,255,0.10)" }}
          />
          <span className="relative font-sans font-bold text-[13px] leading-[19.5px] tracking-[2.6px] uppercase text-white">
            {busy ? "SAVING…" : "INITIALIZE QUEST"}
          </span>
          <svg className="relative" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.1458 7.5H0V5.83333H10.1458L5.47917 1.16667L6.66667 0L13.3333 6.66667L6.66667 13.3333L5.47917 12.1667L10.1458 7.5Z" fill="white"/>
          </svg>
        </button>
      </footer>
    </div>
  );
}
