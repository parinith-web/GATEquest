import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
  breadcrumb?: string;
}

// ── Nav items ────────────────────────────────────────────────────────────────

const navItems = [
  {
    href: "/",
    label: "Overview",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 6V0H18V6H10ZM0 10V0H8V10H0ZM10 18V8H18V18H10ZM0 18V12H8V18H0ZM2 8H6V2H2V8ZM12 16H16V10H12V16ZM12 4H16V2H12V4ZM2 16H6V14H2V16Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/roadmaps",
    label: "Roadmaps",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M12 18L6 15.9L1.35 17.7C1.01667 17.8333 0.708333 17.7958 0.425 17.5875C0.141667 17.3792 0 17.1 0 16.75V2.75C0 2.53333 0.0625 2.34167 0.1875 2.175C0.3125 2.00833 0.483333 1.88333 0.7 1.8L6 0L12 2.1L16.65 0.3C16.9833 0.166667 17.2917 0.204167 17.575 0.4125C17.8583 0.620833 18 0.9 18 1.25V15.25C18 15.4667 17.9375 15.6583 17.8125 15.825C17.6875 15.9917 17.5167 16.1167 17.3 16.2L12 18ZM11 15.55V3.85L7 2.45V14.15L11 15.55ZM13 15.55L16 14.55V2.7L13 3.85V15.55ZM2 15.3L5 14.15V2.45L2 3.45V15.3Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/quests",
    label: "Quests",
    icon: (
      <svg width="10" height="20" viewBox="0 0 10 20" fill="none">
        <path d="M0 0H10V7.85C10 8.23333 9.91667 8.575 9.75 8.875C9.58333 9.175 9.35 9.41667 9.05 9.6L5.5 11.7L6.2 14H10L6.9 16.2L8.1 20L5 17.65L1.9 20L3.1 16.2L0 14H3.8L4.5 11.7L0.95 9.6C0.65 9.41667 0.416667 9.175 0.25 8.875C0.0833333 8.575 0 8.23333 0 7.85V0ZM2 2V7.85L4 9.05V2H2ZM8 2H6V9.05L8 7.85V2Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/problems",
    label: "Problems",
    icon: (
      <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
        <path d="M6 12L0 6L6 0L7.425 1.425L2.825 6.025L7.4 10.6L6 12ZM14 12L12.575 10.575L17.175 5.975L12.6 1.4L14 0L20 6L14 12Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/pulse",
    label: "Pulse",
    icon: (
      <svg width="22" height="17" viewBox="0 0 22 17" fill="none">
        <path d="M2 17C1.45 17 0.979167 16.8042 0.5875 16.4125C0.195833 16.0208 0 15.55 0 15C0 14.45 0.195833 13.9792 0.5875 13.5875C0.979167 13.1958 1.45 13 2 13C2.1 13 2.1875 13 2.2625 13C2.3375 13 2.41667 13.0167 2.5 13.05L7.05 8.5C7.01667 8.41667 7 8.3375 7 8.2625C7 8.1875 7 8.1 7 8C7 7.45 7.19583 6.97917 7.5875 6.5875C7.97917 6.19583 8.45 6 9 6C9.55 6 10.0208 6.19583 10.4125 6.5875C10.8042 6.97917 11 7.45 11 8C11 8.03333 10.9833 8.2 10.95 8.5L13.5 11.05C13.5833 11.0167 13.6625 11 13.7375 11C13.8125 11 13.9 11 14 11C14.1 11 14.1875 11 14.2625 11C14.3375 11 14.4167 11.0167 14.5 11.05L18.05 7.5C18.0167 7.41667 18 7.3375 18 7.2625C18 7.1875 18 7.1 18 7C18 6.45 18.1958 5.97917 18.5875 5.5875C18.9792 5.19583 19.45 5 20 5C20.55 5 21.0208 5.19583 21.4125 5.5875C21.8042 5.97917 22 6.45 22 7C22 7.55 21.8042 8.02083 21.4125 8.4125C21.0208 8.80417 20.55 9 20 9C19.9 9 19.8125 9 19.7375 9C19.6625 9 19.5833 8.98333 19.5 8.95L15.95 12.5C15.9833 12.5833 16 12.6625 16 12.7375C16 12.8125 16 12.9 16 13C16 13.55 15.8042 14.0208 15.4125 14.4125C15.0208 14.8042 14.55 15 14 15C13.45 15 12.9792 14.8042 12.5875 14.4125C12.1958 14.0208 12 13.55 12 13C12 12.9 12 12.8125 12 12.7375C12 12.6625 12.0167 12.5833 12.05 12.5L9.5 9.95C9.41667 9.98333 9.3375 10 9.2625 10C9.1875 10 9.1 10 9 10C8.96667 10 8.8 9.98333 8.5 9.95L3.95 14.5C3.98333 14.5833 4 14.6625 4 14.7375C4 14.8125 4 14.9 4 15C4 15.55 3.80417 16.0208 3.4125 16.4125C3.02083 16.8042 2.55 17 2 17ZM3 6.975L2.375 5.625L1.025 5L2.375 4.375L3 3.025L3.625 4.375L4.975 5L3.625 5.625L3 6.975ZM14 6L13.05 3.95L11 3L13.05 2.05L14 0L14.95 2.05L17 3L14.95 3.95L14 6Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 8C6.9 8 5.95833 7.60833 5.175 6.825C4.39167 6.04167 4 5.1 4 4C4 2.9 4.39167 1.95833 5.175 1.175C5.95833 0.391667 6.9 0 8 0C9.1 0 10.0417 0.391667 10.825 1.175C11.6083 1.95833 12 2.9 12 4C12 5.1 11.6083 6.04167 10.825 6.825C10.0417 7.60833 9.1 8 8 8ZM0 16V13.2C0 12.6333 0.145833 12.1125 0.4375 11.6375C0.729167 11.1625 1.11667 10.8 1.6 10.55C2.63333 10.0333 3.68333 9.64583 4.75 9.3875C5.81667 9.12917 6.9 9 8 9C9.1 9 10.1833 9.12917 11.25 9.3875C12.3167 9.64583 13.3667 10.0333 14.4 10.55C14.8833 10.8 15.2708 11.1625 15.5625 11.6375C15.8542 12.1125 16 12.6333 16 13.2V16H0ZM2 14H14V13.2C14 13.0167 13.9542 12.85 13.8625 12.7C13.7708 12.55 13.65 12.4333 13.5 12.35C12.6 11.9 11.6917 11.5625 10.775 11.3375C9.85833 11.1125 8.93333 11 8 11C7.06667 11 6.14167 11.1125 5.225 11.3375C4.30833 11.5625 3.4 11.9 2.5 12.35C2.35 12.4333 2.22917 12.55 2.1375 12.7C2.04583 12.85 2 13.0167 2 13.2V14ZM8 6C8.55 6 9.02083 5.80417 9.4125 5.4125C9.80417 5.02083 10 4.55 10 4C10 3.45 9.80417 2.97917 9.4125 2.5875C9.02083 2.19583 8.55 2 8 2C7.45 2 6.97917 2.19583 6.5875 2.5875C6.19583 2.97917 6 3.45 6 4C6 4.55 6.19583 5.02083 6.5875 5.4125C6.97917 5.80417 7.45 6 8 6Z" fill="currentColor" />
      </svg>
    ),
  },
];

const bottomItems = [
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M7.3 20L6.9 16.8C6.68333 16.7167 6.47917 16.6167 6.2875 16.5C6.09583 16.3833 5.90833 16.2583 5.725 16.125L2.75 17.375L0 12.625L2.575 10.675C2.55833 10.5583 2.55 10.4458 2.55 10.3375C2.55 10.2292 2.55 10.1167 2.55 10C2.55 9.88333 2.55 9.77083 2.55 9.6625C2.55 9.55417 2.55833 9.44167 2.575 9.325L0 7.375L2.75 2.625L5.725 3.875C5.90833 3.74167 6.1 3.61667 6.3 3.5C6.5 3.38333 6.7 3.28333 6.9 3.2L7.3 0H12.8L13.2 3.2C13.4167 3.28333 13.6208 3.38333 13.8125 3.5C14.0042 3.61667 14.1917 3.74167 14.375 3.875L17.35 2.625L20.1 7.375L17.525 9.325C17.5417 9.44167 17.55 9.55417 17.55 9.6625C17.55 9.77083 17.55 9.88333 17.55 10C17.55 10.1167 17.55 10.2292 17.55 10.3375C17.55 10.4458 17.5333 10.5583 17.5 10.675L20.075 12.625L17.325 17.375L14.375 16.125C14.1917 16.2583 14 16.3833 13.8 16.5C13.6 16.6167 13.4 16.7167 13.2 16.8L12.8 20H7.3Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/support",
    label: "Support",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M9.95 16C10.3 16 10.5958 15.8792 10.8375 15.6375C11.0792 15.3958 11.2 15.1 11.2 14.75C11.2 14.4 11.0792 14.1042 10.8375 13.8625C10.5958 13.6208 10.3 13.5 9.95 13.5C9.6 13.5 9.30417 13.6208 9.0625 13.8625C8.82083 14.1042 8.7 14.4 8.7 14.75C8.7 15.1 8.82083 15.3958 9.0625 15.6375C9.30417 15.8792 9.6 16 9.95 16ZM9.05 12.15H10.9C10.9 11.6 10.9625 11.1667 11.0875 10.85C11.2125 10.5333 11.5667 10.1 12.15 9.55C12.5833 9.11667 12.925 8.70417 13.175 8.3125C13.425 7.92083 13.55 7.45 13.55 6.9C13.55 5.96667 13.2083 5.25 12.525 4.75C11.8417 4.25 11.0333 4 10.1 4C9.15 4 8.37917 4.25 7.7875 4.75C7.19583 5.25 6.78333 5.85 6.55 6.55L8.2 7.2C8.28333 6.9 8.47083 6.575 8.7625 6.225C9.05417 5.875 9.5 5.7 10.1 5.7C10.6333 5.7 11.0333 5.84583 11.3 6.1375C11.5667 6.42917 11.7 6.75 11.7 7.1C11.7 7.43333 11.6 7.74583 11.4 8.0375C11.2 8.32917 10.95 8.6 10.65 8.85C9.91667 9.5 9.46667 9.99167 9.3 10.325C9.13333 10.6583 9.05 11.2667 9.05 12.15ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20Z" fill="currentColor" />
      </svg>
    ),
  },
];

