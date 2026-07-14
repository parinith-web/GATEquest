// Streak milestone badges shown on the Profile page's Badges card.
// Each badge unlocks once the user's longest-ever daily solve streak
// (computed from the activity heatmap, same data source as the
// "MAX STREAK" stat on the Activity Map) reaches its threshold. Art is
// the 5-star "stitch" badge set (bronze → silver → gold → platinum →
// diamond), one per milestone.

export interface StreakBadgeDef {
  id: string;
  thresholdDays: number;
  name: string;
  desc: string;
  svg: JSX.Element;
}

// Every badge shares the same 5-point star + drop-shadow shape; only the
// gradient stops, outer-star fill, and text color change between tiers.
function StarBadgeSVG({
  gradientId,
  stopStart,
  stopEnd,
  outerFill,
  textFill,
  label,
  fontSize = 20,
}: {
  gradientId: string;
  stopStart: string;
  stopEnd: string;
  outerFill: string;
  textFill: string;
  label: string;
  fontSize?: number;
}) {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" style={{ stopColor: stopStart }} />
          <stop offset="100%" style={{ stopColor: stopEnd }} />
        </radialGradient>
        <filter id={`${gradientId}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
          <feOffset dx="2" dy="4" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#${gradientId}-shadow)`}>
        <path
          d="M100 10l25 55 60 5-45 40 15 60-55-35-55 35 15-60-45-40 60-5z"
          fill={outerFill}
        />
        <path
          d="M100 25l18 42 45 4-34 31 11 46-40-27-40 27 11-46-34-31 45-4z"
          fill={`url(#${gradientId})`}
        />
        <text
          x="100"
          y="110"
          fontFamily="sans-serif"
          fontSize={fontSize}
          fontWeight={900}
          fill={textFill}
          textAnchor="middle"
          style={{ letterSpacing: "-0.5px" }}
        >
          {label}
        </text>
      </g>
    </svg>
  );
}

export const STREAK_BADGES: StreakBadgeDef[] = [
  {
    id: "streak-1-week",
    thresholdDays: 7,
    name: "1 Week",
    desc: "7-Day Streak",
    svg: (
      <StarBadgeSVG
        gradientId="bronze-inner"
        stopStart="#E3AF66"
        stopEnd="#CD7F32"
        outerFill="#8B4513"
        textFill="#5D2906"
        label="1 WEEK"
      />
    ),
  },
  {
    id: "streak-1-month",
    thresholdDays: 30,
    name: "1 Month",
    desc: "30-Day Streak",
    svg: (
      <StarBadgeSVG
        gradientId="silver-inner"
        stopStart="#FFFFFF"
        stopEnd="#C0C0C0"
        outerFill="#505050"
        textFill="#303030"
        label="1 MONTH"
        fontSize={18}
      />
    ),
  },
  {
    id: "streak-50-days",
    thresholdDays: 50,
    name: "50 Days",
    desc: "50-Day Streak",
    svg: (
      <StarBadgeSVG
        gradientId="gold-inner"
        stopStart="#FFFACD"
        stopEnd="#FFD700"
        outerFill="#B8860B"
        textFill="#5C4000"
        label="50 DAYS"
      />
    ),
  },
  {
    id: "streak-100-days",
    thresholdDays: 100,
    name: "100 Days",
    desc: "100-Day Streak",
    svg: (
      <StarBadgeSVG
        gradientId="platinum-inner"
        stopStart="#FFFFFF"
        stopEnd="#E5E4E2"
        outerFill="#708090"
        textFill="#2F4F4F"
        label="100 DAYS"
        fontSize={18}
      />
    ),
  },
  {
    id: "streak-1-year",
    thresholdDays: 365,
    name: "1 Year",
    desc: "365-Day Streak",
    svg: (
      <StarBadgeSVG
        gradientId="diamond-inner"
        stopStart="#FFFFFF"
        stopEnd="#E0FFFF"
        outerFill="#5F9EA0"
        textFill="#008B8B"
        label="1 YEAR"
      />
    ),
  },
];
