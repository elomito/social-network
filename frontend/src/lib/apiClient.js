import axios from 'axios'

// Use relative URLs - Next.js proxy will forward to backend
const API_BASE_URL = ''

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
})

// Request interceptor to add auth credentials
api.interceptors.request.use((config) => {
  config.withCredentials = true
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response || error.message)
    return Promise.reject(error)
  }
)

// API functions for groups
export async function getGroupMembers(groupId) {
  const response = await fetch(`/api/groups/${groupId}/members`, {
    credentials: 'include',
  })
  if (!response.ok) throw new Error('Failed to fetch group members')
  return response.json()
}

export async function getGroupInvitations(groupId) {
  const response = await fetch(`/api/groups/${groupId}/invitations`, {
    credentials: 'include',
  })
  if (!response.ok) throw new Error('Failed to fetch group invitations')
  return response.json()
}

export async function sendGroupInvite(groupId, inviteeId) {
  const response = await fetch(`/api/groups/${groupId}/invitations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ invitee_id: inviteeId }),
  })
  if (!response.ok) throw new Error('Failed to send group invite')
  return response.json()
}

export async function respondToInvite(groupId, invitationId, accept) {
  const response = await fetch(
    `/api/groups/${groupId}/invitations/${invitationId}/respond`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ accept }),
    }
  )
  if (!response.ok) throw new Error('Failed to respond to invitation')
  return response.json()
}

export async function requestJoinGroup(groupId) {
  const response = await fetch(`/api/groups/${groupId}/join`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) throw new Error('Failed to request join')
  return response.json()
}

export async function getGroupJoinRequests(groupId) {
  const response = await fetch(`/api/groups/${groupId}/join-requests`, {
    credentials: 'include',
  })
  if (!response.ok) throw new Error('Failed to fetch join requests')
  return response.json()
}

export async function respondToJoinRequest(groupId, requestId, approve) {
  const response = await fetch(
    `/api/groups/${groupId}/join-requests/${requestId}/respond`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ approve }),
    }
  )
  if (!response.ok) throw new Error('Failed to respond to join request')
  return response.json()
}

export async function getGroupEvents(groupId, limit = 10, offset = 0) {
  const response = await fetch(
    `/api/groups/${groupId}/events?limit=${limit}&offset=${offset}`,
    {
      credentials: 'include',
    }
  )
  if (!response.ok) throw new Error('Failed to fetch group events')
  return response.json()
}

export async function getCurrentUser() {
  const response = await fetch(`/api/auth/me`, {
    credentials: 'include',
  })
  if (!response.ok) return null
  return response.json()
}

export async function getNotifications() {
  const response = await fetch(`/api/notifications`, {
    credentials: 'include',
  })
  if (!response.ok) throw new Error('Failed to fetch notifications')
  return response.json()
}

export async function getConversations() {
  const response = await fetch(`/api/conversations`, {
    credentials: 'include',
  })
  if (!response.ok) throw new Error('Failed to fetch conversations')
  return response.json()
}

export async function getConversationMessages(conversationId, limit = 50, offset = 0) {
  const response = await fetch(
    `/api/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`,
    {
      credentials: 'include',
    }
  )
  if (!response.ok) throw new Error('Failed to fetch messages')
  return response.json()
}

export async function sendPrivateMessage(conversationId, content) {
  const response = await fetch(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ content }),
  })
  if (!response.ok) throw new Error('Failed to send message')
  return response.json()
}

export async function getOrCreateConversationWith(peerId) {
  const response = await fetch(`/api/conversations/peer?peerId=${peerId}`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) throw new Error('Failed to create conversation')
  return response.json()
}

export async function getFollowStatus(userId) {
  const response = await fetch(`/api/follow/status?user_id=${userId}`, {
    credentials: 'include',
  })
  if (!response.ok) throw new Error('Failed to get follow status')
  return response.json()
}

export default api
