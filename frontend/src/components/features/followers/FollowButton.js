'use client'

import React, { useState } from 'react'
import { followUser, unfollowUser } from '@/lib/apiClient'

export default function FollowButton({ targetUser, currentUserId, onStateChange }) {
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  if (targetUser.id === currentUserId) return null

  const handleAction = async (bypassConfirm = false) => {
    if (targetUser.isFollowing && !bypassConfirm) {
      setShowConfirm(true)
      return
    }

    setShowConfirm(false)
    setLoading(true)
    const previousState = { ...targetUser }

    let updatedState = { ...targetUser }

    if (targetUser.isFollowing) {
      updatedState.isFollowing = false
      if (updatedState.followersCount !== undefined) updatedState.followersCount -= 1
    } else if (targetUser.isRequested) {
      updatedState.isRequested = false
    } else {
      if (targetUser.isPrivate) {
        updatedState.isRequested = true
      } else {
        updatedState.isFollowing = true
        if (updatedState.followersCount !== undefined) updatedState.followersCount += 1
      }
    }

    onStateChange(updatedState)

    try {
      if (targetUser.isFollowing) {
        await unfollowUser(targetUser.id)
      } else {
        await followUser(targetUser.id)
      }
    } catch (err) {
      console.error('Rolling back relationship state adjustment:', err.message)
      onStateChange(previousState)
    } finally {
      setLoading(false)
    }
  }

  let buttonText = 'Follow'
  let buttonStyles = 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/30 hover:shadow-md hover:shadow-blue-500/40'

  if (targetUser.isFollowing) {
    if (isHovered) {
      buttonText = 'Unfollow'
      buttonStyles = 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
    } else {
      buttonText = 'Following'
      buttonStyles = 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }
  } else if (targetUser.isRequested) {
    buttonText = 'Requested'
    buttonStyles = 'bg-amber-50 text-amber-700 border border-amber-200'
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        disabled={loading}
        onClick={() => handleAction(false)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`rounded-xl px-5 py-2 text-sm font-semibold transition-all duration-200 active:scale-95 ${buttonStyles} ${loading ? 'cursor-not-allowed opacity-70' : ''}`}
      >
        {loading ? '...' : buttonText}
      </button>

      {showConfirm && (
        <div className="absolute right-0 z-50 mt-2 w-56 space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
          <p className="text-sm font-medium text-gray-900">
            Stop following @{targetUser.username}?
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleAction(true)}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
            >
              Unfollow
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
