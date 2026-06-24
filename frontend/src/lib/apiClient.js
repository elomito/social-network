export async function apiGet(path) {
  const res = await fetch(path, { credentials: 'include' })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export async function apiPost(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

// Group chat
export async function getGroupMessages(groupId, limit = 20, offset = 0) {
  return apiGet(`/api/groups/${groupId}/messages?limit=${limit}&offset=${offset}`)
}

export async function sendGroupMessage(groupId, content) {
  return apiPost(`/api/groups/${groupId}/messages`, { content })
}

// Conversations / direct messages
export async function getConversations() {
  return apiGet('/api/messages/conversations')
}

export async function getConversationMessages(conversationId, limit = 20, offset = 0) {
  return apiGet(`/api/messages/conversations/${conversationId}?limit=${limit}&offset=${offset}`)
}

export async function sendPrivateMessage(conversationId, content) {
  return apiPost(`/api/messages/conversations/${conversationId}/messages`, { content })
}

// Create or fetch conversation between current user and peer
export async function getOrCreateConversationWith(peerId) {
  return apiPost(`/api/messages/conversations`, { peer_id: peerId })
}

// Follow status
export async function getFollowStatus(userId) {
  return apiGet(`/api/users/${userId}/follow_status`)
}

// Group members
export async function getGroupMembers(groupId) {
  return apiGet(`/api/groups/${groupId}/members`)
}

// Join/leave
export async function joinGroup(groupId) {
  return apiPost(`/api/groups/${groupId}/join`)
}

export async function leaveGroup(groupId) {
  return apiPost(`/api/groups/${groupId}/leave`)
}
