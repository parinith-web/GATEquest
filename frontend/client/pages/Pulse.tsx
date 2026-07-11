import { useCallback, useEffect, useRef, useState } from "react";
import {
  Flame,
  GitBranch,
  Hash,
  Users,
  Bookmark,
  ChevronDown,
  TrendingUp,
  RefreshCw,
  Cpu,
  BarChart3,
  Image as ImageIcon,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import PostCard from "@/components/PostCard";
import { useAuth } from "@/lib/auth-context";
import { fileToImageDataURL } from "@/lib/image";
import {
  ChannelCount,
  PulsePost,
  PulseSort,
  createPulsePost,
  deletePulsePost,
  fetchPulseBookmarks,
  fetchPulseChannels,
  fetchPulseFeed,
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

  // Compose box state
  const [composeText, setComposeText] = useState("");
  const [composeImage, setComposeImage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

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

  const handleImagePick = async (file: File) => {
    try {
      const dataUrl = await fileToImageDataURL(file);
      setComposeImage(dataUrl);
    } catch (err) {
      setComposeError(err instanceof Error ? err.message : "Could not attach that image");
    }
  };

  const handlePost = async () => {
    const content = composeText.trim();
    if (!content) return;
    setPosting(true);
    setComposeError(null);
    try {
      const created = await createPulsePost({
        content,
        mediaUrl: composeImage ?? undefined,
        mediaType: composeImage ? "image" : undefined,
      });
      // New post always lands at the top regardless of current sort —
      // it's the newest and (for hot/top) starts at 0 net votes, which
      // is where it'd rank anyway.
      setPosts((prev) => [created, ...prev]);
      setTotal((t) => t + 1);
      setComposeText("");
      setComposeImage(null);
      loadChannels();
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

        {/* 3 Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left panel: Channels & Tools */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            {/* Channels Card */}
            <div className="border border-pulse-border rounded-lg bg-pulse-card p-5">
              <button className="flex items-center justify-between w-full mb-3 text-left">
                <span className="text-[11px] font-mono uppercase tracking-[1px] text-pulse-dim">
                  CHANNELS
                </span>
                <ChevronDown size={11} className="text-pulse-dim" />
              </button>
              <div className="flex flex-col gap-1">
                {channels.length === 0 && (
                  <p className="text-[11px] font-mono text-pulse-dim px-3 py-2">
                    No channels yet — post something with a #hashtag.
                  </p>
                )}
                {channels.map((ch) => (
                  <button
                    key={ch.hashtag}
                    onClick={() => {
                      setViewMode("feed");
                      setActiveHashtag((current) =>
                        current === ch.hashtag ? null : ch.hashtag,
                      );
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded text-[12px] font-mono transition-colors text-left",
                      activeHashtag === ch.hashtag
                        ? "text-pulse-blue bg-pulse-blue/5 border-l-2 border-pulse-blue pl-2"
                        : "text-pulse-muted hover:text-pulse-text hover:bg-gq-card"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Hash size={12} className="text-pulse-dim flex-shrink-0" />
                      {ch.hashtag}
                    </div>
                    <span className="text-[10px] text-pulse-dim">{ch.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Tools */}
            <div className="border border-pulse-border rounded-lg bg-pulse-card p-5 flex flex-col gap-2">
              <span className="text-[11px] font-mono uppercase tracking-[1px] text-pulse-dim mb-2 block">
                TOOLS
              </span>
              <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12px] font-mono tracking-[0.8px] uppercase text-pulse-muted hover:text-pulse-text hover:bg-gq-card text-left transition-colors">
                <Users size={14} className="text-pulse-dim" />
                STUDY ROOMS
              </button>
              <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12px] font-mono tracking-[0.8px] uppercase text-pulse-muted hover:text-pulse-text hover:bg-gq-card text-left transition-colors">
                <BarChart3 size={14} className="text-pulse-dim" />
                TRENDING
              </button>
              <button
                onClick={() => setViewMode((m) => (m === "bookmarks" ? "feed" : "bookmarks"))}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12px] font-mono tracking-[0.8px] uppercase text-left transition-colors",
                  viewMode === "bookmarks"
                    ? "text-pulse-blue bg-pulse-blue/5"
                    : "text-pulse-muted hover:text-pulse-text hover:bg-gq-card",
                )}
              >
                <Bookmark
                  size={14}
                  className={viewMode === "bookmarks" ? "text-pulse-blue" : "text-pulse-dim"}
                />
                BOOKMARKS
              </button>
            </div>
          </div>

          {/* Center panel: Feed column */}
          <div className="lg:col-span-9 flex flex-col gap-6">
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

                {composeImage && (
                  <div className="relative w-fit">
                    <img
                      src={composeImage}
                      alt=""
                      className="max-h-[200px] rounded-md border border-pulse-border"
                    />
                    <button
                      onClick={() => setComposeImage(null)}
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
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImagePick(file);
                        e.target.value = "";
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-pulse-muted hover:text-pulse-blue hover:bg-pulse-blue/5 transition-colors"
                      title="Attach an image"
                    >
                      <ImageIcon size={14} />
                      <span className="text-[11px] font-mono uppercase tracking-[0.5px]">
                        IMAGE
                      </span>
                    </button>
                    <span className="text-[10px] font-mono text-pulse-dim">
                      {composeText.length}/2000 · use #hashtags to tag a channel
                    </span>
                  </div>
                  <button
                    onClick={handlePost}
                    disabled={!composeText.trim() || posting}
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-[0.6px] transition-colors",
                      composeText.trim() && !posting
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

              {/* Total nodes */}
              <div className="px-2 py-1 rounded-sm border border-pulse-border bg-pulse-card">
                <span className="text-[12px] font-mono text-pulse-muted">
                  {viewMode === "bookmarks" ? "Saved" : "Total Nodes"}: {total.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Feed states */}
            {loading && (
              <div className="flex items-center justify-center gap-2 py-16 text-pulse-muted">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-[12px] font-mono uppercase tracking-[0.5px]">
                  {viewMode === "bookmarks" ? "Loading bookmarks..." : "Loading feed..."}
                </span>
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

            {/* Load More */}
            {!loading && !error && hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center justify-center gap-2 py-4 border border-dashed border-pulse-border rounded-lg text-pulse-muted hover:text-pulse-text hover:border-pulse-muted transition-colors"
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
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
