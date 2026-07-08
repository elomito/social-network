import axios from 'axios'

// Falls back to same-origin /api in case NEXT_PUBLIC_API_BASE_URL is not set,
// instead of crashing the whole app at import time.
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api'

if (!process.env.NEXT_PUBLIC_API_BASE_URL && process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-console
  console.warn(
    'NEXT_PUBLIC_API_BASE_URL is not set. Falling back to "/api". ' +
      'Set it in .env.local to point at your backend, e.g. http://localhost:8080/api'
  )
}

export const apiClient = axios.create({
  baseURL,
  // The backend issues an httpOnly session cookie on login. Send it on every
  // request and let the browser manage it — no token is ever read or stored
  // in JS.
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const data = error.response?.data
    const config = error.config
    const isNetworkError = !error.response
    const message = data && Object.keys(data).length > 0 ? data : error.message

    console.error('API Error:', {
      url: config?.url,
      method: config?.method,
      status,
      isNetworkError,
      data: message
    })

    return Promise.reject(error)
  }
)

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function register(payload) {
  const { data } = await apiClient.post('/auth/register', payload)
  return data
}

export async function login(payload) {
  const { data } = await apiClient.post('/auth/login', payload)
  return data
}

export async function logout() {
  const { data } = await apiClient.post('/auth/logout')
  return data
}

export async function getCurrentUser() {
  const { data } = await apiClient.get('/auth/me')
  return data
}

// ---------------------------------------------------------------------------
// Users / profiles
// ---------------------------------------------------------------------------

export async function getUserProfile(userId) {
  const { data } = await apiClient.get(`/users/${userId}`)
  return data
}

export async function getDiscoverUsers(query = '') {
  const { data } = await apiClient.get('/users/discover', { params: { query } })
  return data
}

export async function updateUserProfile(userId, payload) {
  const { data } = await apiClient.put(`/users/${userId}`, payload)
  return data
}

export async function getUserPosts(userId) {
  const { data } = await apiClient.get('/posts', { params: { user_id: userId, limit: 50 } })
  return data
}

export async function getUserFollowers() {
  const { data } = await apiClient.get('/followers')
  return data
}

export async function getUserFollowing() {
  const { data } = await apiClient.get('/following')
  return data
}

// ---------------------------------------------------------------------------
// Follow
// ---------------------------------------------------------------------------

export async function followUser(userId) {
  const { data } = await apiClient.post(`/follow?id=${userId}`)
  return data
}

// Also used to cancel an outgoing follow request — the backend only exposes
// one "remove the relationship" endpoint, so unfollow and cancel-request are
// the same call.
export async function unfollowUser(userId) {
  const { data } = await apiClient.post(`/unfollow?id=${userId}`)
  return data
}

export async function acceptFollowRequest(userId) {
  const { data } = await apiClient.post(`/follow/${userId}/accept`)
  return data
}

export async function declineFollowRequest(userId) {
  const { data } = await apiClient.post(`/follow/${userId}/decline`)
  return data
}

