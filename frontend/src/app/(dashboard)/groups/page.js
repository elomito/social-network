'use client'

<<<<<<< HEAD
import React, { useEffect, useState, useCallback } from 'react'
import GroupHeader from '@/components/features/groups/GroupHeader'
import EventCard from '@/components/features/groups/EventCard'
import GroupChatPanel from '@/components/features/groups/GroupChatPanel'
import { useAuth } from '@/hooks/useAuth'
import {
  getGroup,
  requestToJoinGroup,
  leaveGroup,
  getGroupEvents,
  createEvent,
  respondToEvent,
  inviteToGroup,
  TODO_BACKEND_getGroupMembers,
  TODO_BACKEND_getGroupInvitations,
  TODO_BACKEND_respondToGroupInvitation,
  TODO_BACKEND_getGroupJoinRequests,
  TODO_BACKEND_respondToJoinRequest,
  TODO_BACKEND_getGroupPosts,
  TODO_BACKEND_createGroupPost,
} from '@/lib/apiClient'

export default function GroupPage({ params }) {
  const { groupId } = params
  const { user } = useAuth()

  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [joinRequests, setJoinRequests] = useState([])
  const [isMember, setIsMember] = useState(false)
  const [isCreator, setIsCreator] = useState(false)
  const [posts, setPosts] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteeId, setInviteeId] = useState('')

  const loadGroup = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const g = await getGroup(groupId)
      setGroup(g)
      setIsCreator(Boolean(user && g && user.id === g.creator_id))

      // Member list, invitations, and join requests are not yet supported
      // by the backend (see TODO_BACKEND_* in lib/apiClient.js). These
      // calls are wrapped so a 404 degrades to an empty list instead of
      // crashing the page.
      const membersResp = await TODO_BACKEND_getGroupMembers(groupId).catch(() => [])
      setMembers(membersResp)

      const amMember = membersResp.some((m) => m.id === user?.id)
      setIsMember(amMember)

      if (amMember) {
        const inv = await TODO_BACKEND_getGroupInvitations(groupId).catch(() => [])
        setInvitations(inv)

        const postsResp = await TODO_BACKEND_getGroupPosts(groupId).catch(() => [])
        setPosts(postsResp)
      }

      if (user && g && user.id === g.creator_id) {
        const reqs = await TODO_BACKEND_getGroupJoinRequests(groupId).catch(() => [])
        setJoinRequests(reqs)
      }

      const ev = await getGroupEvents(groupId).catch(() => [])
      setEvents(ev || [])
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load this group.')
    } finally {
      setLoading(false)
    }
  }, [groupId, user])

  useEffect(() => {
    loadGroup()
  }, [loadGroup])

  async function handleJoinToggle() {
    try {
      if (!isMember) {
        await requestToJoinGroup(groupId)
      } else {
        await leaveGroup(groupId)
      }
      await loadGroup()
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not update membership.')
    }
  }

  async function sendInvite() {
    if (!inviteeId.trim()) return
    try {
      await inviteToGroup(groupId, inviteeId.trim())
      const inv = await TODO_BACKEND_getGroupInvitations(groupId).catch(() => [])
      setInvitations(inv)
      setInviteModalOpen(false)
      setInviteeId('')
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to send invite.')
    }
  }

  async function handleRespondInvite(invitationId, accept) {
    try {
      await TODO_BACKEND_respondToGroupInvitation(groupId, invitationId, accept)
      const inv = await TODO_BACKEND_getGroupInvitations(groupId).catch(() => [])
      setInvitations(inv)
      if (accept) {
        const membersResp = await TODO_BACKEND_getGroupMembers(groupId).catch(() => [])
        setMembers(membersResp)
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to respond to invitation.')
    }
  }

  async function handleRespondJoinRequest(requestId, approve) {
    try {
      await TODO_BACKEND_respondToJoinRequest(groupId, requestId, approve)
      const reqs = await TODO_BACKEND_getGroupJoinRequests(groupId).catch(() => [])
      setJoinRequests(reqs)
      if (approve) {
        const membersResp = await TODO_BACKEND_getGroupMembers(groupId).catch(() => [])
        setMembers(membersResp)
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to respond to join request.')
    }
  }

  async function handleCreatePost(event) {
    event.preventDefault()
    const content = event.target.elements.content.value
    if (!content) return
    try {
      await TODO_BACKEND_createGroupPost(groupId, content)
      const postsResp = await TODO_BACKEND_getGroupPosts(groupId).catch(() => [])
      setPosts(postsResp)
      event.target.reset()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to post.')
    }
  }

  async function handleRSVP(eventId, status) {
    try {
      await respondToEvent(eventId, status)
      const ev = await getGroupEvents(groupId).catch(() => [])
      setEvents(ev || [])
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to RSVP.')
    }
  }

  async function handleCreateEvent({ title, description, start_time }) {
    try {
      await createEvent({ group_id: groupId, title, description, start_time })
      const ev = await getGroupEvents(groupId).catch(() => [])
      setEvents(ev || [])
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create event.')
    }
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (error && !group) return <div className="p-6 text-red-600">{error}</div>
  if (!group) return <div className="p-6">Group not found</div>

  return (
    <div className="flex gap-6 p-6">
      <main className="max-w-3xl flex-1">
        <GroupHeader
          group={{
            title: group.title,
            description: group.description,
            privacy: group.privacy || 'public',
            cover_image_url: group.cover_image_url,
            member_count: members.length,
          }}
          isMember={isMember}
          onJoinToggle={handleJoinToggle}
          onInvite={() => setInviteModalOpen(true)}
        />

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <section className="mb-6 rounded-lg bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-semibold">Members</h2>
          {members.length === 0 ? (
            <p className="text-sm text-gray-500">
              Member listing isn&apos;t available yet — this feature is waiting on a backend
              endpoint.
            </p>
          ) : (
            <div className="grid max-h-56 grid-cols-2 gap-3 overflow-y-auto">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded p-2 hover:bg-gray-50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm text-gray-500">
                    {m.name ? m.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{m.name}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {m.role === 'creator' || m.role === 'admin' ? '👑 Creator' : '👤 Member'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-6">
          {!isMember && (
            <div className="rounded border-l-4 border-yellow-400 bg-yellow-50 p-4">
              <p className="text-sm">Join this group to view discussions and participate.</p>
            </div>
          )}

          {isMember && (
            <div>
              <div className="mb-4 rounded-lg bg-white p-4 shadow">
                <form onSubmit={handleCreatePost}>
                  <textarea
                    name="content"
                    className="mb-3 w-full rounded border p-2"
                    rows="3"
                    placeholder="Share something with the group..."
                  />
                  <div className="text-right">
                    <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">
                      Post
                    </button>
                  </div>
                </form>
              </div>

              <div className="space-y-4">
                {posts.map((p) => (
                  <article key={p.id} className="rounded-lg bg-white p-4 shadow">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm text-gray-500">
                        {p.author?.name ? p.author.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{p.author?.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(p.created_at).toLocaleString()}
                        </div>
                        <div className="mt-3 text-sm text-gray-800">{p.content}</div>
                      </div>
                    </div>
                  </article>
                ))}

                {posts.length === 0 && (
                  <div className="text-gray-500">
                    Group posts aren&apos;t available yet — this feature is waiting on a backend
                    endpoint.
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      <aside className="w-80 space-y-4">
        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="text-md mb-2 font-semibold">Events</h3>
          {isMember ? (
            <div className="space-y-3">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onRSVP={(status) => handleRSVP(event.id, status)}
                />
              ))}

              {events.length === 0 && (
                <p className="text-sm text-gray-500">No events yet.</p>
              )}

              <div className="rounded border p-3">
                <h4 className="mb-2 font-semibold">Create event</h4>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const title = e.target.elements.title.value
                    const description = e.target.elements.description.value
                    const start_time = e.target.elements.start_time.value
                    if (!title || !start_time) return
                    handleCreateEvent({ title, description, start_time })
                    e.target.reset()
                  }}
                >
                  <input
                    name="title"
                    placeholder="Event title"
                    className="mb-2 w-full rounded border p-2"
                  />
                  <input
                    name="start_time"
                    type="datetime-local"
                    className="mb-2 w-full rounded border p-2"
                  />
                  <textarea
                    name="description"
                    placeholder="Description"
                    className="mb-2 w-full rounded border p-2"
                  />
                  <div className="text-right">
                    <button className="rounded bg-green-600 px-3 py-1 text-white">Create</button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Join to see events</div>
          )}
        </div>

        {isMember && <GroupChatPanel groupId={groupId} isOpen={isMember} />}

        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="text-md mb-2 font-semibold">About</h3>
          <p className="text-sm text-gray-600">{group.description}</p>
=======
import React, { useState, useEffect } from 'react'
import GroupCard from '@/components/features/groups/GroupCard'

export default function GroupsPage() {
  const [search, setSearch] = useState('')
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchGroups = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/groups?search=${encodeURIComponent(search)}`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch groups')
      const data = await response.json()
      setGroups(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [search])

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    if (!title) return
    setCreating(true)
    setError('')
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ title, description }),
      })
      if (!response.ok) {
        throw new Error('Failed to create group. Please try again.')
      }
      setTitle('')
      setDescription('')
      setCreateOpen(false)
      fetchGroups()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
          <p className="mt-1 text-sm text-gray-500">Join hubs and exchange discussions around shared interests.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-all duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-64"
            />
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition-all duration-200 hover:shadow-md hover:shadow-blue-500/40 active:scale-95"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Group
          </button>
        </div>
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="rounded-2xl border border-gray-100 bg-white shadow-sm animate-pulse"
            >
              <div className="h-32 rounded-t-2xl bg-gray-200" />
              <div className="p-4">
                <div className="h-5 w-3/4 rounded bg-gray-200" />
                <div className="mt-2 h-3 w-full rounded bg-gray-200" />
                <div className="mt-1 h-3 w-2/3 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      ) : groups.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No groups found</h3>
          <p className="mt-1 text-sm text-gray-500">Try adjusting your search or create a new group.</p>
        </div>
      )}

      {/* Create Group Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Create New Group</h2>
              <p className="mt-1 text-sm text-gray-500">Start a new community around your interests</p>
            </div>
            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Group Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="e.g. JavaScript Developers"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Describe the group purpose..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreateOpen(false)
                    setError('')
                  }}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 transition-all duration-200 hover:shadow-md hover:shadow-blue-500/40 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
>>>>>>> 3bea147bfe777202b750d7f18f2afbaa502a0ac2
        </div>

        {inviteModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40">
            <div className="w-96 rounded-lg bg-white p-4">
              <h4 className="mb-2 font-semibold">Invite a user</h4>
              <input
                value={inviteeId}
                onChange={(e) => setInviteeId(e.target.value)}
                placeholder="User ID"
                className="mb-3 w-full rounded border p-2"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setInviteModalOpen(false)}
                  className="rounded border px-3 py-1"
                >
                  Cancel
                </button>
                <button onClick={sendInvite} className="rounded bg-blue-600 px-3 py-1 text-white">
                  Send invite
                </button>
              </div>
            </div>
          </div>
        )}

        {invitations.length > 0 && (
          <div className="rounded-lg bg-white p-4 shadow">
            <h4 className="mb-2 font-semibold">Invitations</h4>
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between border-b p-2">
                <div>
                  <div className="text-sm font-medium">
                    {inv.inviter?.name || 'Someone'} invited you
                  </div>
                  <div className="text-xs text-gray-500">Status: {inv.status}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespondInvite(inv.id, true)}
                    className="rounded bg-green-600 px-2 py-1 text-white"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRespondInvite(inv.id, false)}
                    className="rounded border px-2 py-1"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isCreator && joinRequests.length > 0 && (
          <div className="rounded-lg bg-white p-4 shadow">
            <h4 className="mb-2 font-semibold">Join requests</h4>
            {joinRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between border-b p-2">
                <div>
                  <div className="text-sm font-medium">
                    {req.user?.name || 'Someone'} requested to join
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(req.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespondJoinRequest(req.id, true)}
                    className="rounded bg-green-600 px-2 py-1 text-white"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRespondJoinRequest(req.id, false)}
                    className="rounded border px-2 py-1"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  )
}