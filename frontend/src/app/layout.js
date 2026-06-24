'use client'

import React from 'react'
import { AuthProvider } from '../context/AuthContext'
import { NotificationProvider } from '../context/NotificationContext'
import Navbar from '../components/layout/Navbar'
import Sidebar from '../components/layout/Sidebar'
import './globals.css'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          <NotificationProvider>
            <Navbar />
            <div className="app-grid container">
              <aside className="sidebar">
                {' '}
                <Sidebar />{' '}
              </aside>
              <main>{children}</main>
              <div>{/* right column: placeholders for trends/ads */}</div>
            </div>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
