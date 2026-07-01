"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Loader2, MessageCircle, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LikeButton } from "./like-button";
import {
  COMMENT_BODY_MAX,
  isValidCommentBody,
  type CommentNode,
} from "@/lib/social/shared";
import {
  addComment,
  deleteComment,
  getCommentThread,
} from "@/app/(protected)/social/actions";

type Target = { reviewId: string } | { collectionId: string };

// ---- immutable tree helpers ------------------------------------------------

function countAll(nodes: CommentNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countAll(node.replies), 0);
}

// Insert a reply under its parent (appended, so replies stay chronological).
function insertReply(
  nodes: CommentNode[],
  parentId: string,
  reply: CommentNode,
): CommentNode[] {
  return nodes.map((node) => {
    if (node.id === parentId) {
      return {
        ...node,
        reply_count: node.reply_count + 1,
        replies: [...node.replies, reply],
      };
    }
    if (node.replies.length > 0) {
      return { ...node, replies: insertReply(node.replies, parentId, reply) };
    }
    return node;
  });
}

// Soft-deletes a node in place (clears its body, sets deleted_at) instead of
// removing it, so replies underneath stay attached to the thread.
function markDeleted(nodes: CommentNode[], id: string): CommentNode[] {
  return nodes.map((node) => {
    if (node.id === id) {
      return { ...node, body: "", deleted_at: new Date().toISOString() };
    }
    if (node.replies.length > 0) {
      return { ...node, replies: markDeleted(node.replies, id) };
    }
    return node;
  });
}

