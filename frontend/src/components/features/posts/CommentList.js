// src/components/features/posts/CommentList.js
'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import Avatar from '@/components/ui/Avatar'
import { getComments, createComment, addCommentReaction, removeCommentReaction } from '@/lib/apiClient'

const INITIAL_DISPLAY_COUNT = 3
const COMMENTS_PER_PAGE = 20

function CommentItem({ comment, postId, depth = 0, onReplyAdded, onReactionChange }) {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replySubmitting, setReplySubmitting] = useState(false)
  const [replyError, setReplyError] = useState('')
  const [optimisticReaction, setOptimisticReaction] = useState(comment.userReaction || null)
  const [reactionLoading, setReactionLoading] = useState(false)

  const formattedDate =
    comment.createdAt || comment.created_at
      ? new Date(comment.createdAt || comment.created_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Just now'

  const handleReplySubmit = async (e) => {
    e.preventDefault()
    if (!replyText.trim()) return

    setReplySubmitting(true)
    setReplyError('')

    try {
      const data = await createComment(postId, {
        content: replyText.trim(),
        parent_id: comment.id,
      })

      setReplyText('')
      setShowReplyForm(false)

      if (onReplyAdded) {
        onReplyAdded(comment.id, data)
      }
    } catch (err) {
      setReplyError(err?.response?.data?.message || 'Failed to post reply')
    } finally {
      setReplySubmitting(false)
    }
  }

  const handleReaction = async (reactionType) => {
    if (reactionLoading) return

    setReactionLoading(true)
    const previousReaction = optimisticReaction

    if (optimisticReaction === reactionType) {
      setOptimisticReaction(null)
    } else {
      setOptimisticReaction(reactionType)
    }

    try {
      if (optimisticReaction === reactionType) {
        await removeCommentReaction(comment.id)
      } else {
        await addCommentReaction(comment.id, reactionType)
      }

      if (onReactionChange) {
        onReactionChange(comment.id, optimisticReaction === reactionType ? null : reactionType)
      }
    } catch (err) {
      setOptimisticReaction(previousReaction)
    } finally {
      setReactionLoading(false)
    }
  }

  return (
    <div className={`flex gap-3 ${depth > 0 ? 'ml-12 mt-4' : ''}`}>
      <Avatar
        src={comment.authorAvatar}
        alt={comment.authorName}
        fallback={comment.authorName?.[0]?.toUpperCase() || '?'}
        size={depth > 0 ? 'sm' : 'md'}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">{comment.authorName}</span>
          <span className="text-xs text-gray-400">•</span>
          <span className="text-xs text-gray-400">{formattedDate}</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{comment.content}</p>

        {/* Comment Image */}
        {comment.imageUrl && (
          <div className="mt-2">
            <img
              src={comment.imageUrl}
              alt="Comment attachment"
              className="max-h-48 rounded-xl object-cover"
            />
          </div>
        )}

        {/* Reactions */}
        <div className="mt-2 flex items-center gap-3">
          <button
            onClick={() => handleReaction('like')}
            disabled={reactionLoading}
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-all duration-200 ${
              optimisticReaction === 'like'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-500 hover:bg-gray-100 hover:text-blue-600'
            }`}
          >
            <svg
              className="h-3.5 w-3.5"
              fill={optimisticReaction === 'like' ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.083 5.058 9.083h1.051c.491 0 .937.238 1.204.612.27.375.436.851.436 1.355 0 .085-.01.17-.029.252M12 15.75c-1.148 0-2.25-.47-3.06-1.3a4.501 4.501 0 00-1.08-1.08"
              />
            </svg>
            <span>{comment.likesCount > 0 ? comment.likesCount : 'Like'}</span>
          </button>

          <button
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-blue-600"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"
              />
            </svg>
            <span>Reply</span>
          </button>
        </div>

        {/* Reply Form */}
        {showReplyForm && (
          <div className="mt-3">
            <form onSubmit={handleReplySubmit}>
              <div className="flex gap-3">
                <Avatar src={null} alt="You" fallback="U" size="sm" />
                <div className="flex-1">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    rows={2}
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    disabled={replySubmitting}
                  />

                  {replyError && (
                    <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-600">
                      {replyError}
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowReplyForm(false)
                        setReplyText('')
                        setReplyError('')
                      }}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={replySubmitting || !replyText.trim()}
                      className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/30 transition-all duration-200 hover:shadow-md hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {replySubmitting ? 'Posting...' : 'Reply'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Nested Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4 space-y-4">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                postId={postId}
                depth={depth + 1}
                onReplyAdded={onReplyAdded}
                onReactionChange={onReactionChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Build comment tree from flat list (parent comments at root, replies nested)
function buildCommentTree(comments) {
  const commentMap = new Map()
  const roots = []

  // First pass: create map of all comments with empty replies array
  comments.forEach((comment) => {
    commentMap.set(comment.id, { ...comment, replies: [] })
  })

  // Second pass: build tree
  comments.forEach((comment) => {
    const commentWithReplies = commentMap.get(comment.id)
    if (comment.parent_id) {
      const parent = commentMap.get(comment.parent_id)
      if (parent) {
        parent.replies.push(commentWithReplies)
      } else {
        // Parent not found (shouldn't happen), treat as root
        roots.push(commentWithReplies)
      }
    } else {
      roots.push(commentWithReplies)
    }
  })

  return roots
}

// Merge new comments with existing comments, avoiding duplicates
function mergeComments(existingComments, newComments) {
  const existingIds = new Set(existingComments.map((c) => c.id))
  const uniqueNewComments = newComments.filter((c) => !existingIds.has(c.id))
  return [...existingComments, ...uniqueNewComments]
}

export default function CommentList({ comments: initialComments, postId, totalCount, onCommentAdded, onReactionChange, initiallyExpanded = false }) {
  const [allComments, setAllComments] = useState(() => initialComments || [])
  const [isExpanded, setIsExpanded] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMoreComments, setHasMoreComments] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [expandAfterLoad, setExpandAfterLoad] = useState(false)
  const [allCommentsLoaded, setAllCommentsLoaded] = useState(false)
  
  // Use a ref to track the current comment count for pagination offset
  const commentCountRef = useRef(allComments.length)
  commentCountRef.current = allComments.length

  // Track previous postId to detect post changes
  const prevPostIdRef = useRef(postId)

  // Auto-load all comments when initiallyExpanded is true
  useEffect(() => {
    if (initiallyExpanded && allComments.length < (totalCount || allComments.length)) {
      const remainingCount = (totalCount || allComments.length) - allComments.length
      loadMoreComments(remainingCount)
    }
    if (initiallyExpanded) {
      setIsExpanded(true)
    }
  }, [initiallyExpanded])

  // Sync with initialComments prop changes - only reset when postId changes
  useEffect(() => {
    if (prevPostIdRef.current !== postId) {
      // Post changed, reset all state
      setAllComments(initialComments || [])
      setIsExpanded(false)
      setHasMoreComments(true)
      setLoadError('')
      prevPostIdRef.current = postId
    } else {
      // Same post, just merge any new comments without resetting expand state
      setAllComments((prev) => {
        const newComments = (initialComments || []).filter((c) => !prev.some((pc) => pc.id === c.id))
        if (newComments.length > 0) {
          return mergeComments(prev, newComments)
        }
        return prev
      })
    }
  }, [initialComments, postId])


    useEffect(() => {
    if (
      expandAfterLoad &&
      allComments.length >= effectiveTotalCount
    ) {
      setIsExpanded(true)
      setExpandAfterLoad(false)
    }
  }, [
    expandAfterLoad,
    allComments.length,
    effectiveTotalCount,
  ])

  // Determine total count: use prop if provided, otherwise use loaded count
  const effectiveTotalCount = totalCount != null ? totalCount : allComments.length

  // Rebuild tree whenever allComments change
  const commentTree = useMemo(() => buildCommentTree(allComments), [allComments])

  // Determine if we should show "View More" button
  const showViewMore = !isExpanded && (allComments.length < effectiveTotalCount || allCommentsLoaded)

  // Determine if we should show "Show Less" button
  const showShowLess = isExpanded && effectiveTotalCount > INITIAL_DISPLAY_COUNT

  const handleReplyAdded = useCallback((parentId, newReply) => {
    setAllComments((prev) => {
      if (prev.some((c) => c.id === newReply.id)) return prev
      return [...prev, newReply]
    })

    if (onCommentAdded) {
      onCommentAdded(newReply)
    }
  }, [onCommentAdded])

  const handleCommentAdded = useCallback((newComment) => {
    setAllComments((prev) => {
      if (prev.some((c) => c.id === newComment.id)) return prev
      return [newComment, ...prev]
    })
    if (onCommentAdded) {
      onCommentAdded(newComment)
    }
  }, [onCommentAdded])

  const loadMoreComments = useCallback(async (limit = COMMENTS_PER_PAGE) => {
    if (loadingMore || !hasMoreComments) return

    setLoadingMore(true)
    setLoadError('')

    try {
      // Use ref to get current comment count (avoids stale closure)
      const currentOffset = commentCountRef.current

      const newComments = await getComments(postId, { limit, offset: currentOffset })

       if (!newComments || newComments.length === 0) {
        setHasMoreComments(false)
        return
      }

      // Merge new comments with existing, avoiding duplicates
      setAllComments((prev) => {
        const merged = mergeComments(prev, newComments)
        return merged
      })

      // If we got fewer comments than requested, there are no more
      if (newComments.length < limit) {
        setHasMoreComments(false)
      }
      
      // Mark that all comments have been loaded
      setAllCommentsLoaded(true)
    } catch (err) {
      setLoadError(err?.response?.data?.message || 'Failed to load more comments')
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMoreComments, postId])

  const handleViewMore = async () => {
    // If we haven't loaded all comments yet, fetch them all at once
    if (allComments.length < effectiveTotalCount) {
      const remainingCount = effectiveTotalCount - allComments.length
      await loadMoreComments(remainingCount)
    }
    setIsExpanded(true)
    setAllCommentsLoaded(true)
  }

  const handleShowLess = () => {
    setIsExpanded(false)
  }

  // Get visible comments based on expanded state
  const visibleComments = useMemo(() => {
    if (isExpanded) {
      return commentTree
    }
    // Show only first INITIAL_DISPLAY_COUNT root comments
    return commentTree.slice(0, INITIAL_DISPLAY_COUNT)
  }, [isExpanded, commentTree])

  if (!commentTree || commentTree.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-gray-500">No comments yet. Be the first to comment!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {visibleComments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          postId={postId}
          depth={0}
          onReplyAdded={handleReplyAdded}
          onReactionChange={onReactionChange}
        />
      ))}

      {/* View More / Show Less Buttons */}
      <div className="text-center pt-4">
        {showViewMore && (
          <button
            onClick={handleViewMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-blue-600 transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading more comments...
              </>
            ) : (
              'View More Comments'
            )}
          </button>
        )}

        {showShowLess && (
          <button
            onClick={handleShowLess}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-all duration-200 hover:bg-gray-100 hover:text-gray-700"
          >
            Show Less
          </button>
        )}

        {loadError && (
          <p className="mt-2 text-sm text-red-600">{loadError}</p>
        )}
      </div>
    </div>
  )
}
