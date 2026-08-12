import { useEffect, useRef, useState } from "react";
import { Hash, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { ChannelCount } from "@/lib/pulse-api";
import { useDebriefRoom } from "@/lib/use-debrief-room";

function timeHHMM(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Deterministic per-name color so the same person always shows the
// same accent, without needing a role/color field from the backend.
const NAME_COLORS = ["#5DA2FA", "#F5B942", "#C0A8FF", "#4ADE80", "#F472B6", "#67C6C0"];
function colorForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return NAME_COLORS[hash % NAME_COLORS.length];
}

const INITIAL_VISIBLE = 8;

interface DebriefPanelProps {
  trending: ChannelCount[];
  activeTag: string | null;
  onTagClick: (tag: string) => void;
}

export default function DebriefPanel({
  trending,
  activeTag,
  onTagClick,
}: DebriefPanelProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"debrief" | "trending">("debrief");
  const [draft, setDraft] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const listRef = useRef<HTMLDivElement>(null);

  const viewer = user ? { name: user.name, avatarUrl: user.avatarUrl } : null;
  const { status, room, messages, connected, sendError, sendMessage } =
    useDebriefRoom(viewer);

  // Auto-scroll to the newest message when new chat arrives.
  useEffect(() => {
    if (tab !== "debrief") return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, tab]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !user || status !== "open") return;
    try {
      await sendMessage(text);
      setDraft("");
    } catch {
      // sendError is already set inside the hook — keep the draft in
      // the input so the user can retry instead of retyping it.
    }
  };

  const shown = messages.slice(-visibleCount);
  const hasOlder = messages.length > shown.length;

  return (
    <div className="rounded-[10px] border border-gq-border bg-gq-card flex flex-col h-[calc(100vh-220px)] min-h-[520px] sticky top-4 overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-gq-border px-3 pt-2.5 pb-2 shrink-0 text-[12px]">
        <button
          onClick={() => setTab("debrief")}
          className={cn(
            "flex items-center gap-1.5 pb-1.5 transition-colors",
            tab === "debrief"
              ? "border-b-2 border-gq-blue text-gq-text"
              : "text-gq-text-muted",
          )}
        >
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            {status === "open" && connected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gq-green opacity-75" />
            )}
            <span
              className={cn(
                "relative inline-flex rounded-full h-1.5 w-1.5",
                status === "open" ? (connected ? "bg-gq-green" : "bg-[#F5B942]") : "bg-gq-text-muted",
              )}
            />
          </span>
          Mock Debrief
        </button>
        <button
          onClick={() => setTab("trending")}
          className={cn(
            "pb-1.5 transition-colors",
            tab === "trending"
              ? "border-b-2 border-gq-blue text-gq-text"
              : "text-gq-text-muted",
          )}
        >
          Trending Tags
        </button>
      </div>

      {tab === "debrief" ? (
        <>
          {status === "loading" && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[14px] text-gq-text-muted">Checking room status…</p>
            </div>
          )}

          {status === "not-open" && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-1.5">
              <p className="text-[15px] font-semibold text-gq-text">
                Debrief room isn't open yet
              </p>
              <p className="text-[14px] text-gq-text-muted">
                Opens for your branch right after Sunday's contest closes,
                and stays open for 12 hours.
              </p>
            </div>
          )}

          {(status === "open" || status === "closed") && (
            <>
              {/* Chat history */}
              <div
                ref={listRef}
                className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3.5"
              >
                {status === "closed" && (
                  <p className="text-[13px] uppercase tracking-[0.5px] text-gq-text-muted text-center pb-1 border-b border-gq-border/60 mb-1">
                    This room has closed
                  </p>
                )}

                {hasOlder && (
                  <button
                    onClick={() => setVisibleCount((n) => n + 20)}
                    className="text-[13px] uppercase tracking-[0.5px] text-gq-text-muted hover:text-gq-text-muted self-center mb-1 transition-colors"
                  >
                    Show more
                  </button>
                )}

                {shown.length === 0 && (
                  <p className="text-[14px] text-gq-text-muted text-center py-8">
                    {status === "closed"
                      ? "No messages were sent in this room."
                      : "No chats yet — say something to start the room."}
                  </p>
                )}

                {shown.map((m) => (
                  <div key={m.id} className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-gq-border mt-0.5">
                      <img
                        src={m.authorAvatar}
                        alt={m.author}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-[14.5px] font-semibold"
                          style={{ color: colorForName(m.author) }}
                        >
                          {m.author}
                        </span>
                        <span className="text-[12.5px] text-gq-text-muted">
                          {timeHHMM(m.createdAt)}
                        </span>
                      </div>
                      <p className="text-[15px] text-gq-text leading-snug break-words">
                        {m.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Composer — only usable while the room is actually open */}
              {status === "open" && (
                <div className="border-t border-gq-border p-3 shrink-0">
                  {user ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <input
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSend();
                            }
                          }}
                          maxLength={300}
                          placeholder="Message the room..."
                          className="flex-1 bg-transparent border border-gq-border rounded-full px-3.5 py-2 text-[15px] text-gq-text placeholder:text-gq-text-muted outline-none focus:border-pulse-blue/40"
                        />
                        <button
                          onClick={handleSend}
                          disabled={!draft.trim()}
                          className={cn(
                            "w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0 transition-colors",
                            draft.trim()
                              ? "bg-gq-blue text-white hover:opacity-90"
                              : "bg-gq-border text-gq-text-muted cursor-not-allowed",
                          )}
                          aria-label="Send message"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                      {sendError && (
                        <p className="text-[13px] text-red-400 px-1">
                          {sendError}
                        </p>
                      )}
                      {room && (
                        <p className="text-[12.5px] text-gq-text-muted px-1">
                          Closes at {timeHHMM(room.closesAt)}
                          {!connected && " · reconnecting…"}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[13px] text-gq-text-muted text-center">
                      Log in to join the live debrief chat.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {trending.length === 0 && (
            <p className="text-[14px] text-gq-text-muted text-center py-8">
              Nothing trending yet.
            </p>
          )}
          <div className="flex flex-col gap-1">
            {trending.slice(0, 10).map((t, i) => (
              <button
                key={t.tag}
                onClick={() => onTagClick(t.tag)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[15px] transition-colors text-left",
                  activeTag === t.tag
                    ? "text-gq-blue bg-gq-blue/5"
                    : "text-gq-text-muted hover:text-gq-text hover:bg-gq-border/40",
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-[13px] text-gq-text-muted w-3">{i + 1}</span>
                  <Hash size={12} className="text-gq-text-muted shrink-0" />
                  {t.tag}
                </span>
                <span className="text-[13px] text-gq-text-muted">{t.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
