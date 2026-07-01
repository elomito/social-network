'use client'
'use client'

import React, { useState } from 'react'
import { followUser, unfollowUser } from '@/lib/apiClient'

export default function FollowButton({ targetUser, currentUserId, onStateChange }) {
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  if (targetUser.id === currentUserId) return null
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  if (targetUser.id === currentUserId) return null

  async function handleAction(bypassConfirm = false) {
    if (targetUser.isFollowing && !bypassConfirm) {
      setShowConfirm(true)
      return
      setShowConfirm(true)
      return
    }

    setShowConfirm(false)
    setLoading(true)

    const previousState = { ...targetUser }
    let updatedState = { ...targetUser }

    try {
      if (targetUser.isFollowing) {
        // unfollow
        updatedState.isFollowing = false
        if (updatedState.followersCount !== undefined) updatedState.followersCount -= 1
        onStateChange(updatedState)
        await unfollowUser(targetUser.id)
      } else if (targetUser.isRequested) {
        // cancel a pending request — the backend has one "remove the
        // relationship" route (DELETE /api/follow/:id) for both unfollow
        // and cancel-request.
        updatedState.isRequested = false
        onStateChange(updatedState)
        await unfollowUser(targetUser.id)
      } else {
        // follow (or request to follow, if private)
        if (targetUser.isPrivate) {
          updatedState.isRequested = true
        } else {
          updatedState.isFollowing = true
          if (updatedState.followersCount !== undefined) updatedState.followersCount += 1
        }
        onStateChange(updatedState)
        await followUser(targetUser.id)
      }
    } catch (err) {
      console.error('Rolling back relationship state change:', err?.response?.data || err)
      onStateChange(previousState)
    } finally {
      setLoading(false)
      setLoading(false)
    }
  }

  let buttonText = 'Follow'
  let buttonStyles = 'bg-blue-600 text-white hover:bg-blue-700'

  if (targetUser.isFollowing) {
    if (isHovered) {
      buttonText = 'Unfollow'
      buttonStyles = 'bg-red-100 text-red-700 border border-red-200'
    } else {
      buttonText = 'Following'
      buttonStyles = 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      buttonText = 'Following'
      buttonStyles = 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }
  } else if (targetUser.isRequested) {
    buttonText = 'Requested'
    buttonStyles = 'bg-amber-100 text-amber-800 border border-amber-200'
  }

  return (

  return (
    <div className="relative inline-block">
      <button
        type="button"
        disabled={loading}
        onClick={() => handleAction(false)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`rounded-lg px-3.5 py-1.5 text-xs font-bold shadow-sm transition-all ${buttonStyles} ${
          loading ? 'cursor-not-allowed opacity-70' : ''
        }`}
      >
        {loading ? '...' : buttonText}
      </button>

      {showConfirm && (
        <div className="absolute right-0 z-50 mt-2 w-48 space-y-2 rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
          <p className="text-[11px] font-medium leading-tight text-gray-600">
            Stop following @{targetUser.username}?
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="rounded bg-gray-50 px-2 py-1 text-[10px] font-semibold text-gray-500 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleAction(true)}
              className="rounded bg-red-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-700"
            >
              Unfollow
            </button>
          </div>
        </div>
      )}
    </div>
  )
  )
}