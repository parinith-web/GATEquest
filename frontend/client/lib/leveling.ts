// XP and level math for the profile page.
//
// XP itself is earned server-side: every correctly-solved question
// (counted once, no matter how many attempts it took) awards XP based on
// its difficulty, scoped to the subject/branch the user is practicing —
// see backend/internal/store/activity.go's xpForDifficulty + GetXP.
//
//   Easy   -> 20 XP
//   Medium -> 35 XP
//   Hard   -> 50 XP
//
// This module turns that running XP total into a level + title using a
// simple quadratic curve: the XP required to *reach* level L is
// 25 * (L - 1)^2, so early levels come quickly (one easy question is
// most of the way to level 2) and later levels take meaningfully more
// solved questions — a standard "fast start, slow grind" RPG curve.
// Inverting that gives level(xp) = floor(sqrt(xp / 25)) + 1.

export const DIFFICULTY_XP: Record<string, number> = {
  Easy: 20,
  Medium: 35,
  Hard: 50,
};

/** XP required to *reach* the given level (level 1 = 0 XP). */
export function xpForLevel(level: number): number {
  return 25 * Math.pow(Math.max(1, level) - 1, 2);
}

/** Level for a given total XP (always >= 1). */
export function levelForXp(xp: number): number {
  if (xp <= 0) return 1;
  return Math.floor(Math.sqrt(xp / 25)) + 1;
}

// Title bands, keyed by the level a rank starts at. Chosen so the arc
// runs from a bare-bones "Novice" through to "Legend" over a long tail —
// there's more room past what the current question bank alone can grant,
// so titles stay meaningful as more questions get added.
const TITLE_BANDS: { minLevel: number; title: string }[] = [
  { minLevel: 60, title: "Legend" },
  { minLevel: 50, title: "Grandmaster" },
  { minLevel: 40, title: "Master" },
  { minLevel: 30, title: "Engineer" },
  { minLevel: 25, title: "Strategist" },
  { minLevel: 20, title: "Architect" },
  { minLevel: 15, title: "Specialist" },
  { minLevel: 10, title: "Adept" },
  { minLevel: 5, title: "Explorer" },
  { minLevel: 1, title: "Novice" },
];

export function titleForLevel(level: number): string {
  for (const band of TITLE_BANDS) {
    if (level >= band.minLevel) return band.title;
  }
  return "Novice";
}

export interface LevelProgress {
  level: number;
  title: string;
  totalXp: number;
  /** XP earned since hitting the current level. */
  xpIntoLevel: number;
  /** XP needed to go from the current level to the next one. */
  xpForNextLevel: number;
  /** 0-100 */
  percentToNextLevel: number;
}

export function getLevelProgress(totalXp: number): LevelProgress {
  const xp = Math.max(0, totalXp);
  const level = levelForXp(xp);
  const levelFloor = xpForLevel(level);
  const nextLevelFloor = xpForLevel(level + 1);
  const xpIntoLevel = xp - levelFloor;
  const xpForNextLevel = Math.max(1, nextLevelFloor - levelFloor);
  const percentToNextLevel = Math.min(
    100,
    Math.max(0, (xpIntoLevel / xpForNextLevel) * 100),
  );

  return {
    level,
    title: titleForLevel(level),
    totalXp: xp,
    xpIntoLevel,
    xpForNextLevel,
    percentToNextLevel,
  };
}
