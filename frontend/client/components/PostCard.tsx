import { useState } from "react";
import {
  Trash2,
  Loader2,
  MessageCircle,
  ArrowBigUp,
  ArrowBigDown,
  Share2,
  Bookmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import {
  PulseComment,
  timeAgo,
  votePulsePost,
  bookmarkPulsePost,
  unbookmarkPulsePost,
  sharePulsePost,
  fetchPulseComments,
  createPulseComment,
  deletePulseComment,
} from "@/lib/pulse-api";

export interface PostCardProps {
  id: string;
  author: string;
  authorAvatar: string;
  content: string;
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  hashtags: string[];
  tags: string[];
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  isOwner: boolean;
  userVote: 1 | -1 | 0;
  isBookmarked: boolean;
  onHashtagClick?: (hashtag: string) => void;
  onDelete?: (id: string) => void;
}

export default function PostCard({
  id,
  author,
  authorAvatar,
  content,
  tags,
  mediaUrl,
  mediaType,
  hashtags,
  likeCount,
  dislikeCount,
  commentCount,
  shareCount,
  createdAt,
  isOwner,
  userVote,
  isBookmarked,
  onHashtagClick,
  onDelete,
}: PostCardProps) {
  const { user } = useAuth();
  const isAuthenticated = !!user;

  // Reactions and bookmark state are seeded from the post's own DTO
  // (hydrated server-side per viewer) and then updated optimistically,
  // with a rollback to the last-known-good value if the API call
  // fails — the UI should never claim something is saved when it isn't.
  const [reaction, setReaction] = useState<1 | -1 | 0>(userVote);
  const [likes, setLikes] = useState(likeCount);
  const [dislikes, setDislikes] = useState(dislikeCount);
  const [voting, setVoting] = useState(false);

  const [saved, setSaved] = useState(isBookmarked);
  const [savePending, setSavePending] = useState(false);

  const [shares, setShares] = useState(shareCount);
  const [copied, setCopied] = useState(false);

  const [comments, setComments] = useState<PulseComment[]>([]);
  const [commentTotal, setCommentTotal] = useState(commentCount);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const handleVote = async (value: 1 | -1) => {
    if (!isAuthenticated || voting) return;
    const nextReaction: 1 | -1 | 0 = reaction === value ? 0 : value;

    // Snapshot for rollback, then apply optimistically.
    const prevReaction = reaction;
    const prevLikes = likes;
    const prevDislikes = dislikes;

    let nextLikes = likes;
    let nextDislikes = dislikes;
    if (prevReaction === 1) nextLikes -= 1;
    if (prevReaction === -1) nextDislikes -= 1;
    if (nextReaction === 1) nextLikes += 1;
    if (nextReaction === -1) nextDislikes += 1;

    setReaction(nextReaction);
    setLikes(nextLikes);
    setDislikes(nextDislikes);
    setVoting(true);
    try {
      const result = await votePulsePost(id, nextReaction);
      setLikes(result.likeCount);
      setDislikes(result.dislikeCount);
      setReaction(result.userVote);
    } catch {
      setReaction(prevReaction);
      setLikes(prevLikes);
      setDislikes(prevDislikes);
    } finally {
      setVoting(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/pulse?post=${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — still record the share below */
    }
    setShares((n) => n + 1);
    try {
      const result = await sharePulsePost(id);
      setShares(result.shareCount);
    } catch {
      // Non-critical — the optimistic count already moved and a failed
      // server bump isn't worth surfacing an error for a copy-link click.
    }
  };

  const handleToggleSave = async () => {
    if (!isAuthenticated || savePending) return;
    const prevSaved = saved;
    const next = !prevSaved;
    setSaved(next);
    setSavePending(true);
    try {
      if (next) {
        await bookmarkPulsePost(id);
      } else {
        await unbookmarkPulsePost(id);
      }
    } catch {
      setSaved(prevSaved);
    } finally {
      setSavePending(false);
    }
  };

  const loadComments = async () => {
    setCommentsLoading(true);
    setCommentsError(null);
    try {
      const result = await fetchPulseComments(id);
      setComments(result.comments ?? []);
      setCommentTotal(result.total);
    } catch (err) {
      setCommentsError(
        err instanceof Error ? err.message : "Failed to load replies",
      );
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleToggleComments = () => {
    const opening = !commentsOpen;
    setCommentsOpen(opening);
    if (opening && comments.length === 0) {
      loadComments();
    }
  };

  const handlePostComment = async () => {
    const text = commentDraft.trim();
    if (!text || postingComment) return;
    setPostingComment(true);
    try {
      const created = await createPulseComment(id, text);
      setComments((prev) => [...prev, created]);
      setCommentTotal((n) => n + 1);
      setCommentDraft("");
    } catch (err) {
      setCommentsError(
        err instanceof Error ? err.message : "Failed to post reply",
      );
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const prev = comments;
    setComments((c) => c.filter((cm) => cm.id !== commentId));
    setCommentTotal((n) => Math.max(0, n - 1));
    try {
      await deletePulseComment(commentId);
    } catch (err) {
      setComments(prev);
      setCommentTotal((n) => n + 1);
      setCommentsError(
        err instanceof Error ? err.message : "Failed to delete reply",
      );
    }
  };

  // Corner badges show both #hashtags parsed from the post text and
  // personalized tags chosen separately in the compose box — same
  // badge, same spot, de-duplicated so a tag someone also typed in the
  // body (e.g. "#experience") doesn't render twice.
  const badgeTags = [...hashtags, ...tags].filter(
    (tag, i, all) => all.indexOf(tag) === i,
  );
  const primaryTag = badgeTags[0] ? `#${badgeTags[0]}` : "post";

  return (
    <article className="rounded-[10px] border border-gq-border bg-gq-card p-3 flex gap-2.5">
      <img
        src={authorAvatar}
        alt={author}
        className="h-6 w-6 shrink-0 rounded-full bg-black object-cover mt-0.5"
      />

      <div className="flex-1 min-w-0 flex flex-col gap-2">
        {/* Header: name, time, tag badge */}
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-gq-text">{author}</span>
          <span className="text-[11.5px] text-gq-text-muted">· {timeAgo(createdAt)}</span>

          <div className="ml-auto flex items-center gap-1.5">
            {badgeTags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap justify-end">
                {badgeTags.map((tag) => {
                  // Only tags actually parsed out of the post's own text
                  // are a real channel to filter by — a personalized tag
                  // that isn't also in the body has nothing to jump to,
                  // so it renders as a plain (non-clickable) label.
                  const isChannel = hashtags.includes(tag);
                  const className =
                    "rounded-[4px] bg-gq-blue/15 px-1.5 py-[3px] text-[10.5px] font-medium uppercase tracking-[0.04em] text-gq-blue transition-colors";
                  return isChannel ? (
                    <button
                      key={tag}
                      onClick={() => onHashtagClick?.(tag)}
                      className={cn(className, "hover:bg-gq-blue/25")}
                    >
                      #{tag}
                    </button>
                  ) : (
                    <span key={tag} className={className}>
                      #{tag}
                    </span>
                  );
                })}
              </div>
            )}
            {isOwner && onDelete && (
              <button
                onClick={() => onDelete(id)}
                title="Delete post"
                className="text-gq-text-muted hover:text-pulse-red transition-colors"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <p className="text-[14px] leading-[1.55] text-gq-text-secondary whitespace-pre-wrap">
          {content}
        </p>

        {/* Attached media */}
        {mediaUrl && mediaType === "image" && (
          <img
            src={mediaUrl}
            alt=""
            className="w-full max-h-[420px] object-cover rounded-[8px] border border-gq-border"
          />
        )}
        {mediaUrl && mediaType === "video" && (
          <video
            src={mediaUrl}
            controls
            className="w-full max-h-[420px] rounded-[8px] border border-gq-border"
          />
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-1 text-[11.5px] text-gq-text-muted flex-wrap">
          {/* Like (upvote) */}
          <button
            onClick={() => handleVote(1)}
            disabled={!isAuthenticated || voting}
            title={isAuthenticated ? undefined : "Log in to react"}
            className={cn(
              "flex items-center gap-1 transition-colors",
              reaction === 1 ? "text-gq-blue" : "hover:text-gq-blue",
              !isAuthenticated && "cursor-not-allowed opacity-70",
            )}
          >
            <ArrowBigUp size={12} strokeWidth={2} />
            {likes}
          </button>

          {/* Dislike */}
          <button
            onClick={() => handleVote(-1)}
            disabled={!isAuthenticated || voting}
            title={isAuthenticated ? undefined : "Log in to react"}
            className={cn(
              "flex items-center gap-1 transition-colors",
              reaction === -1 ? "text-pulse-red" : "hover:text-pulse-red",
              !isAuthenticated && "cursor-not-allowed opacity-70",
            )}
          >
            <ArrowBigDown size={12} strokeWidth={2} />
            {dislikes}
          </button>

          {/* Replies */}
          <button
            onClick={handleToggleComments}
            className={cn(
              "flex items-center gap-1 transition-colors",
              commentsOpen ? "text-gq-blue" : "hover:text-gq-text",
            )}
          >
            <MessageCircle size={11} strokeWidth={2} />
            {commentTotal}
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1 hover:text-gq-text transition-colors"
          >
            <Share2 size={11} strokeWidth={2} />
            {copied ? "Copied" : shares > 0 ? shares : "Share"}
          </button>

          {/* Save */}
          <button
            onClick={handleToggleSave}
            disabled={!isAuthenticated || savePending}
            title={isAuthenticated ? undefined : "Log in to save posts"}
            className={cn(
              "ml-auto flex items-center gap-1 transition-colors",
              saved ? "text-gq-blue" : "hover:text-gq-text",
              !isAuthenticated && "cursor-not-allowed opacity-70",
            )}
          >
            <Bookmark size={11} strokeWidth={2} fill={saved ? "currentColor" : "none"} />
            {saved ? "Saved" : "Save"}
          </button>
        </div>

        {/* Comment thread */}
        {commentsOpen && (
          <div className="flex flex-col gap-3 pt-2.5 mt-0.5 border-t border-gq-border">
            {commentsLoading && (
              <div className="flex items-center gap-2 py-2 text-gq-text-muted">
                <Loader2 size={12} className="animate-spin" />
                <span className="text-[12.5px]">Loading replies...</span>
              </div>
            )}

            {!commentsLoading && commentsError && (
              <p className="text-[12.5px] text-pulse-red">{commentsError}</p>
            )}

            {!commentsLoading && comments.length === 0 && !commentsError && (
              <p className="text-[12.5px] text-gq-text-muted">
                No replies yet — be the first to respond.
              </p>
            )}

            {comments.length > 0 && (
              <div className="flex flex-col gap-2.5">
                {comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2">
                    <img
                      src={c.authorAvatar}
                      alt={c.author}
                      className="mt-px h-5 w-5 shrink-0 rounded-full bg-black object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-[12px] font-medium text-gq-text">
                          {c.author}
                        </span>
                        <span className="text-[10.5px] text-gq-text-muted">
                          {timeAgo(c.createdAt)}
                        </span>
                        {c.isOwner && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="ml-auto text-gq-text-muted hover:text-pulse-red transition-colors"
                            title="Delete reply"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                      <p className="text-[12.5px] leading-[1.4] text-gq-text-secondary whitespace-pre-wrap">
                        {c.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isAuthenticated ? (
              <div className="flex items-center gap-2 pt-1">
                <input
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handlePostComment();
                    }
                  }}
                  placeholder="Write a reply..."
                  maxLength={1000}
                  className="flex-1 bg-transparent border border-gq-border rounded-[6px] px-2.5 py-1.5 text-[13px] text-gq-text placeholder:text-gq-text-muted outline-none focus:border-gq-blue/40"
                />
                <button
                  onClick={handlePostComment}
                  disabled={!commentDraft.trim() || postingComment}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-[12px] font-semibold transition-colors",
                    commentDraft.trim() && !postingComment
                      ? "bg-gq-blue text-[#0E0E0E] hover:opacity-90"
                      : "bg-gq-border text-gq-text-muted cursor-not-allowed",
                  )}
                >
                  {postingComment && <Loader2 size={11} className="animate-spin" />}
                  Reply
                </button>
              </div>
            ) : (
              <p className="text-[13px] text-gq-text-muted">
                Log in to join the conversation.
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
