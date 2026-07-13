// The room lifecycle for Pulse's debrief chat. Turns the plain
// request/response + SSE calls in lib/debrief-api.ts into the three
// states DebriefPanel (session 7c) actually needs to render:
//
//   "not-open" — no room open for my branch right now
//   "open"     — live room: history loaded, SSE connected (or falling
//                back to polling if the stream's down)
//   "closed"   — this room's 12h window has lapsed
//
// Nothing here talks to the DOM/UI directly — DebriefPanel just reads
// `status`/`messages`/`connected` and calls `sendMessage`.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DebriefApiError,
  DebriefMessage,
  DebriefRoom,
  getActiveDebriefRoom,
  listDebriefMessages,
  openDebriefStream,
  postDebriefMessage,
} from "./debrief-api";

export type DebriefRoomStatus = "loading" | "not-open" | "open" | "closed";

interface Viewer {
  name: string;
  avatarUrl: string;
}

interface UseDebriefRoomResult {
  status: DebriefRoomStatus;
  room: DebriefRoom | null;
  messages: DebriefMessage[];
  /** True when the SSE stream is live. False means either still
   * connecting or running on the polling fallback — either way,
   * messages keep arriving, just not necessarily sub-second. */
  connected: boolean;
  sendError: string | null;
  sendMessage: (content: string) => Promise<void>;
}

const NOT_OPEN_POLL_MS = 60_000;
const FALLBACK_POLL_MS = 4_000;
const MAX_STREAM_RETRIES = 5;

