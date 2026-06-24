import { apiGet, apiPost } from './apiService' // Adjust the import based on your project structure

// ...existing functions...

export async function getGroupEvents(groupId, limit = 10, offset = 0) {
  return apiGet(`/api/groups/${groupId}/events?limit=${limit}&offset=${offset}`)
}

export async function createEvent(groupId, payload) {
  return apiPost(`/api/groups/${groupId}/events`, payload)
}

export async function updateRSVP(eventId, status) {
  // status: 'going' | 'not_going'
  return apiPost(`/api/events/${eventId}/rsvp`, { status })
}

export async function getEventAttendees(eventId) {
  return apiGet(`/api/events/${eventId}/attendees`)
}

export async function getEventById(eventId) {
  return apiGet(`/api/events/${eventId}`)
}