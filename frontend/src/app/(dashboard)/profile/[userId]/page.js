'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import PostCard from '@/components/features/posts/PostCard'
import {
  getUserProfile,
  followUser,
  unfollowUser,
  getUserPosts,
  getUserFollowers,
  getUserFollowing,
  getCurrentUser,
} from '@/lib/apiClient'

const TABS = [
  { id: 'posts', label: 'Posts' },
  { id: 'followers', label: 'Followers' },
  { id: 'following', label: 'Following' },
]

function normalizeUsers(data, key) {
  const users = data?.[key] || data || []
  return Array.isArray(users) ? users : []
}

function UserList({ users, emptyMessage, type, onFollow, onUnfollow, actionUserId }) {
  if (!users.length) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white py-12 text-center shadow-sm">
        <p className="text-sm font-medium text-gray-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      {users.map((user) => {
        const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
        const username = user.username || user.nickname || displayName || 'Network Peer'
        const isFollowing = user.isFollowing ?? user.is_following ?? false
        const isBusy = actionUserId === user.id

        return (
          <div
            key={user.id}
            className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 transition last:border-b-0 hover:bg-gray-50"
          >
            <Link href={`/profile/${user.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar src={user.avatar_url} name={displayName || username} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {displayName || username}
                </p>
                <p className="truncate text-xs text-gray-500">@{username}</p>
              </div>
            </Link>

            {type === 'followers' && !isFollowing && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onFollow(user)}
                className="shrink-0 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBusy ? 'Following...' : 'Follow back'}
              </button>
            )}

            {type === 'following' && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onUnfollow(user)}
                className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBusy ? 'Unfollowing...' : 'Unfollow'}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function ProfilePage() {
  const { userId } = useParams()
  const router = useRouter()
  const [profileUser, setProfileUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingAction, setLoadingAction] = useState(false)
  const [activeTab, setActiveTab] = useState('posts')
  const [posts, setPosts] = useState([])
  const [followers, setFollowers] = useState([])
  const [following, setFollowing] = useState([])
  const [currentUserId, setCurrentUserId] = useState('')
  const [actionUserId, setActionUserId] = useState('')
  const [tabError, setTabError] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const meData = await getCurrentUser()
        setCurrentUserId(meData.id || meData.user_id)

        const data = await getUserProfile(userId)
        const userPayload = data.user || data
        const isLocked = userPayload.locked === true

        const normalizedUser = {
          ...userPayload,
          followersCount: userPayload.followersCount ?? userPayload.followers_count ?? 0,
          followingCount: userPayload.followingCount ?? userPayload.following_count ?? 0,
          isFollowing: userPayload.isFollowing ?? userPayload.is_following ?? false,
          isRequested: userPayload.isRequested ?? userPayload.is_requested ?? false,
          isPrivate: !userPayload.is_public,
          isOwner: userPayload.is_owner ?? userPayload.isOwner ?? false,
          email: userPayload.email,
          dateOfBirth: userPayload.date_of_birth,
        }

        setProfileUser(normalizedUser)

        if (!isLocked) {
          const [postsData, followersData, followingData] = await Promise.all([
            getUserPosts(userId),
            getUserFollowers(userId),
            getUserFollowing(userId),
          ])

          const profilePosts = postsData?.posts || postsData || []
          const followerUsers = normalizeUsers(followersData, 'followers')
          const followingUsers = normalizeUsers(followingData, 'following')

          setPosts(Array.isArray(profilePosts) ? profilePosts : [])
          setFollowers(followerUsers)
          setFollowing(followingUsers)
        }
      } catch (err) {
        console.error("Sync payload error:", err.message)
      } finally {
        setLoading(false)
      }
    }

    if (userId) fetchProfile()
  }, [userId])

  const handleFollowAction = async () => {
    if (loadingAction) return
    try {
      setLoadingAction(true)
      if (profileUser.isFollowing) {
        await unfollowUser(userId)
        setProfileUser((prev) => ({
          ...prev,
          isFollowing: false,
          followersCount: Math.max(0, prev.followersCount - 1),
        }))
        if (profileUser.isPrivate) {
          setProfileUser(prev => ({ ...prev, locked: true }))
          setPosts([])
          setFollowers([])
          setFollowing([])
        }
      } else {
        await followUser(userId)
        setProfileUser((prev) => ({
          ...prev,
          isFollowing: true,
          followersCount: prev.followersCount + 1,
        }))
        
        const data = await getUserProfile(userId)
        const userPayload = data.user || data
        const isLocked = userPayload.locked === true
        
        if (!isLocked) {
          setProfileUser(prev => ({ ...prev, locked: false }))
          const [postsData, followersData, followingData] = await Promise.all([
            getUserPosts(userId),
            getUserFollowers(userId),
            getUserFollowing(userId),
          ])
          setPosts(postsData?.posts || postsData || [])
          setFollowers(normalizeUsers(followersData, 'followers'))
          setFollowing(normalizeUsers(followingData, 'following'))
        }
      }
    } catch (err) {
      console.error(err.message)
    } finally {
      setLoadingAction(false)
    }
  }

  const handleFollowFromList = async (user) => {
    if (!user?.id || actionUserId) return
    setActionUserId(user.id)
    try {
      await followUser(user.id)
      setFollowers((prev) =>
        prev.map((item) =>
          item.id === user.id ? { ...item, isFollowing: true, is_following: true } : item
        )
      )
      setFollowing((prev) => {
        if (prev.some((item) => item.id === user.id)) return prev
        return [{ ...user, isFollowing: true, is_following: true }, ...prev]
      })
    } catch (err) {
      console.error(err)
    } finally {
      setActionUserId('')
    }
  }

  const handleUnfollowFromList = async (user) => {
    if (!user?.id || actionUserId) return
    setActionUserId(user.id)
    try {
      await unfollowUser(user.id)
      setFollowing((prev) => prev.filter((item) => item.id !== user.id))
      setFollowers((prev) =>
        prev.map((item) =>
          item.id === user.id ? { ...item, isFollowing: false, is_following: false } : item
        )
      )
    } catch (err) {
      console.error(err)
    } finally {
      setActionUserId('')
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <div className="h-32 animate-pulse rounded-2xl bg-gray-200" />
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 animate-pulse rounded-full bg-gray-200" />
          <div className="space-y-2">
            <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </div>
    )
  }

  if (!profileUser) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center text-gray-500">
        Profile entry could not be located.
      </div>
    )
  }

  const displayName = [profileUser.first_name, profileUser.last_name].filter(Boolean).join(' ').trim()
  const username = profileUser.nickname || profileUser.username || displayName || 'Network Peer'

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
              src={profileUser.avatar_url}
              alt={username}
              fallback={username[0]?.toUpperCase()}
              size="xl"
              className="h-24 w-24 border-4 border-white shadow-lg sm:h-28 sm:w-28 bg-white"
            />
            {profileUser.isPrivate && (
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-xs text-white" title="Private Profile">
                🔒
              </span>
            )}
          </div>
          <div className="mt-4 flex-1 text-center sm:mt-0 sm:text-left">
            <h1 className="text-2xl font-bold text-gray-900">{displayName || username}</h1>
            <p className="text-sm text-gray-500">@{username}</p>
          </div>
          {profileUser.isOwner ? (
            <Link
              href="/profile"
              className="mt-4 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 sm:mt-0"
            >
              Edit My Profile
            </Link>
          ) : (
            <button
              type="button"
              disabled={loadingAction}
              onClick={handleFollowAction}
              className={`mt-4 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition duration-200 active:scale-95 sm:mt-0 ${
                profileUser.isFollowing
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30'
              }`}
            >
              {loadingAction ? '...' : profileUser.isFollowing ? 'Unfollow' : 'Follow'}
            </button>
          )}
        </div>

        {/* Bio */}
        {profileUser.about_me && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-900">About</h3>
            <p className="mt-1 text-sm text-gray-600">{profileUser.about_me}</p>
          </div>
        )}

        {/* User Information details (only visible if profile is not locked) */}
        {!profileUser.locked && (
          <div className="mt-6 border-t border-gray-100 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="block font-semibold text-gray-900">Email Address</span>
              <span className="text-gray-600">{profileUser.email || 'Not specified'}</span>
            </div>
            <div>
              <span className="block font-semibold text-gray-900">Date of Birth</span>
              <span className="text-gray-600">{profileUser.dateOfBirth || 'Not specified'}</span>
            </div>
          </div>
        )}
      </div>

      {profileUser.locked ? (
        <div className="text-center py-12 rounded-2xl border border-gray-100 bg-white shadow-sm p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-3 text-xl">🔒</div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">This Profile is Private</h3>
          <p className="text-sm text-gray-500">Follow @{username} to see their posts, followers, and full information.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 rounded-2xl border border-gray-100 bg-white p-1 shadow-sm">
            {TABS.map((tab) => {
              const count =
                tab.id === 'posts'
                  ? posts.length
                  : tab.id === 'followers'
                    ? profileUser.followersCount || followers.length
                    : profileUser.followingCount || following.length

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={activeTab === tab.id ? 'ml-2 text-blue-100' : 'ml-2 text-gray-400'}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {tabError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              {tabError}
            </div>
          )}

          {activeTab === 'posts' && (
            <div className="space-y-4">
              {posts.length ? (
                posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={currentUserId}
                  />
                ))
              ) : (
                <div className="rounded-2xl border border-gray-100 bg-white py-12 text-center shadow-sm">
                  <p className="text-sm font-medium text-gray-500">
                    No posts shared yet.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'followers' && (
            <UserList
              users={followers}
              emptyMessage="No followers yet."
              type="followers"
              onFollow={handleFollowFromList}
              actionUserId={actionUserId}
            />
          )}

          {activeTab === 'following' && (
            <UserList
              users={following}
              emptyMessage="Not following anyone yet."
              type="following"
              onUnfollow={handleUnfollowFromList}
              actionUserId={actionUserId}
            />
          )}
        </div>
      )}
    </div>
  )
}
