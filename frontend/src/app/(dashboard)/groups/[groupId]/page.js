import React, { useEffect, useState } from 'react'
import GroupHeader from '../../../../components/features/groups/GroupHeader.js'
import {
  getGroupMembers,
  getGroupInvitations,
  sendGroupInvite,
  respondToInvite,
  requestJoinGroup,
  getGroupJoinRequests,
  respondToJoinRequest,
  getCurrentUser,
} from '../../../../lib/apiClient.js'

async function fetchJSON(url) {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export default function GroupPage({ params }) {
  const { groupId } = params
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

        setIsMember(membersResp.some(m => m.id === (me && me.id)))

        // load invitations (for members) and join requests (for creator)
        if (membersResp.some(m => m.id === (me && me.id))) {
          const inv = await getGroupInvitations(groupId)
          if (!mounted) return
          setInvitations(inv)
        }
        if (me && g && me.id === g.creator_id) {
          const reqs = await getGroupJoinRequests(groupId)
          if (!mounted) return
          setJoinRequests(reqs)
        }

        if (membersResp.some(m => m.id === (me && me.id))) {
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
    return () => { mounted = false }
  }, [groupId])

  useEffect(() => {
    let mounted = true
    async function loadEvents() {
      if (!groupId) return
      try {
        const ev = await getGroupEvents(groupId, 10, 0)
        if (!mounted) return
        setEvents(ev || [])
      } catch (e) { console.error(e) }
    }
    loadEvents()
    return () => { mounted = false }
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
      setIsMember(membersResp.some(m => m.id === (me && me.id)))
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

  if (loading) return <div className="p-6">Loading...</div>

  if (!group) return <div className="p-6">Group not found</div>

  return (
    <div className="p-6 flex gap-6">
      <main className="flex-1 max-w-3xl">
        <GroupHeader group={{
          title: group.title,
          description: group.description,
          privacy: group.privacy || 'public',
          cover_image_url: group.cover_image_url,
          member_count: members.length,
        }} isMember={isMember} onJoinToggle={handleJoinToggle} onInvite={openInviteModal} />

        <section className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Members</h2>
          <div className="grid grid-cols-2 gap-3 max-h-56 overflow-y-auto">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-500">{m.name ? m.name.charAt(0).toUpperCase() : '?'}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{m.name}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">{m.role === 'creator' || m.role === 'admin' ? '👑 Creator' : '👤 Member'}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-6">
          {!isMember && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p className="text-sm">Join this group to view discussions and participate.</p>
            </div>
          )}

          {isMember && (
            <div>
              <div className="bg-white rounded-lg shadow p-4 mb-4">
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  const content = e.target.elements.content.value
                  if (!content) return
                  try {
                    await fetch(`/api/groups/${groupId}/posts`, {
                      method: 'POST',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ content })
                    })
                    const postsResp = await fetchJSON(`/api/groups/${groupId}/posts`)
                    setPosts(postsResp)
                    e.target.reset()
                  } catch (err) {
                    console.error(err)
                  }
                }}>
                  <textarea name="content" className="w-full p-2 border rounded mb-3" rows="3" placeholder="Share something with the group..."></textarea>
                  <div className="text-right"><button className="px-4 py-2 rounded bg-blue-600 text-white">Post</button></div>
                </form>
              </div>

              <div className="space-y-4">
                {posts.map(p => (
                  <article key={p.id} className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-500">{p.author && p.author.name ? p.author.name.charAt(0).toUpperCase() : '?'}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">{p.author ? p.author.name : 'Unknown'}</div>
                            <div className="text-xs text-gray-500">{new Date(p.created_at).toLocaleString()}</div>
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
                            {p.comments.map(c => (
                              <div key={c.id} className="text-sm py-2">
                                <span className="font-medium">{c.author ? c.author.name : 'Unknown'}:</span> {c.content}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* comment form */}
                        <form onSubmit={async (e) => {
                          e.preventDefault()
                          const content = e.target.elements.content.value
                          if (!content) return
                          try {
                            await fetch(`/api/posts/${p.id}/comments`, {
                              method: 'POST',
                              credentials: 'include',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ content })
                            })
                            const postsResp = await fetchJSON(`/api/groups/${groupId}/posts`)
                            setPosts(postsResp)
                            e.target.reset()
                          } catch (err) {
                            console.error(err)
                          }
                        }} className="mt-3">
                          <input name="content" className="w-full p-2 border rounded" placeholder="Write a comment..." />
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
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h3 className="text-md font-semibold mb-2">Events</h3>
          {isMember ? (
            <div>
              {events.map(event => (
                <div key={event.id} className="mb-3">
                  <EventCard event={event} onRSVP={(status) => handleRSVP(event.id, status)} />
                </div>
              ))}

              <div className="text-right mb-2"><button className="text-sm text-blue-600">View Events →</button></div>

              <div className="border rounded p-3">
                <h4 className="font-semibold mb-2">Create Event</h4>
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  const title = e.target.elements.title.value
                  const description = e.target.elements.description.value
                  const start_time = e.target.elements.start_time.value
                  if (!title || !start_time) return
                  await handleCreateEvent({ title, description, start_time })
                  e.target.reset()
                }}>
                  <input name="title" placeholder="Event title" className="w-full p-2 border rounded mb-2" />
                  <input name="start_time" type="datetime-local" className="w-full p-2 border rounded mb-2" />
                  <textarea name="description" placeholder="Description" className="w-full p-2 border rounded mb-2" />
                  <div className="text-right"><button className="px-3 py-1 bg-green-600 text-white rounded">Create</button></div>
                </form>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Join to see events</div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-md font-semibold mb-2">About</h3>
          <p className="text-sm text-gray-600">{group.description}</p>
        </div>

        {inviteModalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-white rounded-lg p-4 w-96">
              <h4 className="font-semibold mb-2">Invite a user</h4>
              <input value={inviteeId} onChange={(e) => setInviteeId(e.target.value)} placeholder="User ID or username" className="w-full p-2 border rounded mb-3" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setInviteModalOpen(false)} className="px-3 py-1 border rounded">Cancel</button>
                <button onClick={sendInvite} className="px-3 py-1 bg-blue-600 text-white rounded">Send Invite</button>
              </div>
            </div>
          </div>
        )}

        {invitations.length > 0 && (
          <div className="mt-4 bg-white rounded-lg shadow p-4">
            <h4 className="font-semibold mb-2">Invitations</h4>
            {invitations.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-2 border-b">
                <div>
                  <div className="text-sm font-medium">{inv.inviter && inv.inviter.name ? inv.inviter.name : 'Someone'} invited you</div>
                  <div className="text-xs text-gray-500">Status: {inv.status}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleRespondInvite(inv.id, true)} className="px-2 py-1 bg-green-600 text-white rounded">Accept</button>
                  <button onClick={() => handleRespondInvite(inv.id, false)} className="px-2 py-1 border rounded">Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isCreator && joinRequests.length > 0 && (
          <div className="mt-4 bg-white rounded-lg shadow p-4">
            <h4 className="font-semibold mb-2">Join Requests</h4>
            {joinRequests.map(req => (
              <div key={req.id} className="flex items-center justify-between p-2 border-b">
                <div>
                  <div className="text-sm font-medium">{req.user && req.user.name ? req.user.name : 'Someone'} requested to join</div>
                  <div className="text-xs text-gray-500">{new Date(req.created_at).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleRespondJoinRequest(req.id, true)} className="px-2 py-1 bg-green-600 text-white rounded">Approve</button>
                  <button onClick={() => handleRespondJoinRequest(req.id, false)} className="px-2 py-1 border rounded">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  )
}