export function useDebriefRoom(viewer: Viewer | null): UseDebriefRoomResult {
  const [status, setStatus] = useState<DebriefRoomStatus>("loading");
  const [room, setRoom] = useState<DebriefRoom | null>(null);
  const [messages, setMessages] = useState<DebriefMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Refs for anything with a lifecycle spanning renders — timers and
  // the stream itself. All cleared in the single cleanup() below so
  // there's one place that guarantees nothing leaks across a room
  // transition or unmount.
  const esRef = useRef<EventSource | null>(null);
  const notOpenPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessageAtRef = useRef<string | undefined>(undefined);
  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);

  const cleanupConnections = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    if (notOpenPollRef.current) clearInterval(notOpenPollRef.current);
    if (fallbackPollRef.current) clearInterval(fallbackPollRef.current);
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    notOpenPollRef.current = null;
    fallbackPollRef.current = null;
    reconnectTimerRef.current = null;
    closeTimerRef.current = null;
  }, []);

  // Dedupes by id — needed because a message we just sent arrives
  // twice: once as the direct POST response, once again via the SSE
  // broadcast (the server fans out to the sender's own connection
  // too, it doesn't know which client already has it optimistically).
  const mergeMessage = useCallback((msg: DebriefMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      lastMessageAtRef.current = msg.createdAt;
      return [...prev, msg].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });
  }, []);

  const startFallbackPolling = useCallback(() => {
    if (fallbackPollRef.current) return; // already running
    fallbackPollRef.current = setInterval(async () => {
      try {
        const fresh = await listDebriefMessages(lastMessageAtRef.current);
        fresh.forEach(mergeMessage);
      } catch {
        // Transient — next tick tries again. If the room's actually
        // closed by now, the closeTimer below will have already
        // moved status to "closed" and torn this interval down.
      }
    }, FALLBACK_POLL_MS);
  }, [mergeMessage]);

  const stopFallbackPolling = useCallback(() => {
    if (fallbackPollRef.current) {
      clearInterval(fallbackPollRef.current);
      fallbackPollRef.current = null;
    }
  }, []);

  const openStream = useCallback(() => {
    const es = openDebriefStream(
      (msg) => {
        mergeMessage(msg);
        // A message arriving means the connection is unambiguously
        // alive, even if this browser doesn't fire onopen reliably
        // through every proxy — good enough to also cover reconnects
        // that succeeded silently.
        retryCountRef.current = 0;
        setConnected(true);
        stopFallbackPolling();
      },
      () => {
        setConnected(false);
        // A fallback poll runs *while* we're disconnected, whether
        // that's the browser's own silent auto-retry (readyState
        // CONNECTING) or a fatal failure we have to retry ourselves
        // (readyState CLOSED) — either way messages shouldn't stall.
        startFallbackPolling();

        if (es.readyState === EventSource.CLOSED) {
          if (retryCountRef.current < MAX_STREAM_RETRIES) {
            const backoff = Math.min(1000 * 2 ** retryCountRef.current, 30_000);
            retryCountRef.current += 1;
            reconnectTimerRef.current = setTimeout(() => {
              if (mountedRef.current) openStream();
            }, backoff);
          }
          // Past max retries: stay on fallback polling for the rest
          // of the room's window rather than hammering a dead stream.
        }
      },
    );
    es.onopen = () => {
      retryCountRef.current = 0;
      setConnected(true);
      stopFallbackPolling();
    };
    esRef.current = es;
  }, [mergeMessage, startFallbackPolling, stopFallbackPolling]);

  const enterOpenRoom = useCallback(
    async (activeRoom: DebriefRoom) => {
      setRoom(activeRoom);
      setStatus("open");

      try {
        const history = await listDebriefMessages();
        if (!mountedRef.current) return;
        setMessages(history);
        lastMessageAtRef.current = history.at(-1)?.createdAt;
      } catch {
        // History load failing shouldn't block the live stream from
        // still trying — worst case the room opens with an empty
        // backlog instead of not opening at all.
      }

      openStream();

      const msUntilClose = new Date(activeRoom.closesAt).getTime() - Date.now();
      closeTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        cleanupConnections();
        setStatus("closed");
        setConnected(false);
      }, Math.max(msUntilClose, 0));
    },
    [openStream, cleanupConnections],
  );

  const resolveRoom = useCallback(async () => {
    let activeRoom: DebriefRoom | null;
    try {
      activeRoom = await getActiveDebriefRoom();
    } catch {
      // Network hiccup on the metadata call — treat like "not open"
      // for now, the poll below will retry.
      activeRoom = null;
    }
    if (!mountedRef.current) return;

    if (!activeRoom) {
      setStatus("not-open");
      setRoom(null);
      if (!notOpenPollRef.current) {
        notOpenPollRef.current = setInterval(() => {
          resolveRoom();
        }, NOT_OPEN_POLL_MS);
      }
      return;
    }

    // Room exists — stop polling for "did it open yet" and either
    // enter it live or, on the rare race where it closed between the
    // request firing and this callback running, land straight on
    // "closed" instead of opening a stream just to tear it down.
    if (notOpenPollRef.current) {
      clearInterval(notOpenPollRef.current);
      notOpenPollRef.current = null;
    }
    if (new Date(activeRoom.closesAt).getTime() <= Date.now()) {
      setRoom(activeRoom);
      setStatus("closed");
      return;
    }
    enterOpenRoom(activeRoom);
  }, [enterOpenRoom]);

  useEffect(() => {
    mountedRef.current = true;
    resolveRoom();
    return () => {
      mountedRef.current = false;
      cleanupConnections();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || !viewer) return;

      setSendError(null);
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const optimistic: DebriefMessage = {
        id: tempId,
        author: viewer.name,
        authorAvatar: viewer.avatarUrl,
        content: trimmed,
        createdAt: new Date().toISOString(),
        isOwner: true,
      };
      setMessages((prev) => [...prev, optimistic]);

      try {
        const real = await postDebriefMessage(trimmed);
        setMessages((prev) => {
          // Real message may have already arrived via SSE before this
          // await resolved — dedupe on id, and either way drop the
          // temp placeholder.
          const withoutTemp = prev.filter((m) => m.id !== tempId);
          if (withoutTemp.some((m) => m.id === real.id)) return withoutTemp;
          lastMessageAtRef.current = real.createdAt;
          return [...withoutTemp, real].sort((a, b) =>
            a.createdAt.localeCompare(b.createdAt),
          );
        });
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setSendError(
          err instanceof DebriefApiError
            ? err.message
            : "Failed to send message. Try again.",
        );
        throw err;
      }
    },
    [viewer],
  );

  return { status, room, messages, connected, sendError, sendMessage };
}
