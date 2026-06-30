'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import FollowButton from '@/components/features/followers/FollowButton'
import Avatar from '@/components/ui/Avatar'

export default function UserProfilePage() {
  const params = useParams()
  const userId = params.userId
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        const meResponse = await fetch('/api/auth/me', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        if (!meResponse.ok) {
          window.location.href = '/auth/login'
          return
        }

        const meData = await meResponse.json()
        setCurrentUserId(meData.user_id)

        const response = await fetch(`/api/users?id=${userId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        if (!response.ok) throw new Error('Failed to load profile')
        const data = await response.json()

        setProfile({
          id: data.id,
          username: data.nickname || `${data.first_name} ${data.last_name}`,
          fullName: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
          isPrivate: !data.is_public,
          followingCount: 0,
          followersCount: 0,
          isFollowing: false,
          isOwner: false,
          firstName: data.first_name,
          lastName: data.last_name,
          nickname: data.nickname,
          aboutMe: data.about_me,
          isPublic: data.is_public,
        })
      } catch (err) {
        console.error(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchData()
    }
  }, [userId])

  const handleStateChange = (updatedState) => {
    setProfile(updatedState)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <div className="h-32 rounded-2xl bg-gray-200 animate-pulse" />
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-gray-200 animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-32 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center text-gray-500">Profile not found.</div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      {/* Cover Photo */}
      <div className="relative h-32 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 sm:h-40">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-30" />
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/10" />
      </div>

      {/* Profile Info Card */}
      <div className="relative -mt-16 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center sm:flex-row sm:items-end sm:gap-6">
          <div className="relative -mt-16 sm:-mt-20">
            <Avatar
              src={null}
              alt={profile.username}
              fallback={profile.username[0]?.toUpperCase()}
              size="xl"
              className="h-24 w-24 border-4 border-white shadow-lg sm:h-28 sm:w-28"
            />
            {profile.isPrivate && (
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-xs text-white">
                🔒
              </span>
            )}
          </div>
          <div className="mt-4 flex-1 text-center sm:mt-0 sm:text-left">
            <h1 className="text-2xl font-bold text-gray-900">{profile.username}</h1>
            <p className="text-sm text-gray-500">{profile.fullName || 'Network Peer'}</p>
          </div>
          {currentUserId && (
            <FollowButton
              targetUser={profile}
              currentUserId={currentUserId}
              onStateChange={handleStateChange}
            />
          )}
        </div>

        {/* Stats */}
        <div className="mt-6 flex justify-center gap-8 border-t border-gray-100 pt-6 sm:justify-start">
          <div className="text-center sm:text-left">
            <p className="text-2xl font-bold text-gray-900">{profile.followingCount || 0}</p>
            <p className="text-sm text-gray-500">Following</p>
          </div>
          <div className="text-center sm:text-left">
            <p className="text-2xl font-bold text-gray-900">{profile.followersCount || 0}</p>
            <p className="text-sm text-gray-500">Followers</p>
          </div>
        </div>

        {/* Bio */}
        {profile.aboutMe && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-900">About</h3>
            <p className="mt-1 text-sm text-gray-600">{profile.aboutMe}</p>
          </div>
        )}
      </div>
    </div>
  )
}
