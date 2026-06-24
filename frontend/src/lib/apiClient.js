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
  // Some endpoints return no body
  try {
    return await res.json()
  } catch (e) {
    return null
  }
}

export async function apiDelete(path) {
  const res = await fetch(path, { method: 'DELETE', credentials: 'include' })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return null
}

// Group membership & invites
export async function getGroupMembers(groupId) {
  return apiGet(`/api/groups/${groupId}/members`)
}

export async function joinGroup(groupId) {
  return apiPost(`/api/groups/${groupId}/join`)
}

export async function leaveGroup(groupId) {
  return apiPost(`/api/groups/${groupId}/leave`)
}

// Invitations: create, list, respond
export async function sendGroupInvite(groupId, inviteeId) {
  return apiPost(`/api/groups/${groupId}/invitations`, { invitee_id: inviteeId })
}

export async function getGroupInvitations(groupId) {
  return apiGet(`/api/groups/${groupId}/invitations`)
}

export async function respondToInvite(groupId, invitationId, accept) {
  return apiPost(`/api/groups/${groupId}/invitations/${invitationId}/respond`, { accept })
}

// Join requests: request, list, respond (only creator)
export async function requestJoinGroup(groupId) {
  return apiPost(`/api/groups/${groupId}/join_requests`, {})
}

export async function getGroupJoinRequests(groupId) {
  return apiGet(`/api/groups/${groupId}/join_requests`)
}

export async function respondToJoinRequest(groupId, requestId, approve) {
  return apiPost(`/api/groups/${groupId}/join_requests/${requestId}/respond`, { approve })
}

// Messages (kept for compatibility)
export async function getGroupMessages(groupId, limit = 20, offset = 0) {
  return apiGet(`/api/groups/${groupId}/messages?limit=${limit}&offset=${offset}`)
}

export async function sendGroupMessage(groupId, content) {
  return apiPost(`/api/groups/${groupId}/messages`, { content })
}

export async function getConversations() {
  return apiGet('/api/messages/conversations')
}

export async function getConversationMessages(conversationId, limit = 20, offset = 0) {
  return apiGet(`/api/messages/conversations/${conversationId}?limit=${limit}&offset=${offset}`)
}

export async function sendPrivateMessage(conversationId, content) {
  return apiPost(`/api/messages/conversations/${conversationId}/messages`, { content })
}

export async function getOrCreateConversationWith(peerId) {
  return apiPost(`/api/messages/conversations`, { peer_id: peerId })
}

export async function getFollowStatus(userId) {
  return apiGet(`/api/users/${userId}/follow_status`)
}

// auth helper
export async function getCurrentUser() {
  return apiGet('/api/auth/me')
}

// Additions
export async function getGroups(limit = 20, offset = 0) {
  return apiGet(`/api/groups?limit=${limit}&offset=${offset}`)
}

export async function getNotifications(limit = 50, offset = 0) {
  return apiGet(`/api/notifications?limit=${limit}&offset=${offset}`)
}
