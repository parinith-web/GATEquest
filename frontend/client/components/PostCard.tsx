import { useState } from "react";
import { Trash2, Loader2, MessageCircle } from "lucide-react";
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

  const primaryTag = hashtags[0] ? `#${hashtags[0]}` : "post";

  return (
    <article className="flex flex-col border border-pulse-border rounded-lg bg-pulse-card overflow-hidden">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-3 pt-4 pb-3">
        <div className="flex items-center gap-[8px] flex-shrink-0">
          <span className="w-[13px] h-[13px] rounded-full bg-pulse-red block flex-shrink-0" />
          <span className="w-[13px] h-[13px] rounded-full bg-pulse-yellow block flex-shrink-0" />
          <span className="w-[13px] h-[13px] rounded-full bg-pulse-green block flex-shrink-0" />
        </div>
        <span className="ml-2 text-[11px] font-jetbrains font-bold text-pulse-dim uppercase tracking-[1.2px]">
          {primaryTag}
        </span>
        {isOwner && onDelete && (
          <button
            onClick={() => onDelete(id)}
            title="Delete post"
            className="ml-auto text-pulse-dim hover:text-pulse-red transition-colors"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-4 flex flex-col gap-[7px]">
        {/* Metadata row */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-5 h-5 rounded-sm border border-pulse-border2 bg-pulse-border overflow-hidden flex-shrink-0">
            <img
              src={authorAvatar}
              alt={author}
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-[12px] font-mono font-bold text-pulse-text">
            {author}
          </span>
          <span className="text-[12px] font-mono text-pulse-muted">•</span>
          <span className="text-[12px] font-mono text-pulse-muted">
            {timeAgo(createdAt)}
          </span>
          {hashtags.length > 0 && (
            <div className="ml-auto flex items-center gap-1 flex-wrap justify-end">
              {hashtags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onHashtagClick?.(tag)}
                  className="text-[10px] font-mono text-pulse-muted px-2 py-0.5 rounded-sm border border-pulse-border2 bg-pulse-border uppercase tracking-[0.5px] hover:text-pulse-blue hover:border-pulse-blue/40 transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <p className="text-[14px] font-sans text-pulse-text leading-[1.63] whitespace-pre-wrap">
          {content}
        </p>

        {/* Attached media */}
        {mediaUrl && mediaType === "image" && (
          <img
            src={mediaUrl}
            alt=""
            className="w-full max-h-[420px] object-cover rounded-md border border-pulse-border mt-1"
          />
        )}
        {mediaUrl && mediaType === "video" && (
          <video
            src={mediaUrl}
            controls
            className="w-full max-h-[420px] rounded-md border border-pulse-border mt-1"
          />
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-3 mt-1 border-t border-pulse-border flex-wrap">
          {/* Replies */}
          <button
            onClick={handleToggleComments}
            className={cn(
              "flex items-center gap-1.5 transition-colors",
              commentsOpen
                ? "text-pulse-blue"
                : "text-pulse-muted hover:text-pulse-text",
            )}
          >
            <MessageCircle size={14} />
            <span className="text-[11px] font-mono uppercase tracking-[0.55px]">
              {commentTotal} REPLIES
            </span>
          </button>

          {/* Like */}
          <button
            onClick={() => handleVote(1)}
            disabled={!isAuthenticated || voting}
            title={isAuthenticated ? undefined : "Log in to react"}
            className={cn(
              "flex items-center gap-1.5 transition-colors",
              reaction === 1
                ? "text-pulse-blue"
                : "text-pulse-dim hover:text-pulse-blue",
              !isAuthenticated && "cursor-not-allowed opacity-70",
            )}
          >
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
              <path d="M6 2.8L1.4 7.4L0 6L6 0L12 6L10.6 7.4L6 2.8Z" fill="currentColor" />
            </svg>
            <span
              className={cn(
                "text-[12px] font-mono font-bold",
                reaction === 1 ? "text-pulse-blue" : "text-pulse-text",
              )}
            >
              {likes}
            </span>
          </button>

          {/* Dislike */}
          <button
            onClick={() => handleVote(-1)}
            disabled={!isAuthenticated || voting}
            title={isAuthenticated ? undefined : "Log in to react"}
            className={cn(
              "flex items-center gap-1.5 transition-colors",
              reaction === -1
                ? "text-pulse-red"
                : "text-pulse-dim hover:text-pulse-red",
              !isAuthenticated && "cursor-not-allowed opacity-70",
            )}
          >
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
              <path d="M6 5.2L10.6 0.6L12 2L6 8L0 2L1.4 0.6L6 5.2Z" fill="currentColor" />
            </svg>
            <span
              className={cn(
                "text-[12px] font-mono font-bold",
                reaction === -1 ? "text-pulse-red" : "text-pulse-text",
              )}
            >
              {dislikes}
            </span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-pulse-muted hover:text-pulse-text transition-colors"
          >
            <svg width="14" height="15" viewBox="0 0 14 15" fill="none">
              <path
                d="M11.25 15C10.625 15 10.0938 14.7812 9.65625 14.3438C9.21875 13.9062 9 13.375 9 12.75C9 12.675 9.01875 12.5 9.05625 12.225L3.7875 9.15C3.5875 9.3375 3.35625 9.48438 3.09375 9.59062C2.83125 9.69687 2.55 9.75 2.25 9.75C1.625 9.75 1.09375 9.53125 0.65625 9.09375C0.21875 8.65625 0 8.125 0 7.5C0 6.875 0.21875 6.34375 0.65625 5.90625C1.09375 5.46875 1.625 5.25 2.25 5.25C2.55 5.25 2.83125 5.30313 3.09375 5.40938C3.35625 5.51562 3.5875 5.6625 3.7875 5.85L9.05625 2.775C9.03125 2.6875 9.01562 2.60312 9.00937 2.52187C9.00312 2.44062 9 2.35 9 2.25C9 1.625 9.21875 1.09375 9.65625 0.65625C10.0938 0.21875 10.625 0 11.25 0C11.875 0 12.4062 0.21875 12.8438 0.65625C13.2812 1.09375 13.5 1.625 13.5 2.25C13.5 2.875 13.2812 3.40625 12.8438 3.84375C12.4062 4.28125 11.875 4.5 11.25 4.5C10.95 4.5 10.6687 4.44687 10.4062 4.34062C10.1438 4.23438 9.9125 4.0875 9.7125 3.9L4.44375 6.975C4.46875 7.0625 4.48438 7.14687 4.49062 7.22813C4.49687 7.30938 4.5 7.4 4.5 7.5C4.5 7.6 4.49687 7.69062 4.49062 7.77187C4.48438 7.85313 4.46875 7.9375 4.44375 8.025L9.7125 11.1C9.9125 10.9125 10.1438 10.7656 10.4062 10.6594C10.6687 10.5531 10.95 10.5 11.25 10.5C11.875 10.5 12.4062 10.7188 12.8438 11.1562C13.2812 11.5938 13.5 12.125 13.5 12.75C13.5 13.375 13.2812 13.9062 12.8438 14.3438C12.4062 14.7812 11.875 15 11.25 15Z"
                fill="currentColor"
              />
            </svg>
            <span className="text-[11px] font-mono uppercase tracking-[0.55px]">
              {copied ? "COPIED!" : shares > 0 ? `SHARE (${shares})` : "SHARE"}
            </span>
          </button>

          {/* Save */}
          <button
            onClick={handleToggleSave}
            disabled={!isAuthenticated || savePending}
            title={isAuthenticated ? undefined : "Log in to save posts"}
            className={cn(
              "ml-auto flex items-center gap-1.5 transition-colors",
              saved
                ? "text-pulse-blue"
                : "text-pulse-muted hover:text-pulse-text",
              !isAuthenticated && "cursor-not-allowed opacity-70",
            )}
          >
            <svg width="11" height="14" viewBox="0 0 11 14" fill="none">
              {!saved && (
                <path
                  d="M0 13.5V1.5C0 1.0875 0.146875 0.734375 0.440625 0.440625C0.734375 0.146875 1.0875 0 1.5 0H9C9.4125 0 9.76562 0.146875 10.0594 0.440625C10.3531 0.734375 10.5 1.0875 10.5 1.5V13.5L5.25 11.25L0 13.5ZM1.5 11.2125L5.25 9.6L9 11.2125V1.5H1.5V11.2125Z"
                  fill="currentColor"
                />
              )}
              {saved && (
                <path
                  d="M0 13.5V1.5C0 1.0875 0.146875 0.734375 0.440625 0.440625C0.734375 0.146875 1.0875 0 1.5 0H9C9.4125 0 9.76562 0.146875 10.0594 0.440625C10.3531 0.734375 10.5 1.0875 10.5 1.5V13.5L5.25 11.25L0 13.5Z"
                  fill="currentColor"
                />
              )}
            </svg>
            <span className="text-[11px] font-mono uppercase tracking-[0.55px]">
              {saved ? "SAVED" : "SAVE"}
            </span>
          </button>
        </div>

        {/* Comment thread */}
        {commentsOpen && (
          <div className="flex flex-col gap-3 pt-3 mt-1 border-t border-pulse-border">
            {commentsLoading && (
              <div className="flex items-center gap-2 py-3 text-pulse-muted">
                <Loader2 size={13} className="animate-spin" />
                <span className="text-[11px] font-mono uppercase tracking-[0.5px]">
                  Loading replies...
                </span>
              </div>
            )}

            {!commentsLoading && commentsError && (
              <p className="text-[11px] font-mono text-pulse-red">{commentsError}</p>
            )}

            {!commentsLoading && comments.length === 0 && !commentsError && (
              <p className="text-[11px] font-mono text-pulse-dim">
                No replies yet — be the first to respond.
              </p>
            )}

            {comments.length > 0 && (
              <div className="flex flex-col gap-3">
                {comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-sm border border-pulse-border2 bg-pulse-border overflow-hidden flex-shrink-0 mt-0.5">
                      <img
                        src={c.authorAvatar}
                        alt={c.author}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-mono font-bold text-pulse-text">
                          {c.author}
                        </span>
                        <span className="text-[10px] font-mono text-pulse-dim">
                          {timeAgo(c.createdAt)}
                        </span>
                        {c.isOwner && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="ml-auto text-pulse-dim hover:text-pulse-red transition-colors"
                            title="Delete reply"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                      <p className="text-[12.5px] font-sans text-pulse-text leading-[1.5] whitespace-pre-wrap">
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
                  className="flex-1 bg-transparent border border-pulse-border rounded-md px-2.5 py-1.5 text-[12px] font-sans text-pulse-text placeholder:text-pulse-dim outline-none focus:border-pulse-blue/40"
                />
                <button
                  onClick={handlePostComment}
                  disabled={!commentDraft.trim() || postingComment}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-[0.5px] transition-colors",
                    commentDraft.trim() && !postingComment
                      ? "bg-pulse-blue text-white hover:opacity-90"
                      : "bg-pulse-border text-pulse-dim cursor-not-allowed",
                  )}
                >
                  {postingComment && <Loader2 size={11} className="animate-spin" />}
                  Reply
                </button>
              </div>
            ) : (
              <p className="text-[11px] font-mono text-pulse-dim">
                Log in to join the conversation.
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
