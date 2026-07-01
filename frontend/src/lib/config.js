// WebSocket URL - points directly to backend since Next.js rewrites don't proxy WebSocket
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws'
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api'