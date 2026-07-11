import { BRANCH_LABEL_ANY } from "@/lib/gate-api";

function ClockIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7V12L15.5 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ComingSoon({
  branch,
  title = "Coming Soon",
  description,
}: {
  branch?: string | null;
  title?: string;
  description?: string;
}) {
  const branchLabel = branch ? BRANCH_LABEL_ANY(branch) : null;

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-lg border border-gq-border bg-gq-card px-10 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(173,198,255,0.10)] text-gq-blue">
          <ClockIcon />
        </span>
        <div className="flex flex-col items-center gap-1">
          <h2 className="text-gq-text text-xl font-medium">{title}</h2>
          {branchLabel && (
            <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-[1px] text-gq-muted">
              {branchLabel}
            </span>
          )}
        </div>
        <p className="max-w-sm text-sm leading-6 text-gq-muted">
          {description ??
            "We're still building out this branch's curriculum. Check back soon — CSE and Data Science & AI are ready to explore in the meantime."}
        </p>
      </div>
    </div>
  );
}
