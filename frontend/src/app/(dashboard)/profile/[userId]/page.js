'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import FollowButton from '@/components/features/followers/FollowButton'
import { getTokenFromCookie } from '@/lib/utils'

export default function ProfilePage({ params }) {
  const { userId } = params
  const [profileUser, setProfileUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = getTokenFromCookie()

        // 1. Get profile data - backend uses /api/users?id=<user-id>
        const response = await fetch(`http://localhost:8080/api/users?id=${userId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        })

        if (!response.ok) throw new Error('Failed to load profile.')
        const data = await response.json()

        // Transform backend response to match frontend expectations
        setProfileUser({
          id: data.id,
          username: data.nickname || `${data.first_name} ${data.last_name}`,
          fullName: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
          isPrivate: !data.is_public,
          followingCount: 0,
          followersCount: 0,
          isFollowing: data.is_follower,
          isOwner: data.is_owner,
        })

        // 2. Get current user ID from auth
        const meResponse = await fetch('http://localhost:8080/api/auth/me', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        if (meResponse.ok) {
          const meData = await meResponse.json()
          setCurrentUserId(meData.user_id)
        }
      } catch (err) {
        console.error(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (userId) fetchProfile()
  }, [userId])

  if (loading) {
    return (
      <div className="mx-auto mt-8 max-w-2xl animate-pulse space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <div className="h-20 w-20 rounded-full bg-gray-200"></div>
        <div className="h-4 w-1/3 rounded bg-gray-200"></div>
      </div>
    )
  }

  if (!profileUser) {
    return (
      <div className="py-12 text-center text-gray-500">Profile entry could not be located.</div>
    )
  }

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-2xl font-bold uppercase text-white">
            {profileUser.username[0]}
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
              {profileUser.username}
              {profileUser.isPrivate && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                  🔒 Private
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500">{profileUser.fullName || 'Network Peer'}</p>
          </div>
        </div>

        {/* REUSABLE FOLLOW BUTTON HANDLING STATE OPTIMISTICALLY WITH ROLLBACK */}
        <FollowButton
          targetUser={profileUser}
          currentUserId={currentUserId}
          onStateChange={(updatedState) => setProfileUser(updatedState)}
        />
      </div>

      <div className="flex space-x-6 border-b border-t border-gray-100 py-3 text-sm text-gray-600">
        <div>
          <strong className="text-gray-900">{profileUser.followingCount || 0}</strong> Following
        </div>
        <div>
          <strong className="text-gray-900">{profileUser.followersCount || 0}</strong> Followers
        </div>
      </div>
    </div>
  )
}
