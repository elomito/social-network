'use client';

import React, { useRef, useEffect } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import NotificationItem from './NotificationItem';

export default function NotificationDropdown({ onClose }) {
  const dropdownRef = useRef(null);
  const { notifications, markAsRead, markAllAsRead } = useNotifications();

  // Close dropdown instantly if user clicks outside the panel element window area
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div 
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-96 max-h-[480px] flex flex-col bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 z-50 overflow-hidden"
    >
      {/* Header section control buttons */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <span className="font-semibold text-sm text-gray-700">Notifications</span>
        {notifications.some(n => !n.read) && (
          <button 
            onClick={markAllAsRead}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Feed list timeline stream container */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No notifications yet.
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem 
              key={notification.id}
              notification={notification}
              onMarkAsRead={markAsRead}
            />
          ))
        )}
      </div>
    </div>
  );
}