// ── Sidebar component ─────────────────────────────────────────────────────────

function AppSidebar({
  mobileOpen,
  onClose,
  collapsed,
}: {
  mobileOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
}) {
  const location = useLocation();

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed top-[65px] left-0 right-0 bottom-0 bg-black/60 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed top-[65px] bottom-0 lg:static lg:inset-y-0 left-0 z-40 flex flex-col group/sidebar",
          "shrink-0 bg-gq-sidebar",
          "transition-[transform,width,border-width] duration-300 ease-in-out",
          collapsed
            ? "lg:w-0 lg:border-r-0 lg:overflow-hidden"
            : "lg:w-[242px] lg:border-r lg:border-gq-border",
          "w-[242px] border-r border-gq-border",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* Mobile close (X) — only shown on mobile, floating over the top of the sidebar */}
        <div className="h-[57px] flex items-center justify-end border-b border-gq-border shrink-0 px-4 lg:hidden">
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gq-text-muted hover:text-white hover:bg-gq-card transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Main nav */}
        <nav className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={[
                  "flex items-center gap-3 px-3 py-[10px] rounded-[8px] transition-colors text-[14px] font-medium whitespace-nowrap",
                  isActive
                    ? "bg-gq-active text-white"
                    : "text-gq-text-muted hover:text-white hover:bg-gq-card",
                ].join(" ")}
              >
                <span className={isActive ? "text-white shrink-0" : "text-gq-text-muted shrink-0"}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom nav */}
        <div className="border-t border-gq-border px-3 py-4 flex flex-col gap-1 shrink-0">
          {bottomItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={[
                  "flex items-center gap-3 px-3 py-[10px] rounded-[8px] transition-colors text-[14px] font-medium whitespace-nowrap",
                  isActive
                    ? "bg-gq-active text-white"
                    : "text-gq-text-muted hover:text-white hover:bg-gq-card",
                ].join(" ")}
              >
                <span className={isActive ? "text-white shrink-0" : "text-gq-text-muted shrink-0"}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}

