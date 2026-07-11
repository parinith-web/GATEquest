import { useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/pulse-api";

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
  onHashtagClick,
  onDelete,
}: PostCardProps) {
  // Like/dislike/save/share are optimistic-only in this session — real
  // persistence (POST /api/pulse/posts/{id}/vote, etc.) lands once the
  // interactions endpoints exist. Mirrors how upvote worked before this
  // page had a backend at all, just split into like + dislike now.
  const [reaction, setReaction] = useState<"like" | "dislike" | null>(null);
  const [likes, setLikes] = useState(likeCount);
  const [dislikes, setDislikes] = useState(dislikeCount);
  const [saved, setSaved] = useState(false);
  const [shares, setShares] = useState(shareCount);
  const [copied, setCopied] = useState(false);

  const handleLike = () => {
    if (reaction === "like") {
      setReaction(null);
      setLikes((n) => n - 1);
    } else {
      if (reaction === "dislike") setDislikes((n) => n - 1);
      setReaction("like");
      setLikes((n) => n + 1);
    }
  };

  const handleDislike = () => {
    if (reaction === "dislike") {
      setReaction(null);
      setDislikes((n) => n - 1);
    } else {
      if (reaction === "like") setLikes((n) => n - 1);
      setReaction("dislike");
      setDislikes((n) => n + 1);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/pulse?post=${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setShares((n) => n + 1);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — silently ignore */
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
          <button className="flex items-center gap-1.5 text-pulse-muted hover:text-pulse-text transition-colors">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path
                d="M0 15V1.5C0 1.0875 0.146875 0.734375 0.440625 0.440625C0.734375 0.146875 1.0875 0 1.5 0H13.5C13.9125 0 14.2656 0.146875 14.5594 0.440625C14.8531 0.734375 15 1.0875 15 1.5V10.5C15 10.9125 14.8531 11.2656 14.5594 11.5594C14.2656 11.8531 13.9125 12 13.5 12H3L0 15ZM2.3625 10.5H13.5V1.5H1.5V11.3438L2.3625 10.5Z"
                fill="currentColor"
              />
            </svg>
            <span className="text-[11px] font-mono uppercase tracking-[0.55px]">
              {commentCount} REPLIES
            </span>
          </button>

          {/* Like */}
          <button
            onClick={handleLike}
            className={cn(
              "flex items-center gap-1.5 transition-colors",
              reaction === "like"
                ? "text-pulse-blue"
                : "text-pulse-dim hover:text-pulse-blue"
            )}
          >
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
              <path d="M6 2.8L1.4 7.4L0 6L6 0L12 6L10.6 7.4L6 2.8Z" fill="currentColor" />
            </svg>
            <span
              className={cn(
                "text-[12px] font-mono font-bold",
                reaction === "like" ? "text-pulse-blue" : "text-pulse-text"
              )}
            >
              {likes}
            </span>
          </button>

          {/* Dislike */}
          <button
            onClick={handleDislike}
            className={cn(
              "flex items-center gap-1.5 transition-colors",
              reaction === "dislike"
                ? "text-pulse-red"
                : "text-pulse-dim hover:text-pulse-red"
            )}
          >
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
              <path d="M6 5.2L10.6 0.6L12 2L6 8L0 2L1.4 0.6L6 5.2Z" fill="currentColor" />
            </svg>
            <span
              className={cn(
                "text-[12px] font-mono font-bold",
                reaction === "dislike" ? "text-pulse-red" : "text-pulse-text"
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
            onClick={() => setSaved((s) => !s)}
            className={cn(
              "ml-auto flex items-center gap-1.5 transition-colors",
              saved
                ? "text-pulse-blue"
                : "text-pulse-muted hover:text-pulse-text"
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
      </div>
    </article>
  );
}
