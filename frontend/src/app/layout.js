'use client'

import React from 'react'
import { AuthProvider } from '../context/AuthContext'
import { NotificationProvider } from '../context/NotificationContext'
import { WebSocketProvider } from '../context/webSocketContext'
import Navbar from '../components/layout/Navbar'
import Sidebar from '../components/layout/Sidebar'
import RightSidebar from '../components/layout/RightSidebar'
import './globals.css'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          <NotificationProvider>
            <WebSocketProvider>
              <Navbar />
              <div className="app-grid container">
                <aside className="sidebar">
                  {' '}
                  <Sidebar />{' '}
                </aside>
                <main>{children}</main>
                <aside className="right-sidebar">
                  <RightSidebar />
                </aside>
              </div>
            </WebSocketProvider>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