export async function getFollowRequests() {
  const { data } = await apiClient.get('/follow/requests')
  return data
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export async function getFeed(params = {}) {
  const { data } = await apiClient.get('/posts', { params })
  return data
}

export async function createPost(payload) {
  const { data } = await apiClient.post('/posts', payload)
  return data
}

export async function getPost(postId) {
  const { data } = await apiClient.get(`/posts/${postId}`)
  return data
}

export async function updatePost(postId, payload) {
  const { data } = await apiClient.put(`/posts/${postId}`, payload)
  return data
}

export async function deletePost(postId) {
  const { data } = await apiClient.delete(`/posts/${postId}`)
  return data
}

export async function reactToPost(postId, reaction) {
  const { data } = await apiClient.post(`/posts/${postId}/react`, { reaction })
  return data
}

export async function addPostRecipient(postId, userId) {
  const { data } = await apiClient.post(`/posts/${postId}/recipients`, { user_id: userId })
  return data
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export async function getComments(postId, params = {}) {
  const { data } = await apiClient.get(`/posts/${postId}/comments`, { params })
  return data
}

export async function createComment(postId, payload) {
  const { data } = await apiClient.post(`/posts/${postId}/comments`, payload)
  return data
}

export async function updateComment(commentId, payload) {
  const { data } = await apiClient.put(`/comments/${commentId}`, payload)
  return data
}

export async function deleteComment(commentId) {
  const { data } = await apiClient.delete(`/comments/${commentId}`)
  return data
}

export async function reactToComment(commentId, reaction) {
  const { data } = await apiClient.post(`/comments/${commentId}/react`, { reaction })
  return data
}

export async function addCommentReaction(commentId, reactionType) {
  const { data } = await apiClient.post(`/comments/${commentId}/reactions`, { reaction_type: reactionType })
  return data
}

export async function removeCommentReaction(commentId) {
  const { data } = await apiClient.delete(`/comments/${commentId}/reactions`)
  return data
}

// ---------------------------------------------------------------------------
// Groups
//
// NOTE: the backend (see docs/api.md) does not expose endpoints for listing
// group members, listing/responding to invitations, or listing/responding to
// join requests, or a group-scoped posts feed. Only the functions below are
// backed by a real route. Do not add member-list / invitation-list / join-
// request UI against this client without adding the matching backend route
// first.
// ---------------------------------------------------------------------------

export async function getGroups(params = {}) {
  const { data } = await apiClient.get('/groups', { params })
  return data
}

export async function createGroup(payload) {
  const { data } = await apiClient.post('/groups', payload)
  return data
}

export async function getGroup(groupId) {
  const { data } = await apiClient.get(`/groups/${groupId}`)
  return data
}

export async function updateGroup(groupId, payload) {
  const { data } = await apiClient.put(`/groups/${groupId}`, payload)
  return data
}

export async function deleteGroup(groupId) {
  const { data } = await apiClient.delete(`/groups/${groupId}`)
  return data
}

export async function inviteToGroup(groupId, inviteeId) {
  const { data } = await apiClient.post(`/groups/${groupId}/invite`, { invitee_id: inviteeId })
  return data
}

export async function requestToJoinGroup(groupId) {
  const { data } = await apiClient.post(`/groups/${groupId}/join`)
  return data
}

export async function leaveGroup(groupId) {
  const { data } = await apiClient.post(`/groups/${groupId}/leave`)
  return data
}

// ---------------------------------------------------------------------------
// TODO_BACKEND: the functions below call routes that are NOT in
// docs/api.md. They are wired up on the frontend so the UI is ready, but
// will 404 until the backend adds matching routes. Each comment shows the
// suggested route to add. Once added, no frontend changes are needed beyond
// this comment — the function names and call sites already assume these
// shapes.
// ---------------------------------------------------------------------------

// Suggested route: GET /api/groups/:id/members
export async function TODO_BACKEND_getGroupMembers(groupId) {
  const { data } = await apiClient.get(`/groups/${groupId}/members`)
  return data
}

// Suggested route: GET /api/groups/:id/invitations
export async function TODO_BACKEND_getGroupInvitations(groupId) {
  const { data } = await apiClient.get(`/groups/${groupId}/invitations`)
  return data
}

// Suggested route: POST /api/groups/:id/invitations/:invitationId/respond
// body: { accept: boolean }
export async function TODO_BACKEND_respondToGroupInvitation(groupId, invitationId, accept) {
  const { data } = await apiClient.post(
    `/groups/${groupId}/invitations/${invitationId}/respond`,
    { accept }
  )
  return data
}

// Suggested route: GET /api/groups/:id/join-requests (creator/admin only)
export async function TODO_BACKEND_getGroupJoinRequests(groupId) {
  const { data } = await apiClient.get(`/groups/${groupId}/join-requests`)
  return data
}

// Suggested route: POST /api/groups/:id/join-requests/:requestId/respond
// body: { approve: boolean }
export async function TODO_BACKEND_respondToJoinRequest(groupId, requestId, approve) {
  const { data } = await apiClient.post(
    `/groups/${groupId}/join-requests/${requestId}/respond`,
    { approve }
  )
  return data
}

// Suggested route: GET /api/groups/:id/posts
export async function TODO_BACKEND_getGroupPosts(groupId) {
  const { data } = await apiClient.get(`/groups/${groupId}/posts`)
  return data
}

// Suggested route: POST /api/groups/:id/posts  body: { content }
export async function TODO_BACKEND_createGroupPost(groupId, content) {
  const { data } = await apiClient.post(`/groups/${groupId}/posts`, { content })
  return data
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export async function createEvent(payload) {
  const { data } = await apiClient.post('/events', payload)
  return data
}

export async function getEvent(eventId) {
  const { data } = await apiClient.get(`/events/${eventId}`)
  return data
}

export async function updateEvent(eventId, payload) {
  const { data } = await apiClient.put(`/events/${eventId}`, payload)
  return data
}

export async function deleteEvent(eventId) {
  const { data } = await apiClient.delete(`/events/${eventId}`)
  return data
}

export async function getGroupEvents(groupId) {
  const { data } = await apiClient.get(`/groups/${groupId}/events`)
  return data
}

// status must be one of: 'going' | 'not_going' | 'maybe'
export async function respondToEvent(eventId, status) {
  const { data } = await apiClient.post(`/events/${eventId}/responses`, { status })
  return data
}

export async function getEventResponses(eventId) {
  const { data } = await apiClient.get(`/events/${eventId}/responses`)
  return data
}

export async function removeEventResponse(eventId) {
  const { data } = await apiClient.delete(`/events/${eventId}/responses`)
  return data
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export async function getChats() {
  const { data } = await apiClient.get('/chats')
  return data
}

// peerId is the other user's id; the backend treats this as the
// get-or-create conversation lookup — there is no separate conversation id.
export async function getChatMessages(peerId) {
  const { data } = await apiClient.get(`/chats/${peerId}`)
  return data
}

export async function sendPrivateMessage(recipientId, content) {
  const { data } = await apiClient.post('/chats', { recipient_id: recipientId, content })
  return data
}

export async function getGroupMessages(groupId) {
  const { data } = await apiClient.get(`/groups/${groupId}/messages`)
  return data
}

export async function sendGroupMessage(groupId, content) {
  const { data } = await apiClient.post(`/groups/${groupId}/messages`, { content })
  return data
}

// ---------------------------------------------------------------------------
// Notifications
//
// The backend has no "mark all as read" route, so markAllNotificationsRead
// below calls markNotificationRead once per unread notification.
// ---------------------------------------------------------------------------

export async function getNotifications() {
  const { data } = await apiClient.get('/notifications')
  return data
}

// The backend does not expose a dedicated unread-count endpoint, so the
// caller should derive the count from the notifications list instead.
export async function getUnreadNotificationCount() {
  const { data } = await apiClient.get('/notifications/unread')
  return data
}

export async function markNotificationRead(notificationId) {
  const { data } = await apiClient.post(`/notifications/read?id=${notificationId}`)
  return data
}

export async function markAllNotificationsRead(unreadIds) {
  await Promise.all(unreadIds.map((id) => markNotificationRead(id)))
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

export async function uploadImage(file) {
  const formData = new FormData()
  formData.append('image', file)
  const { data } = await apiClient.post('/images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export function getImageUrl(imageId) {
  return `${baseURL}/images/${imageId}`
}

export default apiClient
