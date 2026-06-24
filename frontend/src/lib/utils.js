export function getTokenFromCookie() {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(^|;)\s*token=([^;]+)/)
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
