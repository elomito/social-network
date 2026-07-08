'use client'

import React, { useEffect, useState, use } from 'react'
import GroupHeader from '../../../../components/features/groups/GroupHeader.js'
import EventCard from '../../../../components/features/groups/EventCard'
import {
  getGroup,
  getCurrentUser,
  TODO_BACKEND_getGroupMembers,
  TODO_BACKEND_getGroupInvitations,
  TODO_BACKEND_getGroupJoinRequests,
  getGroupEvents,
  leaveGroup,
  requestToJoinGroup,
  inviteToGroup,
  TODO_BACKEND_respondToGroupInvitation,
  TODO_BACKEND_respondToJoinRequest,
  createEvent,
  respondToEvent,
  TODO_BACKEND_getGroupPosts,
  TODO_BACKEND_createGroupPost,
  createComment,
  updateGroup,
  uploadImage,
  getDiscoverUsers,
} from '@/lib/apiClient'

export default function GroupPage({ params }) {
  const { groupId } = use(params)
  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [joinRequests, setJoinRequests] = useState([])
  const [isMember, setIsMember] = useState(false)
  const [isCreator, setIsCreator] = useState(false)
  const [posts, setPosts] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteeId, setInviteeId] = useState('')
  const [discoverUsers, setDiscoverUsers] = useState([])
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [inviteSearch, setInviteSearch] = useState('')
  const [invitedUserIds, setInvitedUserIds] = useState(new Set())
  const [currentUser, setCurrentUser] = useState(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPrivacy, setEditPrivacy] = useState('public')
  const [editCoverImageId, setEditCoverImageId] = useState('')
  const [editCoverImageUrl, setEditCoverImageUrl] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const g = await getGroup(groupId)
        if (!mounted) return
        setGroup(g)
        setEditTitle(g.title || '')
        setEditDescription(g.description || '')
        setEditPrivacy(g.privacy || 'public')
        setEditCoverImageId(g.cover_image_id || '')
        setEditCoverImageUrl(g.cover_image_url || '')

        const me = await getCurrentUser()
        setCurrentUser(me)
        const isCreator = me && g && me.id === g.creator_id
        setIsCreator(isCreator)

        // Creator is always a member by default
        let membersResp = []
        try {
          membersResp = await TODO_BACKEND_getGroupMembers(groupId)
          if (!mounted) return
          setMembers(membersResp)
        } catch (err) {
          console.error('Failed to load members:', err)
        }

        const isCurrentUserMember = membersResp.some((m) => m.id === (me && me.id))
        setIsMember(isCurrentUserMember || isCreator)

        // load invitations (for invitee)
        try {
          const inv = await TODO_BACKEND_getGroupInvitations(groupId)
          if (mounted) {
            setInvitations(inv)
          }
        } catch (err) {
          console.error('Failed to load invitations:', err)
        }
        if (isCreator) {
          try {
            const reqs = await TODO_BACKEND_getGroupJoinRequests(groupId)
            if (!mounted) return
            setJoinRequests(reqs)
          } catch (err) {
            console.error('Failed to load join requests:', err)
          }
        }

        if (isCurrentUserMember || isCreator) {
          try {
            const postsResp = await TODO_BACKEND_getGroupPosts(groupId)
            setPosts(postsResp)
          } catch (err) {
            console.error('Failed to load group posts:', err)
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [groupId])

  useEffect(() => {
    let mounted = true
    async function loadEvents() {
      if (!groupId) return
      try {
        const ev = await getGroupEvents(groupId, 10, 0)
        if (mounted) {
          setEvents(ev || [])
        }
      } catch (e) {
        console.error(e)
      }
    }
    loadEvents()
    return () => {
      mounted = false
    }
  }, [groupId])

  useEffect(() => {
    if (inviteModalOpen) {
      async function loadDiscover() {
        setDiscoverLoading(true)
        try {
          const resp = await getDiscoverUsers('')
          setDiscoverUsers(resp || [])
        } catch (e) {
          console.error(e)
        } finally {
          setDiscoverLoading(false)
        }
      }
      loadDiscover()
    }
  }, [inviteModalOpen])

  const memberIds = new Set(members.map(m => m.id))
  const filteredDiscoverUsers = discoverUsers.filter(u => {
    // Exclude existing group members
    if (memberIds.has(u.id)) return false
    // Exclude group creator
    if (group && u.id === group.creator_id) return false
    // Exclude logged in user
    if (currentUser && u.id === currentUser.id) return false
    // Filter by search string
    if (inviteSearch) {
      const q = inviteSearch.toLowerCase()
      return (u.fullName && u.fullName.toLowerCase().includes(q)) || (u.username && u.username.toLowerCase().includes(q))
    }
    return true
  })

  async function handleInviteUser(userId) {
    try {
      await inviteToGroup(groupId, userId)
      setInvitedUserIds(prev => {
        const newSet = new Set(prev)
        newSet.add(userId)
        return newSet
      })
    } catch (e) {
      console.error(e)
      alert(e?.response?.data?.error || e?.message || 'Failed to send invite')
    }
  }

  async function handleJoinToggle() {
    try {
      if (!isMember) {
        await requestToJoinGroup(groupId)
      } else {
        await leaveGroup(groupId)
      }
      const g = await getGroup(groupId)
      setGroup(g)
      setIsMember(g.is_member || isCreator)
      try {
        const membersResp = await TODO_BACKEND_getGroupMembers(groupId)
        setMembers(membersResp)
      } catch (err) {
        console.error('Failed to load members:', err)
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function openInviteModal() {
    setInviteModalOpen(true)
  }

  async function sendInvite() {
    try {
      await inviteToGroup(groupId, inviteeId)
      const inv = await TODO_BACKEND_getGroupInvitations(groupId)
      setInvitations(inv)
      setInviteModalOpen(false)
      setInviteeId('')
    } catch (e) {
      console.error(e)
      alert('Failed to send invite')
    }
  }

  async function handleRespondInvite(invitationId, accept) {
    try {
      await TODO_BACKEND_respondToGroupInvitation(groupId, invitationId, accept)
      const inv = await TODO_BACKEND_getGroupInvitations(groupId)
      setInvitations(inv)
      // refresh members if accepted
      if (accept) {
        const membersResp = await TODO_BACKEND_getGroupMembers(groupId)
        setMembers(membersResp)
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function handleRespondJoinRequest(requestId, approve) {
    try {
      await TODO_BACKEND_respondToJoinRequest(groupId, requestId, approve)
      const reqs = await TODO_BACKEND_getGroupJoinRequests(groupId)
      setJoinRequests(reqs)
      if (approve) {
        const membersResp = await TODO_BACKEND_getGroupMembers(groupId)
        setMembers(membersResp)
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function handleCreateEvent({ title, description, start_time }) {
    try {
      await createEvent({
        group_id: groupId,
        title,
        description,
        date_time: start_time,
      })
      // reload events
      const ev = await getGroupEvents(groupId, 10, 0)
      setEvents(ev || [])
    } catch (e) {
      console.error(e)
      alert(e?.response?.data?.error || e?.message || 'Failed to create event')
    }
  }

  async function handleRSVP(eventId, status) {
    try {
      await respondToEvent(eventId, status)
      const ev = await getGroupEvents(groupId, 10, 0)
      setEvents(ev || [])
    } catch (e) {
      console.error(e)
      alert('Failed to submit RSVP')
    }
  }

  async function handleUpdateGroup(e) {
    e.preventDefault()
    try {
      await updateGroup(groupId, {
        title: editTitle,
        description: editDescription,
        privacy: editPrivacy,
        cover_image_id: editCoverImageId || undefined,
      })
      const g = await getGroup(groupId)
      setGroup(g)
      setEditModalOpen(false)
    } catch (err) {
      console.error(err)
      alert('Failed to update group')
    }
  }

  async function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const resp = await uploadImage(file)
      setEditCoverImageId(resp.id)
      setEditCoverImageUrl(resp.image_url)
    } catch (err) {
      console.error(err)
      alert('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  if (loading) return <div className="p-6">Loading...</div>

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
            join_request_status: group.join_request_status,
          }}
          isMember={isMember}
          onJoinToggle={handleJoinToggle}
          onInvite={openInviteModal}
          isCreator={isCreator}
          onEdit={() => setEditModalOpen(true)}
        />

        <section className="mb-6 rounded-lg bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-semibold">Members</h2>
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
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const content = e.target.elements.content.value
                    if (!content) return
                    try {
                      await TODO_BACKEND_createGroupPost(groupId, content)
                      const postsResp = await TODO_BACKEND_getGroupPosts(groupId)
                      setPosts(postsResp)
                      e.target.reset()
                    } catch (err) {
                      console.error(err)
                    }
                  }}
                >
                  <textarea
                    name="content"
                    className="mb-3 w-full rounded border p-2"
                    rows="3"
                    placeholder="Share something with the group..."
                  ></textarea>
                  <div className="text-right">
                    <button className="rounded bg-blue-600 px-4 py-2 text-white">Post</button>
                  </div>
                </form>
              </div>

              <div className="space-y-4">
                {posts.map((p) => (
                  <article key={p.id} className="rounded-lg bg-white p-4 shadow">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm text-gray-500">
                        {p.author && p.author.name ? p.author.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">
                              {p.author ? p.author.name : 'Unknown'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(p.created_at).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">{p.likes || 0} Likes</div>
                        </div>

                        <div className="mt-3 text-sm text-gray-800">{p.content}</div>

                        <div className="mt-3 flex items-center gap-3 text-sm text-gray-600">
                          <button className="hover:text-blue-600">Like</button>
                          <button className="hover:text-blue-600">Comment</button>
                          <button className="hover:text-blue-600">Share</button>
                        </div>

                        {p.comments && p.comments.length > 0 && (
                          <div className="mt-3 border-t pt-3">
                            {p.comments.map((c) => (
                              <div key={c.id} className="py-2 text-sm">
                                <span className="font-medium">
                                  {c.author ? c.author.name : 'Unknown'}:
                                </span>{' '}
                                {c.content}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* comment form */}
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault()
                            const content = e.target.elements.content.value
                            if (!content) return
                            try {
                              await createComment(p.id, { content })
                              const postsResp = await TODO_BACKEND_getGroupPosts(groupId)
                              setPosts(postsResp)
                              e.target.reset()
                            } catch (err) {
                              console.error(err)
                            }
                          }}
                          className="mt-3"
                        >
                          <input
                            name="content"
                            className="w-full rounded border p-2"
                            placeholder="Write a comment..."
                          />
                        </form>
                      </div>
                    </div>
                  </article>
                ))}

                {posts.length === 0 && <div className="text-gray-500">No posts yet.</div>}
              </div>
            </div>
          )}
        </section>
      </main>

      <aside className="w-80">
        <div className="mb-4 rounded-lg bg-white p-4 shadow">
          <h3 className="text-md mb-2 font-semibold">Events</h3>
          {isMember ? (
            <div>
              {events.map((event) => (
                <div key={event.id} className="mb-3">
                  <EventCard event={event} onRSVP={(status) => handleRSVP(event.id, status)} />
                </div>
              ))}

              <div className="mb-2 text-right">
                <button className="text-sm text-blue-600">View Events →</button>
              </div>

              <div className="rounded border p-3">
                <h4 className="mb-2 font-semibold">Create Event</h4>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const title = e.target.elements.title.value
                    const description = e.target.elements.description.value
                    const start_time = e.target.elements.start_time.value
                    if (!title || !start_time) return
                    await handleCreateEvent({ title, description, start_time })
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

        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="text-md mb-2 font-semibold">About</h3>
          <p className="text-sm text-gray-600">{group.description}</p>
        </div>

        {inviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900">Invite a user</h3>
                <p className="text-sm text-gray-500">Search and invite users not currently in the group.</p>
              </div>

              <input
                type="text"
                value={inviteSearch}
                onChange={(e) => setInviteSearch(e.target.value)}
                placeholder="Search by name or username..."
                className="mb-4 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />

              <div className="max-h-60 overflow-y-auto space-y-2 mb-6 pr-1">
                {discoverLoading ? (
                  <p className="text-sm text-gray-500 text-center py-4">Loading users...</p>
                ) : filteredDiscoverUsers.length > 0 ? (
                  filteredDiscoverUsers.map((u) => {
                    const isAlreadyInvited = invitedUserIds.has(u.id);
                    return (
                      <div key={u.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold">
                            {u.fullName ? u.fullName.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{u.fullName}</div>
                            <div className="text-xs text-gray-500">@{u.username}</div>
                          </div>
                        </div>
                        <button
                          disabled={isAlreadyInvited}
                          onClick={() => handleInviteUser(u.id)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                            isAlreadyInvited
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                          }`}
                        >
                          {isAlreadyInvited ? 'Invited' : 'Invite'}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No users found to invite.</p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    setInviteSearch('')
                    setInviteModalOpen(false)
                  }}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {invitations.length > 0 && (
          <div className="mt-4 rounded-lg bg-white p-4 shadow">
            <h4 className="mb-2 font-semibold">Invitations</h4>
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between border-b p-2">
                <div>
                  <div className="text-sm font-medium">
                    {inv.inviter && inv.inviter.name ? inv.inviter.name : 'Someone'} invited you
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
          <div className="mt-4 rounded-lg bg-white p-4 shadow">
            <h4 className="mb-2 font-semibold">Join Requests</h4>
            {joinRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between border-b p-2">
                <div>
                  <div className="text-sm font-medium">
                    {req.user && req.user.name ? req.user.name : 'Someone'} requested to join
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

      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Edit Group Details</h2>
              <p className="mt-1 text-sm text-gray-500">Update your group's details and aesthetics.</p>
            </div>

            <form onSubmit={handleUpdateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Group Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Group Title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Privacy</label>
                <select
                  value={editPrivacy}
                  onChange={(e) => setEditPrivacy(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cover Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="mt-1.5 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {uploadingImage && <p className="mt-1 text-xs text-gray-500">Uploading image...</p>}
                {editCoverImageUrl && (
                  <div className="mt-2 relative h-32 w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={editCoverImageUrl} alt="Cover preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setEditCoverImageId('')
                        setEditCoverImageUrl('')
                      }}
                      className="absolute right-2 top-2 rounded-full bg-red-600 p-1.5 text-white hover:bg-red-700 transition"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditTitle(group.title || '')
                    setEditDescription(group.description || '')
                    setEditPrivacy(group.privacy || 'public')
                    setEditCoverImageId(group.cover_image_id || '')
                    setEditCoverImageUrl(group.cover_image_url || '')
                    setEditModalOpen(false)
                  }}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingImage}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
