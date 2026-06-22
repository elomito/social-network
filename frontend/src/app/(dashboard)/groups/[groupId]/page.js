import React, { useEffect, useState } from 'react'
import GroupHeader from '../../../../components/features/groups/GroupHeader'

async function fetchJSON(url) {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export default function GroupPage({ params }) {
  const { groupId } = params
  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [isMember, setIsMember] = useState(false)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const g = await fetchJSON(`/api/groups/${groupId}`)
        if (!mounted) return
        setGroup(g)

        // members endpoint included on group response? fallback
        const membersResp = await fetchJSON(`/api/groups/${groupId}/members`)
        if (!mounted) return
        setMembers(membersResp)

        // check membership (server returns boolean)
        const meResp = await fetchJSON('/api/auth/me')
        const me = meResp && meResp.id
        const member = membersResp.some(m => m.id === me)
        setIsMember(member)

        if (member) {
          const postsResp = await fetchJSON(`/api/groups/${groupId}/posts`)
          setPosts(postsResp)
        }
      } catch (err) {
        // swallow for now
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [groupId])

  async function handleJoinToggle() {
    try {
      if (!isMember) {
        await fetch(`/api/groups/${groupId}/join`, { method: 'POST', credentials: 'include' })
      } else {
        await fetch(`/api/groups/${groupId}/leave`, { method: 'POST', credentials: 'include' })
      }
      // reload members
      const membersResp = await fetchJSON(`/api/groups/${groupId}/members`)
      setMembers(membersResp)
      const meResp = await fetchJSON('/api/auth/me')
      const me = meResp && meResp.id
      setIsMember(membersResp.some(m => m.id === me))
    } catch (err) {
      console.error(err)
    }
  }

  function handleInvite() {
    // small placeholder: open modal or navigation
    alert('Invite functionality not implemented yet')
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
        }} isMember={isMember} onJoinToggle={handleJoinToggle} onInvite={handleInvite} />

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
              <div className="border rounded p-3 mb-3">
                <div className="text-sm font-medium">Upcoming Event</div>
                <div className="text-xs text-gray-500">Tomorrow · 6:00 PM</div>
                <div className="mt-2 flex gap-2">
                  <button className="px-3 py-1 rounded bg-blue-600 text-white text-sm">Going</button>
                  <button className="px-3 py-1 rounded border text-sm">Not Going</button>
                </div>
              </div>
              <div className="text-right"><button className="text-sm text-blue-600">View Events →</button></div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Join to see events</div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-md font-semibold mb-2">About</h3>
          <p className="text-sm text-gray-600">{group.description}</p>
        </div>
      </aside>
    </div>
  )
}
