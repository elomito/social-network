'use client'

import React from 'react'
import { AuthProvider } from '../context/AuthContext'
import { NotificationProvider } from '../context/NotificationContext'
import { WebSocketProvider } from '../context/WebSocketContext'
import './globals.css'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProvider>
          <NotificationProvider>
            <WebSocketProvider>
              {children}
            </WebSocketProvider>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
