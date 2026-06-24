import { useNotifications } from '@/context/NotificationContext'

export default function Navbar() {
  const { unreadCount } = useNotifications()

  return (
    <div className="relative p-2">
      <BellIcon className="h-6 w-6" />
      {unreadCount > 0 && (
        <span className="absolute right-0 top-0 inline-flex items-center justify-center rounded-full bg-red-600 px-2 py-1 text-xs font-bold leading-none text-red-100">
          {unreadCount}
        </span>
      )}
    </div>
  )
}
