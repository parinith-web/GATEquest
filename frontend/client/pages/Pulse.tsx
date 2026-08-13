import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Flame,
  GitBranch,
  Bookmark,
  TrendingUp,
  RefreshCw,
  Film,
  X,
  Loader2,
  Tag as TagIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import PostCard from "@/components/PostCard";
import DebriefPanel from "@/components/pulse/DebriefPanel";
import { useAuth } from "@/lib/auth-context";
import {
  ChannelCount,
  PulseMedia,
  PulsePost,
  PulseSort,
  createPulsePost,
  deletePulsePost,
  fetchPulseBookmarks,
  fetchPulseChannels,
  fetchPulseFeed,
  fetchPulseTrending,
  uploadPulseMedia,
} from "@/lib/pulse-api";

const PAGE_SIZE = 20;

// Keep in sync with maxMediaPerPost in backend/internal/store/pulse.go —
// the compose box shouldn't let someone queue up more attachments than
// the server will actually keep.
const MAX_MEDIA_PER_POST = 10;

// One attachment mid-upload/uploaded in the compose box. `id` is a
// local-only key (not the server URL) so a card can be found and
// removed/updated by identity even before its upload finishes.
interface ComposeAttachment {
  id: string;
  url: string | null;
  mediaType: "image" | "video";
  progress: number;
  error: string | null;
}

// Bounds for the "Add tags" control — kept in sync with the backend's
// SanitizeTags (maxTagsPerPost / maxTagLength in store/pulse.go) so the
// UI rejects/limits input the server would've dropped anyway.
const MAX_TAGS = 6;
const MAX_TAG_LENGTH = 24;
const TAG_CHAR_PATTERN = /^[A-Za-z0-9_-]+$/;

