import React from 'react'

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-6 text-center text-sm text-gray-500">
      <p>&copy; {new Date().getFullYear()} SocialNetwork. All rights reserved.</p>
    </footer>
  )
}