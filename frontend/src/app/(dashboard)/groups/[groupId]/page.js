'use client'

import React, { useEffect, useState, use } from 'react'
import GroupHeader from '../../../../components/features/groups/GroupHeader.js'
import EventCard from '../../../../components/features/groups/EventCard'

async function fetchJSON(url) {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

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

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const g = await fetchJSON(`/api/groups/${groupId}`)
        if (!mounted) return
        setGroup(g)

        const membersResp = await getGroupMembers(groupId)
        if (!mounted) return
        setMembers(membersResp)

        const me = await getCurrentUser()
        setIsCreator(me && g && me.id === g.creator_id)

        setIsMember(membersResp.some((m) => m.id === (me && me.id)))

        // load invitations (for members) and join requests (for creator)
        if (membersResp.some((m) => m.id === (me && me.id))) {
          const inv = await getGroupInvitations(groupId)
          if (!mounted) return
          setInvitations(inv)
        }
        if (me && g && me.id === g.creator_id) {
          const reqs = await getGroupJoinRequests(groupId)
          if (!mounted) return
          setJoinRequests(reqs)
        }

        if (membersResp.some((m) => m.id === (me && me.id))) {
          const postsResp = await fetchJSON(`/api/groups/${groupId}/posts`)
          setPosts(postsResp)
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

  async function handleJoinToggle() {
    try {
      if (!isMember) {
        // request to join when group requires approval
        await requestJoinGroup(groupId)
      } else {
        await fetch(`/api/groups/${groupId}/leave`, { method: 'POST', credentials: 'include' })
      }
      // reload members
      const membersResp = await getGroupMembers(groupId)
      setMembers(membersResp)
      const me = await getCurrentUser()
      setIsMember(membersResp.some((m) => m.id === (me && me.id)))
    } catch (err) {
      console.error(err)
    }
  }

  async function openInviteModal() {
    setInviteModalOpen(true)
  }

  async function sendInvite() {
    try {
      await sendGroupInvite(groupId, inviteeId)
      const inv = await getGroupInvitations(groupId)
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
      await respondToInvite(groupId, invitationId, accept)
      const inv = await getGroupInvitations(groupId)
      setInvitations(inv)
      // refresh members if accepted
      if (accept) {
        const membersResp = await getGroupMembers(groupId)
        setMembers(membersResp)
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function handleRespondJoinRequest(requestId, approve) {
    try {
      await respondToJoinRequest(groupId, requestId, approve)
      const reqs = await getGroupJoinRequests(groupId)
      setJoinRequests(reqs)
      if (approve) {
        const membersResp = await getGroupMembers(groupId)
        setMembers(membersResp)
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function handleCreateEvent({ title, description, start_time }) {
    try {
      await fetch(`/api/groups/${groupId}/events`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, start_time }),
      })
      // reload events
      const ev = await getGroupEvents(groupId, 10, 0)
      setEvents(ev || [])
    } catch (e) {
      console.error(e)
    }
  }

  async function handleRSVP(eventId, status) {
    try {
      await fetch(`/api/events/${eventId}/responses`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: status }),
      })
    } catch (e) {
      console.error(e)
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
          }}
          isMember={isMember}
          onJoinToggle={handleJoinToggle}
          onInvite={openInviteModal}
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
                      await fetch(`/api/groups/${groupId}/posts`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content }),
                      })
                      const postsResp = await fetchJSON(`/api/groups/${groupId}/posts`)
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
                              await fetch(`/api/posts/${p.id}/comments`, {
                                method: 'POST',
                                credentials: 'include',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ content }),
                              })
                              const postsResp = await fetchJSON(`/api/groups/${groupId}/posts`)
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
          <div className="fixed inset-0 flex items-center justify-center bg-black/40">
            <div className="w-96 rounded-lg bg-white p-4">
              <h4 className="mb-2 font-semibold">Invite a user</h4>
              <input
                value={inviteeId}
                onChange={(e) => setInviteeId(e.target.value)}
                placeholder="User ID or username"
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
                  Send Invite
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
    </div>
  )
}