export default function PulsePage() {
  const { user } = useAuth();

  const [sortMode, setSortMode] = useState<PulseSort>("hot");
  const [searchParams] = useSearchParams();
  const [activeTag, setActiveTag] = useState<string | null>(
    () => searchParams.get("tag") ?? null,
  );
  // "bookmarks" swaps the center feed for the viewer's saved posts —
  // sort/channel filtering don't apply there, only pagination does.
  const [viewMode, setViewMode] = useState<"feed" | "bookmarks">("feed");

  const [posts, setPosts] = useState<PulsePost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [channels, setChannels] = useState<ChannelCount[]>([]);
  const [trending, setTrending] = useState<ChannelCount[]>([]);

  // Compose box state
  const [composeText, setComposeText] = useState("");
  // Personalized tags added via the "Add tags" control near the Post
  // button — kept entirely separate from composeText so a tag never
  // shows up as text inside the post itself.
  const [composeTags, setComposeTags] = useState<string[]>([]);
  const [tagInputOpen, setTagInputOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  // One or more attachments queued in the compose box — each uploads
  // independently so a slow video doesn't block an already-finished
  // image from showing its preview.
  const [composeAttachments, setComposeAttachments] = useState<
    ComposeAttachment[]
  >([]);
  const uploading = composeAttachments.some((a) => a.url === null && !a.error);
  const [posting, setPosting] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composeTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the compose textarea instead of scrolling inside a fixed
  // box: reset to the single-line height, then expand to fit whatever
  // content is actually there. Runs on every keystroke (and once on
  // mount) so it stays in sync even when text is cleared after posting.
  useEffect(() => {
    const el = composeTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [composeText]);

  // Commits whatever's in the tag draft input as a new personalized
  // tag: trims, strips a leading '#' if the person typed one anyway,
  // validates characters, dedupes case-insensitively, and enforces the
  // same MAX_TAGS/MAX_TAG_LENGTH the backend will enforce again itself.
  const commitTagDraft = () => {
    const raw = tagDraft.trim().replace(/^#/, "");
    setTagDraft("");
    if (!raw || raw.length > MAX_TAG_LENGTH || !TAG_CHAR_PATTERN.test(raw)) return;
    setComposeTags((prev) => {
      if (prev.length >= MAX_TAGS) return prev;
      if (prev.some((t) => t.toLowerCase() === raw.toLowerCase())) return prev;
      return [...prev, raw];
    });
  };

  const removeComposeTag = (tag: string) => {
    setComposeTags((prev) => prev.filter((t) => t !== tag));
  };

  // Infinite-scroll sentinel — observed below, see the effect further
  // down. Kept alongside the Load More button rather than replacing it:
  // the button still works as a manual/no-JS-observer fallback.
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadFeed = useCallback(
    async (opts: { tag: string | null; sort: PulseSort; offset: number }) => {
      const result = await fetchPulseFeed({
        tag: opts.tag ?? undefined,
        sort: opts.sort,
        limit: PAGE_SIZE,
        offset: opts.offset,
      });
      return result;
    },
    [],
  );

  // Reload the feed whenever sort or channel filter changes.
  useEffect(() => {
    if (viewMode !== "feed") return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadFeed({ tag: activeTag, sort: sortMode, offset: 0 })
      .then((result) => {
        if (cancelled) return;
        setPosts(result.posts ?? []);
        setTotal(result.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load feed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sortMode, activeTag, loadFeed, viewMode]);

  // Load the bookmarks view when switched into it.
  useEffect(() => {
    if (viewMode !== "bookmarks") return;
    if (!user) {
      setPosts([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPulseBookmarks({ limit: PAGE_SIZE, offset: 0 })
      .then((result) => {
        if (cancelled) return;
        setPosts(result.posts ?? []);
        setTotal(result.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load bookmarks");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewMode, user]);

  // Channels sidebar, loaded once (and refreshed after a new post is
  // published, since that can create/bump a channel).
  const loadChannels = useCallback(() => {
    fetchPulseChannels(10)
      .then(setChannels)
      .catch(() => {
        /* sidebar is non-critical — fail silently */
      });
  }, []);

  // Trending (last 48h) card, loaded once and refreshed alongside
  // channels after a new post goes up. Top 10 feeds the Debrief
  // panel's "Trending Tags" tab.
  const loadTrending = useCallback(() => {
    fetchPulseTrending(10)
      .then(setTrending)
      .catch(() => {
        /* sidebar is non-critical — fail silently */
      });
  }, []);

  useEffect(() => {
    loadChannels();
    loadTrending();
  }, [loadChannels, loadTrending]);

  // Infinite scroll: auto-trigger the same load-more path as the button
  // once the sentinel at the bottom of the feed scrolls into view. The
  // button stays visible too — this only saves the click, it doesn't
  // replace the affordance.
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || loading || loadingMore || posts.length >= total) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) handleLoadMore();
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, loadingMore, posts.length, total, viewMode, sortMode, activeTag]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const result =
        viewMode === "bookmarks"
          ? await fetchPulseBookmarks({ limit: PAGE_SIZE, offset: posts.length })
          : await loadFeed({
              tag: activeTag,
              sort: sortMode,
              offset: posts.length,
            });
      setPosts((prev) => [...prev, ...(result.posts ?? [])]);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more posts");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleTagClick = (tag: string) => {
    setViewMode("feed");
    setActiveTag((current) => (current === tag ? null : tag));
  };

  // Uploads one file into its own attachment slot, tracked by a
  // local-only id so its progress/result can be updated independently
  // of every other in-flight upload.
  const uploadOneAttachment = (file: File) => {
    const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const guessedType = file.type.startsWith("video/") ? "video" : "image";
    setComposeAttachments((prev) => [
      ...prev,
      { id: localId, url: null, mediaType: guessedType, progress: 0, error: null },
    ]);
    uploadPulseMedia(file, (pct) => {
      setComposeAttachments((prev) =>
        prev.map((a) => (a.id === localId ? { ...a, progress: pct } : a)),
      );
    })
      .then((result) => {
        setComposeAttachments((prev) =>
          prev.map((a) =>
            a.id === localId
              ? { ...a, url: result.url, mediaType: result.mediaType, progress: 100 }
              : a,
          ),
        );
      })
      .catch((err) => {
        setComposeAttachments((prev) =>
          prev.map((a) =>
            a.id === localId
              ? {
                  ...a,
                  error: err instanceof Error ? err.message : "Upload failed",
                }
              : a,
          ),
        );
      });
  };

  const handleMediaPick = (files: FileList) => {
    setComposeError(null);
    const room = MAX_MEDIA_PER_POST - composeAttachments.length;
    if (room <= 0) {
      setComposeError(`You can attach up to ${MAX_MEDIA_PER_POST} files per post.`);
      return;
    }
    Array.from(files)
      .slice(0, room)
      .forEach(uploadOneAttachment);
    if (files.length > room) {
      setComposeError(`Only the first ${room} file(s) were added — ${MAX_MEDIA_PER_POST} max per post.`);
    }
  };

  const removeComposeAttachment = (id: string) => {
    setComposeAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handlePost = async () => {
    const content = composeText.trim();
    if (!content || uploading) return;
    // If there's an uncommitted tag still sitting in the draft input
    // (person typed a tag but hit Post instead of Enter), commit it
    // rather than silently dropping it.
    const pendingRaw = tagDraft.trim().replace(/^#/, "");
    const pendingTag =
      pendingRaw &&
      pendingRaw.length <= MAX_TAG_LENGTH &&
      TAG_CHAR_PATTERN.test(pendingRaw) &&
      !composeTags.some((t) => t.toLowerCase() === pendingRaw.toLowerCase())
        ? pendingRaw
        : null;
    const tags = pendingTag ? [...composeTags, pendingTag] : composeTags;

    const media: PulseMedia[] = composeAttachments
      .filter((a): a is ComposeAttachment & { url: string } => a.url !== null)
      .map((a) => ({ url: a.url, type: a.mediaType }));

    setPosting(true);
    setComposeError(null);
    try {
      const created = await createPulsePost({
        content,
        media: media.length > 0 ? media : undefined,
        tags,
      });
      // New post always lands at the top regardless of current sort —
      // it's the newest and (for hot/top) starts at 0 net votes, which
      // is where it'd rank anyway.
      setPosts((prev) => [created, ...prev]);
      setTotal((t) => t + 1);
      setComposeText("");
      setComposeTags([]);
      setTagDraft("");
      setTagInputOpen(false);
      setComposeAttachments([]);
      loadChannels();
      loadTrending();
    } catch (err) {
      setComposeError(err instanceof Error ? err.message : "Failed to publish post");
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const prev = posts;
    setPosts((p) => p.filter((post) => post.id !== id));
    setTotal((t) => Math.max(0, t - 1));
    try {
      await deletePulsePost(id);
    } catch (err) {
      // Roll back on failure so the UI doesn't lie about what's saved.
      setPosts(prev);
      setError(err instanceof Error ? err.message : "Failed to delete post");
    }
  };

  const hasMore = posts.length < total;

  return (
    <Layout>
      <div className="px-6 max-w-[1280px] mx-auto pt-6 pb-24">
        {/* 2 Column Grid Layout: feed + Debrief/Trending panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left/main panel: Feed column */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Compose box */}
            {user ? (
              <div className="rounded-[10px] border border-gq-border bg-gq-card p-3 flex flex-col gap-2.5">
                <div className="flex items-start gap-3">
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="h-8 w-8 shrink-0 rounded-full bg-black object-cover mt-1"
                  />
                  <textarea
                    ref={composeTextareaRef}
                    value={composeText}
                    onChange={(e) => setComposeText(e.target.value)}
                    placeholder="Share an experience, a resource, or a doubt worth discussing..."
                    rows={1}
                    maxLength={2000}
                    className="flex-1 resize-none bg-transparent text-[15px] font-sans text-gq-text placeholder:text-gq-text-muted outline-none py-1 leading-[1.4] max-h-[320px] overflow-y-auto"
                  />
                </div>

                {/* Attachment previews — each uploads independently, so
                    a still-uploading video sits alongside an already-
                    finished image instead of blocking it. */}
                {composeAttachments.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {composeAttachments.map((att) => (
                      <div
                        key={att.id}
                        className="relative w-[92px] h-[92px] rounded-md border border-gq-border bg-black/40 overflow-hidden flex items-center justify-center"
                      >
                        {att.url ? (
                          att.mediaType === "image" ? (
                            <img
                              src={att.url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <video
                              src={att.url}
                              className="w-full h-full object-cover"
                              muted
                            />
                          )
                        ) : att.error ? (
                          <span className="px-1.5 text-center text-[10px] text-pulse-red">
                            {att.error}
                          </span>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Loader2 size={14} className="animate-spin text-gq-blue" />
                            <span className="text-[10px] text-gq-text-muted">
                              {att.progress}%
                            </span>
                          </div>
                        )}
                        <button
                          onClick={() => removeComposeAttachment(att.id)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gq-card border border-gq-border flex items-center justify-center text-gq-text-muted hover:text-pulse-red"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {composeError && (
                  <p className="text-[14px] text-pulse-red">{composeError}</p>
                )}

                {/* Personalized tags picked so far — these post as a
                    separate `tags` field, never as text inside the
                    post, and land in the exact top-right badge spot on
                    the published card (see PostCard's badgeTags). */}
                {composeTags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {composeTags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 rounded-[4px] bg-gq-blue/15 pl-1.5 pr-1 py-[3px] text-[10.5px] font-medium uppercase tracking-[0.04em] text-gq-blue"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => removeComposeTag(tag)}
                          title={`Remove #${tag}`}
                          className="text-gq-blue/70 hover:text-pulse-red"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-gq-border pt-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) handleMediaPick(files);
                        e.target.value = "";
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={composeAttachments.length >= MAX_MEDIA_PER_POST}
                      className="flex items-center gap-1.5 text-gq-text-muted hover:text-gq-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                      title="Attach images or videos"
                    >
                      <Film size={13} />
                    </button>
                    <span className="text-[12px] text-gq-text-muted truncate">
                      {composeText.length}/2000
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {tagInputOpen ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[12px] text-gq-text-muted">#</span>
                        <input
                          autoFocus
                          value={tagDraft}
                          onChange={(e) => setTagDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === ",") {
                              e.preventDefault();
                              commitTagDraft();
                            } else if (e.key === "Escape") {
                              setTagDraft("");
                              setTagInputOpen(false);
                            } else if (
                              e.key === "Backspace" &&
                              tagDraft === "" &&
                              composeTags.length > 0
                            ) {
                              removeComposeTag(composeTags[composeTags.length - 1]);
                            }
                          }}
                          onBlur={() => {
                            commitTagDraft();
                            setTagInputOpen(false);
                          }}
                          placeholder="tag name"
                          maxLength={MAX_TAG_LENGTH}
                          className="w-24 bg-transparent border-b border-gq-border text-[12px] text-gq-text placeholder:text-gq-text-muted outline-none"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setTagInputOpen(true)}
                        disabled={composeTags.length >= MAX_TAGS}
                        title="Add tags"
                        className="flex items-center gap-1 text-[12px] font-medium text-gq-text-muted hover:text-gq-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <TagIcon size={12} />
                        Add tags
                      </button>
                    )}
                    <button
                      onClick={handlePost}
                      disabled={!composeText.trim() || posting || uploading}
                      className={cn(
                        "flex items-center gap-1.5 shrink-0 rounded-[6px] px-2.5 py-1 text-[12px] font-semibold transition-colors",
                        composeText.trim() && !posting && !uploading
                          ? "bg-gq-blue text-[#0E0E0E] hover:opacity-90"
                          : "bg-gq-border text-gq-text-muted cursor-not-allowed"
                      )}
                    >
                      {posting && <Loader2 size={11} className="animate-spin" />}
                      {posting ? "Posting..." : "Post"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[10px] border border-dashed border-gq-border bg-gq-card p-4 text-center">
                <p className="text-[14px] text-gq-text-muted">
                  Log in to post, comment, and react on Pulse.
                </p>
              </div>
            )}

            {/* Filter/Sort Bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                {viewMode === "bookmarks" ? (
                  <button
                    onClick={() => setViewMode("feed")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gq-blue/40 bg-gq-blue/10 text-[13px] text-gq-blue"
                  >
                    <Bookmark size={12} />
                    Your bookmarks
                    <X size={11} />
                  </button>
                ) : (
                  <>
                {/* HOT */}
                <button
                  onClick={() => {
                    setViewMode("feed");
                    setSortMode("hot");
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[13px] transition-colors",
                    sortMode === "hot"
                      ? "border-gq-border bg-gq-card text-gq-text"
                      : "border-gq-border bg-transparent text-gq-text-muted hover:text-gq-text"
                  )}
                >
                  <Flame size={12} />
                  Hot
                </button>

                {/* NEW */}
                <button
                  onClick={() => {
                    setViewMode("feed");
                    setSortMode("new");
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[13px] transition-colors",
                    sortMode === "new"
                      ? "border-gq-border bg-gq-card text-gq-text"
                      : "border-gq-border bg-transparent text-gq-text-muted hover:text-gq-text"
                  )}
                >
                  <GitBranch size={12} />
                  New
                </button>

                {/* TOP */}
                <button
                  onClick={() => {
                    setViewMode("feed");
                    setSortMode("top");
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[13px] transition-colors",
                    sortMode === "top"
                      ? "border-gq-border bg-gq-card text-gq-text"
                      : "border-gq-border bg-transparent text-gq-text-muted hover:text-gq-text"
                  )}
                >
                  <TrendingUp size={12} />
                  Top
                </button>

                {activeTag && (
                  <button
                    onClick={() => setActiveTag(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gq-blue/40 bg-gq-blue/10 text-[13px] text-gq-blue"
                  >
                    #{activeTag}
                    <X size={11} />
                  </button>
                )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Bookmarks toggle */}
                <button
                  onClick={() => setViewMode((m) => (m === "bookmarks" ? "feed" : "bookmarks"))}
                  title={viewMode === "bookmarks" ? "Back to feed" : "Your bookmarks"}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[13px] transition-colors",
                    viewMode === "bookmarks"
                      ? "border-gq-blue/40 bg-gq-blue/10 text-gq-blue"
                      : "border-gq-border bg-transparent text-gq-text-muted hover:text-gq-text",
                  )}
                >
                  <Bookmark size={12} />
                </button>

                {/* Total nodes */}
                <div className="px-2.5 py-1.5 rounded-full border border-gq-border bg-gq-card">
                  <span className="text-[13px] text-gq-text-muted">
                    {viewMode === "bookmarks" ? "Saved" : "Total"}: {total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Feed states */}
            {loading && (
              <div className="flex flex-col gap-2.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded-[10px] border border-gq-border bg-gq-card p-3 flex flex-col gap-2.5 animate-pulse"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-gq-border" />
                      <div className="flex flex-col gap-1.5">
                        <div className="w-24 h-2.5 rounded bg-gq-border" />
                        <div className="w-16 h-2 rounded bg-gq-border" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="w-full h-2.5 rounded bg-gq-border" />
                      <div className="w-3/4 h-2.5 rounded bg-gq-border" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && error && (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <p className="text-[14px] text-pulse-red">{error}</p>
              </div>
            )}

            {!loading && !error && viewMode === "bookmarks" && !user && (
              <div className="flex flex-col items-center gap-2 py-16 text-center border border-dashed border-gq-border rounded-[10px]">
                <p className="text-[14px] text-gq-text-muted">
                  Log in to see posts you've bookmarked.
                </p>
              </div>
            )}

            {!loading && !error && posts.length === 0 && !(viewMode === "bookmarks" && !user) && (
              <div className="flex flex-col items-center gap-2 py-16 text-center border border-dashed border-gq-border rounded-[10px]">
                <p className="text-[14px] text-gq-text-muted">
                  {viewMode === "bookmarks"
                    ? "You haven't bookmarked anything yet."
                    : activeTag
                      ? `No posts tagged #${activeTag} yet.`
                      : "Nothing here yet — be the first to post."}
                </p>
              </div>
            )}

            {/* Post cards */}
            {!loading && !error && posts.length > 0 && (
              <div className="flex flex-col gap-2.5">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    {...post}
                    onTagClick={handleTagClick}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}

            {/* Load More — also doubles as the infinite-scroll sentinel;
                the observer above fires handleLoadMore once this div
                scrolls near the viewport, so in practice this mostly
                shows the loading state rather than needing a click. */}
            {!loading && !error && hasMore && (
              <div ref={loadMoreRef}>
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center justify-center gap-2 py-3 border border-dashed border-gq-border rounded-[10px] text-gq-text-muted hover:text-gq-text hover:border-gq-text-muted transition-colors w-full"
                >
                  {loadingMore ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <RefreshCw size={12} />
                  )}
                  <span className="text-[13px]">
                    {loadingMore ? "Loading..." : "Load more"}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Right panel: live Mock Debrief chat + Trending Tags */}
          <div className="lg:col-span-4">
            <DebriefPanel
              trending={trending}
              activeTag={activeTag}
              onTagClick={handleTagClick}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