// ── Layout wrapper ────────────────────────────────────────────────────────────

export function Layout({ children, breadcrumb }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("gq-sidebar-collapsed") === "true";
  });
  const location = useLocation();

  const toggleCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("gq-sidebar-collapsed", String(next));
      return next;
    });
  };

  const pageName =
    breadcrumb ??
    navItems
      .concat(bottomItems)
      .find((item) => item.href === location.pathname)?.label ??
    "Page";

  return (
    <div className="flex flex-col h-screen bg-gq-bg overflow-hidden font-inter">
      {/* Top header — full width, independent of the sidebar */}
      <header className="h-[65px] shrink-0 bg-gq-header border-b border-gq-border flex items-center px-4 lg:px-6 justify-between gap-4 z-20">
        <div className="flex items-center gap-4 min-w-0">
          {/* Mobile hamburger */}
          <button
            className="lg:hidden text-gq-text-muted hover:text-white transition-colors shrink-0"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* Brand — logo + name */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/2d820a83d1d61eb1b70ca251f31eb0a04662f9ff?width=60"
              alt="GATEquest"
              className="w-7 h-7 shrink-0"
            />
            <span className="font-jetbrains font-semibold text-[17px] tracking-[0.05em] whitespace-nowrap hidden sm:inline">
              <span className="text-[#E5E1E4]">GATE</span>
              <span className="text-gq-blue-accent">quest</span>
            </span>
          </Link>

          {/* Breadcrumb */}
          <div className="hidden md:flex items-center gap-2 text-[14px] pl-4 ml-1 border-l border-gq-border min-w-0">
            <span className="text-gq-text-muted whitespace-nowrap">Dashboards /</span>
            <span className="text-white font-medium truncate">{pageName}</span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden sm:flex relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <svg width="14" height="14" viewBox="0 0 15 20" fill="none">
                <path d="M12.45 13.5L7.725 8.775C7.35 9.075 6.91875 9.3125 6.43125 9.4875C5.94375 9.6625 5.425 9.75 4.875 9.75C3.5125 9.75 2.35938 9.27813 1.41562 8.33438C0.471875 7.39063 0 6.2375 0 4.875C0 3.5125 0.471875 2.35938 1.41562 1.41562C2.35938 0.471875 3.5125 0 4.875 0C6.2375 0 7.39063 0.471875 8.33438 1.41562C9.27813 2.35938 9.75 3.5125 9.75 4.875C9.75 5.425 9.6625 5.94375 9.4875 6.43125C9.3125 6.91875 9.075 7.35 8.775 7.725L13.5 12.45L12.45 13.5Z" fill="#6B7280" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="w-[200px] bg-[#1C1B1B] border border-[#424754] rounded-full pl-9 pr-4 py-[7px] text-sm text-gq-text-muted placeholder-gq-text-muted outline-none focus:border-gq-blue/50 transition-colors"
            />
          </div>

          {/* Bell */}
          <div className="relative cursor-pointer">
            <svg width="17" height="22" viewBox="0 0 17 22" fill="none">
              <path d="M0 17V15H2V8C2 6.61667 2.41667 5.3875 3.25 4.3125C4.08333 3.2375 5.16667 2.53333 6.5 2.2V1.5C6.5 1.08333 6.64583 0.729167 6.9375 0.4375C7.22917 0.145833 7.58333 0 8 0C8.41667 0 8.77083 0.145833 9.0625 0.4375C9.35417 0.729167 9.5 1.08333 9.5 1.5V2.2C10.8333 2.53333 11.9167 3.2375 12.75 4.3125C13.5833 5.3875 14 6.61667 14 8V15H16V17H0ZM8 20C7.45 20 6.97917 19.8042 6.5875 19.4125C6.19583 19.0208 6 18.55 6 18H10C10 18.55 9.80417 19.0208 9.4125 19.4125C9.02083 19.8042 8.55 20 8 20ZM4 15H12V8C12 6.9 11.6083 5.95833 10.825 5.175C10.0417 4.39167 9.1 4 8 4C6.9 4 5.95833 4.39167 5.175 5.175C4.39167 5.95833 4 6.9 4 8V15Z" fill="#8C909F" />
            </svg>
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-gq-green rounded-full" />
          </div>

          {/* Avatar */}
          <div className="w-[34px] h-[34px] rounded-xl border border-black bg-[#0E0E0E] overflow-hidden shrink-0">
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/42ef722eebd41d59b9df3e9410401cb989623cbf?width=82"
              alt="User avatar"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </header>

      {/* Body — sidebar + page content, below the header */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <AppSidebar
          mobileOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
        />

        {/* Sidebar collapse/expand toggle — floats in the content area's left
            side (not the header), in the empty gutter next to the sidebar
            edge. Slides with the sidebar as it collapses/expands. */}
        <button
          className="hidden lg:flex fixed z-20 items-center justify-center w-8 h-8 rounded-lg text-gq-text-muted hover:text-white hover:bg-gq-card transition-[left,background-color,color] duration-300 ease-in-out"
          style={{ top: 65 + 16, left: sidebarCollapsed ? 16 : 242 + 16 }}
          onClick={toggleCollapsed}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1.5" y="2.5" width="15" height="13" rx="2" stroke="currentColor" strokeWidth="1.4" />
            <line x1="6.75" y1="2.5" x2="6.75" y2="15.5" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gq-bg min-w-0 lg:pl-14">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
