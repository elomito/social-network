const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080/api'

function buildHeaders(token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

export default {
  get: (path, token) => fetch(API_BASE + path, { method: 'GET', headers: buildHeaders(token) }),
  post: (path, body = {}, token) => fetch(API_BASE + path, { method: 'POST', headers: buildHeaders(token), body: JSON.stringify(body) }),
  put: (path, body = {}, token) => fetch(API_BASE + path, { method: 'PUT', headers: buildHeaders(token), body: JSON.stringify(body) }),
  del: (path, token) => fetch(API_BASE + path, { method: 'DELETE', headers: buildHeaders(token) })
}
