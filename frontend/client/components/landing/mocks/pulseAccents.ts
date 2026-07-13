import {
  Database,
  Cpu,
  Binary,
  Network,
  Calculator,
  Code2,
  BookOpen,
  Layers,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Lightweight deterministic icon + color generator for Pulse's tag   */
/*  and study-group mocks — same spirit as Nest's collectionIcons.tsx  */
/*  (a seeded pick from a small icon/color set) reskinned with GATE     */
/*  subject icons and the app's own gq-* accent palette.               */
/* ------------------------------------------------------------------ */

const ICONS: LucideIcon[] = [Database, Cpu, Binary, Network, Calculator, Code2, BookOpen, Layers];

const COLORS: string[] = [
  "#5DA2FA", // gq-blue
  "#ADC6FF", // gq-blue-accent
  "#C0C1FF", // gq-purple
  "#EAB308", // gq-yellow
  "#FFB4AB", // gq-red
  "#A3FF33", // gq-green
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function getTagAccent(seed: string): { Icon: LucideIcon; color: string } {
  const hash = hashString(seed || "Pulse");
  return {
    Icon: ICONS[hash % ICONS.length],
    color: COLORS[hash % COLORS.length],
  };
}