function formatRelative(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "الآن";
  const rtf = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (days < 30) return rtf.format(-days, "day");
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

/**
 * A Reddit-style nested comment thread for a review or collection: a composer
 * at the top, then comments newest-first with arbitrarily deep replies. Each
 * comment can be liked and replied to; the author can delete their own. New
 * comments/replies appear optimistically (built from the viewer's Clerk
 * session) and the total count is reported up via `onCountChange`.
 *
 * Pass `initialComments` for server-rendered surfaces (the collection page); set
 * `autoLoad` for client-only surfaces (the review modal) to fetch on mount.
 */
export function CommentThread({
  target,
  igdbId,
  initialComments,
  autoLoad = false,
  onCountChange,
}: {
  target: Target;
  igdbId?: number;
  initialComments?: CommentNode[];
  autoLoad?: boolean;
  onCountChange?: (count: number) => void;
}) {
  const { user } = useUser();
  const [comments, setComments] = useState<CommentNode[]>(
    initialComments ?? [],
  );
  const [loading, setLoading] = useState(autoLoad && !initialComments);

  // Client-only surfaces fetch the thread once on mount.
  useEffect(() => {
    if (!autoLoad || initialComments) return;
    let active = true;
    getCommentThread(target)
      .then((data) => {
        if (active) setComments(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // target is stable for the lifetime of a mounted thread.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = useMemo(() => countAll(comments), [comments]);
  useEffect(() => {
    onCountChange?.(total);
  }, [total, onCountChange]);

  const buildOptimisticNode = (
    id: string,
    created_at: string,
    body: string,
    parentId: string | null,
  ): CommentNode => ({
    id,
    body,
    created_at,
    deleted_at: null,
    user_id: user?.id ?? "",
    parent_id: parentId,
    like_count: 0,
    reply_count: 0,
    author: {
      user_id: user?.id ?? "",
      username: user?.username ?? "",
      display_name: user?.fullName ?? user?.firstName ?? "أنت",
      avatar_url: user?.imageUrl ?? null,
    },
    viewer_liked: false,
    is_own: true,
    replies: [],
  });

  const handleAdd = async (body: string, parentId: string | null) => {
    const result = await addComment({
      ...target,
      igdbId,
      parentId: parentId ?? undefined,
      body,
    });
    if (!result.ok) return result.error;

    const node = buildOptimisticNode(result.id, result.created_at, body, parentId);
    setComments((prev) =>
      parentId ? insertReply(prev, parentId, node) : [node, ...prev],
    );
    return null;
  };

  const handleDelete = (id: string) => {
    setComments((prev) => markDeleted(prev, id));
    void deleteComment(id, {
      igdbId,
      collectionId: "collectionId" in target ? target.collectionId : undefined,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
        <MessageCircle className="size-4" />
        التعليقات
        <span className="text-text-muted">({total})</span>
      </div>

      <CommentComposer
        onSubmit={(body) => handleAdd(body, null)}
        placeholder="أضف تعليقاً..."
        avatarUrl={user?.imageUrl}
        fallback={user?.firstName?.[0] ?? "ك"}
      />

      {loading ? (
        <div className="flex justify-center py-6 text-text-muted">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <p className="py-2 text-sm text-text-muted">
          لا توجد تعليقات بعد. كن أول من يعلّق.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              igdbId={igdbId}
              depth={0}
              onReply={handleAdd}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  igdbId,
  depth,
  onReply,
  onDelete,
}: {
  comment: CommentNode;
  igdbId?: number;
  depth: number;
  onReply: (body: string, parentId: string) => Promise<string | null>;
  onDelete: (id: string) => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const author = comment.author;
  const initial = author?.display_name?.[0] ?? "؟";
  const isDeleted = comment.deleted_at !== null;

  return (
    <li className={cn(depth > 0 && "border-s border-border ps-3 sm:ps-4")}>
      <div className="flex gap-2.5">
        {author ? (
          <Link href={`/profile/${author.username}`} className="shrink-0">
            <Avatar className="size-8">
              <AvatarImage
                src={author.avatar_url ?? undefined}
                alt={author.display_name}
              />
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
          </Link>
        ) : (
          <Avatar className="size-8 shrink-0">
            <AvatarFallback>؟</AvatarFallback>
          </Avatar>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-x-2 text-sm">
            {author ? (
              <Link
                href={`/profile/${author.username}`}
                className="font-semibold text-text-primary hover:underline"
              >
                {author.display_name}
              </Link>
            ) : (
              <span className="font-semibold text-text-muted">مستخدم محذوف</span>
            )}
            <span className="text-xs text-text-muted">
              {formatRelative(comment.created_at)}
            </span>
          </div>

          {isDeleted ? (
            <p className="text-sm italic leading-relaxed text-text-muted">
              (تم حذف هذا التعليق)
            </p>
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text-primary/90">
              {comment.body}
            </p>
          )}

          <div className="flex items-center gap-4 text-text-muted">
            {!isDeleted && (
              <LikeButton
                target={{ commentId: comment.id }}
                igdbId={igdbId}
                initialLiked={comment.viewer_liked}
                initialCount={comment.like_count}
                iconClassName="size-3.5"
              />
            )}
            <button
              type="button"
              onClick={() => setReplyOpen((open) => !open)}
              className="text-xs font-medium transition-colors hover:text-text-primary"
            >
              رد
            </button>
            {comment.is_own && !isDeleted && (
              <button
                type="button"
                onClick={() => onDelete(comment.id)}
                aria-label="حذف التعليق"
                className="text-text-muted transition-colors hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>

          {replyOpen && (
            <div className="mt-1">
              <CommentComposer
                autoFocus
                compact
                placeholder="اكتب رداً..."
                onSubmit={async (body) => {
                  const error = await onReply(body, comment.id);
                  if (!error) setReplyOpen(false);
                  return error;
                }}
              />
            </div>
          )}

          {comment.replies.length > 0 && (
            <ul className="mt-3 flex flex-col gap-4">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  igdbId={igdbId}
                  depth={depth + 1}
                  onReply={onReply}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}

function CommentComposer({
  onSubmit,
  placeholder,
  avatarUrl,
  fallback,
  autoFocus = false,
  compact = false,
}: {
  onSubmit: (body: string) => Promise<string | null>;
  placeholder: string;
  avatarUrl?: string | null;
  fallback?: string;
  autoFocus?: boolean;
  compact?: boolean;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const submit = () => {
    setError(null);
    if (!isValidCommentBody(body)) return;
    const value = body.trim();
    startTransition(async () => {
      const err = await onSubmit(value);
      if (err) setError(err);
      else setBody("");
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-2.5">
        {!compact && (
          <Avatar className="mt-0.5 size-8 shrink-0">
            <AvatarImage src={avatarUrl ?? undefined} alt="" />
            <AvatarFallback>{fallback ?? "ك"}</AvatarFallback>
          </Avatar>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <textarea
            ref={ref}
            value={body}
            onChange={(event) =>
              setBody(event.target.value.slice(0, COMMENT_BODY_MAX))
            }
            rows={compact ? 2 : 2}
            placeholder={placeholder}
            className="w-full resize-none rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-primary"
          />
          <div className="flex items-center justify-end gap-2">
            {error && (
              <span className="me-auto text-xs text-destructive">{error}</span>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={isPending || body.trim().length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {isPending && <Loader2 className="size-3.5 animate-spin" />}
              نشر
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
