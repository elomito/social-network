export function getTokenFromCookie() {
  if (typeof document === 'undefined') return null
  // Backend uses session_id cookie, not token
  const match = document.cookie.match(/(^|;)\s*session_id=([^;]+)/)
  return match ? match[2] : null
}

export function formatDateISO(dateStr) {
  try {
    const d = new Date(dateStr)
    return d.toLocaleString()
  } catch (e) {
    return dateStr
  }
}
