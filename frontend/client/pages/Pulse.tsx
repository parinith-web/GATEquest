import { useCallback, useEffect, useRef, useState } from "react";
import {
  Flame,
  GitBranch,
  Bookmark,
  TrendingUp,
  RefreshCw,
  Cpu,
  Film,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import PostCard from "@/components/PostCard";
import DebriefPanel from "@/components/pulse/DebriefPanel";
import { useAuth } from "@/lib/auth-context";
import {
  ChannelCount,
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

export default function PulsePage() {
  const { user } = useAuth();

  const [sortMode, setSortMode] = useState<PulseSort>("hot");
  const [activeHashtag, setActiveHashtag] = useState<string | null>(null);
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
  const [composeMediaUrl, setComposeMediaUrl] = useState<string | null>(null);
  const [composeMediaType, setComposeMediaType] = useState<"image" | "video" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [posting, setPosting] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Infinite-scroll sentinel — observed below, see the effect further
  // down. Kept alongside the Load More button rather than replacing it:
  // the button still works as a manual/no-JS-observer fallback.
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadFeed = useCallback(
    async (opts: { hashtag: string | null; sort: PulseSort; offset: number }) => {
      const result = await fetchPulseFeed({
        hashtag: opts.hashtag ?? undefined,
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
    loadFeed({ hashtag: activeHashtag, sort: sortMode, offset: 0 })
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
  }, [sortMode, activeHashtag, loadFeed, viewMode]);

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
  }, [loading, loadingMore, posts.length, total, viewMode, sortMode, activeHashtag]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const result =
        viewMode === "bookmarks"
          ? await fetchPulseBookmarks({ limit: PAGE_SIZE, offset: posts.length })
          : await loadFeed({
              hashtag: activeHashtag,
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

  const handleHashtagClick = (tag: string) => {
    setViewMode("feed");
    setActiveHashtag((current) => (current === tag ? null : tag));
  };

  const handleMediaPick = async (file: File) => {
    setComposeError(null);
    setUploading(true);
    setUploadProgress(0);
    try {
      const result = await uploadPulseMedia(file, setUploadProgress);
      setComposeMediaUrl(result.url);
      setComposeMediaType(result.mediaType);
    } catch (err) {
      setComposeError(err instanceof Error ? err.message : "Could not upload that file");
    } finally {
      setUploading(false);
    }
  };

  const handlePost = async () => {
    const content = composeText.trim();
    if (!content || uploading) return;
    setPosting(true);
    setComposeError(null);
    try {
      const created = await createPulsePost({
        content,
        mediaUrl: composeMediaUrl ?? undefined,
        mediaType: composeMediaType ?? undefined,
      });
      // New post always lands at the top regardless of current sort —
      // it's the newest and (for hot/top) starts at 0 net votes, which
      // is where it'd rank anyway.
      setPosts((prev) => [created, ...prev]);
      setTotal((t) => t + 1);
      setComposeText("");
      setComposeMediaUrl(null);
      setComposeMediaType(null);
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
      <div className="px-6 max-w-[1280px] mx-auto pb-24">
        {/* Local Page Sub-Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-pulse-border pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-pulse-blue flex items-center justify-center flex-shrink-0">
              <Cpu size={15} className="text-white" />
            </div>
            <div>
              <h1 className="font-mono font-bold text-[18px] text-pulse-text tracking-[3px] uppercase">
                PULSE
              </h1>
              <div className="text-[10px] font-mono text-pulse-dim uppercase tracking-[2px]">
                CS Community Network
              </div>
            </div>
          </div>
        </div>

        {/* 2 Column Grid Layout: feed + Debrief/Trending panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left/main panel: Feed column */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Compose box */}
            {user ? (
              <div className="border border-pulse-border rounded-lg bg-pulse-card p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-sm border border-pulse-border2 bg-pulse-border overflow-hidden flex-shrink-0">
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <textarea
                    value={composeText}
                    onChange={(e) => setComposeText(e.target.value)}
                    placeholder="Share an experience, a resource, or a #hashtag worth discussing..."
                    rows={3}
                    maxLength={2000}
                    className="flex-1 resize-none bg-transparent text-[14px] font-sans text-pulse-text placeholder:text-pulse-dim outline-none"
                  />
                </div>

                {uploading && (
                  <div className="flex items-center gap-2 w-fit px-3 py-2 rounded-md border border-pulse-border bg-pulse-card">
                    <Loader2 size={13} className="animate-spin text-pulse-blue" />
                    <span className="text-[11px] font-mono text-pulse-muted">
                      Uploading... {uploadProgress}%
                    </span>
                  </div>
                )}

                {!uploading && composeMediaUrl && composeMediaType === "image" && (
                  <div className="relative w-fit">
                    <img
                      src={composeMediaUrl}
                      alt=""
                      className="max-h-[200px] rounded-md border border-pulse-border"
                    />
                    <button
                      onClick={() => {
                        setComposeMediaUrl(null);
                        setComposeMediaType(null);
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-pulse-card border border-pulse-border flex items-center justify-center text-pulse-muted hover:text-pulse-red"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                {!uploading && composeMediaUrl && composeMediaType === "video" && (
                  <div className="relative w-fit">
                    <video
                      src={composeMediaUrl}
                      controls
                      className="max-h-[200px] rounded-md border border-pulse-border"
                    />
                    <button
                      onClick={() => {
                        setComposeMediaUrl(null);
                        setComposeMediaType(null);
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-pulse-card border border-pulse-border flex items-center justify-center text-pulse-muted hover:text-pulse-red"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                {composeError && (
                  <p className="text-[12px] font-mono text-pulse-red">{composeError}</p>
                )}

                <div className="flex items-center justify-between border-t border-pulse-border pt-3">
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleMediaPick(file);
                        e.target.value = "";
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-pulse-muted hover:text-pulse-blue hover:bg-pulse-blue/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Attach an image or video"
                    >
                      <Film size={14} />
                      <span className="text-[11px] font-mono uppercase tracking-[0.5px]">
                        MEDIA
                      </span>
                    </button>
                    <span className="text-[10px] font-mono text-pulse-dim">
                      {composeText.length}/2000 · use #hashtags to tag a channel
                    </span>
                  </div>
                  <button
                    onClick={handlePost}
                    disabled={!composeText.trim() || posting || uploading}
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-[0.6px] transition-colors",
                      composeText.trim() && !posting && !uploading
                        ? "bg-pulse-blue text-white hover:opacity-90"
                        : "bg-pulse-border text-pulse-dim cursor-not-allowed"
                    )}
                  >
                    {posting && <Loader2 size={12} className="animate-spin" />}
                    {posting ? "POSTING..." : "POST"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-pulse-border rounded-lg bg-pulse-card p-4 text-center">
                <p className="text-[12px] font-mono text-pulse-muted">
                  Log in to post, comment, and react on Pulse.
                </p>
              </div>
            )}

            {/* Filter/Sort Bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap border-b border-pulse-border pb-3">
              <div className="flex items-center gap-2">
                {viewMode === "bookmarks" ? (
                  <button
                    onClick={() => setViewMode("feed")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-pulse-blue/40 bg-pulse-blue/10 text-[11px] font-mono uppercase tracking-wider text-pulse-blue"
                  >
                    <Bookmark size={12} />
                    YOUR BOOKMARKS
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
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-mono uppercase tracking-wider transition-colors",
                    sortMode === "hot"
                      ? "border-pulse-border bg-pulse-card shadow-[0_0_10px_0_rgba(59,130,246,0.10)] text-pulse-text"
                      : "border-pulse-border bg-transparent text-pulse-muted hover:text-pulse-text"
                  )}
                >
                  <Flame size={12} />
                  HOT
                </button>

                {/* NEW */}
                <button
                  onClick={() => {
                    setViewMode("feed");
                    setSortMode("new");
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-mono uppercase tracking-wider transition-colors",
                    sortMode === "new"
                      ? "border-pulse-border bg-pulse-card text-pulse-text"
                      : "border-pulse-border bg-transparent text-pulse-muted hover:text-pulse-text"
                  )}
                >
                  <GitBranch size={12} />
                  NEW
                </button>

                {/* TOP */}
                <button
                  onClick={() => {
                    setViewMode("feed");
                    setSortMode("top");
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-mono uppercase tracking-wider transition-colors",
                    sortMode === "top"
                      ? "border-pulse-border bg-pulse-card text-pulse-text"
                      : "border-pulse-border bg-transparent text-pulse-muted hover:text-pulse-text"
                  )}
                >
                  <TrendingUp size={12} />
                  TOP
                </button>

                {activeHashtag && (
                  <button
                    onClick={() => setActiveHashtag(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-pulse-blue/40 bg-pulse-blue/10 text-[11px] font-mono uppercase tracking-wider text-pulse-blue"
                  >
                    #{activeHashtag}
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
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono uppercase tracking-wider transition-colors",
                    viewMode === "bookmarks"
                      ? "border-pulse-blue/40 bg-pulse-blue/10 text-pulse-blue"
                      : "border-pulse-border bg-transparent text-pulse-muted hover:text-pulse-text",
                  )}
                >
                  <Bookmark size={12} />
                </button>

                {/* Total nodes */}
                <div className="px-2 py-1 rounded-sm border border-pulse-border bg-pulse-card">
                  <span className="text-[12px] font-mono text-pulse-muted">
                    {viewMode === "bookmarks" ? "Saved" : "Total Nodes"}: {total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Feed states */}
            {loading && (
              <div className="flex flex-col gap-6">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="border border-pulse-border rounded-lg bg-pulse-card p-4 flex flex-col gap-3 animate-pulse"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-sm bg-pulse-border" />
                      <div className="flex flex-col gap-1.5">
                        <div className="w-24 h-2.5 rounded bg-pulse-border" />
                        <div className="w-16 h-2 rounded bg-pulse-border" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="w-full h-2.5 rounded bg-pulse-border" />
                      <div className="w-3/4 h-2.5 rounded bg-pulse-border" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && error && (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <p className="text-[12px] font-mono text-pulse-red">{error}</p>
              </div>
            )}

            {!loading && !error && viewMode === "bookmarks" && !user && (
              <div className="flex flex-col items-center gap-2 py-16 text-center border border-dashed border-pulse-border rounded-lg">
                <p className="text-[13px] font-mono text-pulse-muted">
                  Log in to see posts you've bookmarked.
                </p>
              </div>
            )}

            {!loading && !error && posts.length === 0 && !(viewMode === "bookmarks" && !user) && (
              <div className="flex flex-col items-center gap-2 py-16 text-center border border-dashed border-pulse-border rounded-lg">
                <p className="text-[13px] font-mono text-pulse-muted">
                  {viewMode === "bookmarks"
                    ? "You haven't bookmarked anything yet."
                    : activeHashtag
                      ? `No posts tagged #${activeHashtag} yet.`
                      : "Nothing here yet — be the first to post."}
                </p>
              </div>
            )}

            {/* Post cards */}
            {!loading && !error && posts.length > 0 && (
              <div className="flex flex-col gap-6">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    {...post}
                    onHashtagClick={handleHashtagClick}
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
                  className="flex items-center justify-center gap-2 py-4 border border-dashed border-pulse-border rounded-lg text-pulse-muted hover:text-pulse-text hover:border-pulse-muted transition-colors w-full"
                >
                  {loadingMore ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <RefreshCw size={12} />
                  )}
                  <span className="text-[12px] font-mono uppercase tracking-[0.6px]">
                    {loadingMore ? "LOADING..." : "LOAD MORE NODES"}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Right panel: live Mock Debrief chat + Trending Tags */}
          <div className="lg:col-span-4">
            <DebriefPanel
              trending={trending}
              activeHashtag={activeHashtag}
              onHashtagClick={handleHashtagClick}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
