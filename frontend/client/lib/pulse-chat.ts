// Mock live chat for Pulse's "Mock Debrief" room.
//
// There's no backend endpoint for this yet (see
// backend/internal/api/pulse.go for the real Pulse API) — this module
// fakes a live room entirely in the browser. It seeds a short
// conversation anchored to "now" so timestamps look real, prunes
// anything older than an hour on every tick (per the 1hr-window
// requirement), and occasionally injects a line from another
// participant so the room feels alive rather than static. When a real
// /api/pulse/debrief endpoint exists, only the functions in this file
// need to change — components importing them can stay the same.

export interface DebriefMessage {
  id: string;
  author: string;
  authorAvatar: string;
  content: string;
  createdAt: string; // ISO timestamp
}

const ONE_HOUR_MS = 60 * 60 * 1000;

let seq = 0;
const nextId = () => `dbf_${Date.now()}_${seq++}`;

function avatarFor(name: string) {
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name)}`;
}

function minutesAgo(m: number): string {
  return new Date(Date.now() - m * 60_000).toISOString();
}

// Seeded conversation — timestamps are relative to load time so the
// room always looks like it's been live for the past ~20 minutes.
const SEED_SCRIPT: { author: string; content: string; minutesAgo: number }[] = [
  { author: "Sruthi", content: "Anyone else stuck on Q14 from today's mock? Karnaugh map part.", minutesAgo: 19 },
  { author: "Rohan", content: "Group the 1s diagonally? No — check the don't-care cells first.", minutesAgo: 18 },
  { author: "Sruthi", content: "Oh the don't-cares were the catch. Got it, thanks.", minutesAgo: 17 },
  { author: "Parinith", content: "Posting the full solution in Resources in a bit.", minutesAgo: 16 },
  { author: "Piyush", content: "Different question — anyone remember the trick for CPU utilization with context-switch overhead?", minutesAgo: 14 },
  { author: "Rohan", content: "Subtract total switch time from cycle length before you divide. That's the whole trick.", minutesAgo: 13 },
  { author: "Parinith", content: "Solution's up now — check Resources, page 2 has the working.", minutesAgo: 12 },
  { author: "Piyush", content: "Appreciate it. This room is genuinely faster than office hours.", minutesAgo: 11 },
];

// Module-level store so the room's history survives across component
// re-mounts within the same tab session (switching tabs, navigating
// away and back), the same way a real socket connection would keep
// its own buffer independent of the component tree.
let store: DebriefMessage[] | null = null;

function seedStore(): DebriefMessage[] {
  if (!store) {
    store = SEED_SCRIPT.map(({ author, content, minutesAgo: m }) => ({
      id: nextId(),
      author,
      authorAvatar: avatarFor(author),
      content,
      createdAt: minutesAgo(m),
    }));
  }
  return store;
}

export function getInitialDebriefMessages(): DebriefMessage[] {
  return [...seedStore()];
}

/** Drops anything older than 1hr — the room only ever shows the last hour of chat. */
export function pruneOldMessages(messages: DebriefMessage[]): DebriefMessage[] {
  const cutoff = Date.now() - ONE_HOUR_MS;
  return messages.filter((m) => new Date(m.createdAt).getTime() >= cutoff);
}

export function postDebriefMessage(input: {
  author: string;
  authorAvatar: string;
  content: string;
}): DebriefMessage {
  const msg: DebriefMessage = {
    id: nextId(),
    author: input.author,
    authorAvatar: input.authorAvatar,
    content: input.content.slice(0, 300),
    createdAt: new Date().toISOString(),
  };
  seedStore().push(msg);
  return msg;
}

// --- Simulated "live" participants ------------------------------------------

const AMBIENT_PARTICIPANTS = ["Sruthi", "Rohan", "Parinith", "Piyush", "Ananya", "Devraj"];
const AMBIENT_LINES = [
  "Anyone doing a review session tonight?",
  "That last question was brutal.",
  "Can someone explain the pipeline hazard part again?",
  "Marks vs time trade-off is real on this one.",
  "Who's attempting the next mock tomorrow?",
  "Thanks for the notes, this really helped.",
];

/**
 * Subscribes to simulated incoming messages from other participants.
 * Returns an unsubscribe function. Fires at most once every ~20s and
 * only about a third of the time, so the room feels organic instead
 * of metronomic.
 */
export function subscribeToDebriefMessages(
  onMessage: (msg: DebriefMessage) => void,
): () => void {
  const timer = setInterval(() => {
    if (Math.random() > 0.35) return;
    const author =
      AMBIENT_PARTICIPANTS[Math.floor(Math.random() * AMBIENT_PARTICIPANTS.length)];
    const content = AMBIENT_LINES[Math.floor(Math.random() * AMBIENT_LINES.length)];
    const msg: DebriefMessage = {
      id: nextId(),
      author,
      authorAvatar: avatarFor(author),
      content,
      createdAt: new Date().toISOString(),
    };
    seedStore().push(msg);
    onMessage(msg);
  }, 20_000);
  return () => clearInterval(timer);
}
