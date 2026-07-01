// import React from 'react'
// import { AuthProvider } from '@/context/AuthContext'
// import { WebSocketProvider } from '@/context/WebSocketContext'
// import { NotificationProvider } from '@/context/NotificationContext'
// import './globals.css'

// export default function RootLayout({ children }) {
//   return (
//     <html lang="en">
//       <body>
//         <AuthProvider>
//           <WebSocketProvider>
//             <NotificationProvider>{children}</NotificationProvider>
//           </WebSocketProvider>
//         </AuthProvider>
//       </body>
//     </html>
//   )
// }
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar  from '@/components/layout/Navbar'
import { AuthProvider } from '@/context/AuthContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { NotificationProvider } from '@/context/NotificationContext'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata = {
  title: {
    template: '%s | SocialNet',
    default: 'SocialNet',
  },
  description: 'Connect, share, and build communities.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <WebSocketProvider>
            <NotificationProvider>
              {/* <Navbar /> */}
              {children}
            </NotificationProvider>
          </WebSocketProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
  
