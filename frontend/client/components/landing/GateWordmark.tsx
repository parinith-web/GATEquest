import React from "react";

/**
 * The GATEquest wordmark, matching the exact treatment already used in
 * Sidebar.tsx and Onboarding.tsx: mono type, "GATE" in warm off-white,
 * "quest" in brand blue, with the mark image beside it. Pulled out here
 * so the landing page and the app shell stay pixel-identical.
 */
export default function GateWordmark({
  showMark = true,
  className = "",
  textClassName = "text-[22px]",
  markClassName = "w-[30px] h-[30px]",
}: {
  showMark?: boolean;
  className?: string;
  textClassName?: string;
  markClassName?: string;
}) {
  return (
    <div className={"flex items-center gap-2.5 " + className}>
      {showMark && (
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/6aa5e7a18d0b6f4f3037b2ad52df5f4f698e5959?width=76"
          alt="GATEquest"
          className={"shrink-0 " + markClassName}
        />
      )}
      <span
        className={
          "font-mono font-semibold leading-none tracking-[1.1px] " + textClassName
        }
      >
        <span className="text-[#E5E1E4]">GATE</span>
        <span className="text-gq-blue">quest</span>
      </span>
    </div>
  );
}
