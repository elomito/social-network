// src/app/(dashboard)/layout.js
import { WebSocketProvider } from '@/context/WebSocketContext';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';

export default function DashboardLayout({ children }) {
  return (
    <WebSocketProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar />
        <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <Navbar />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </WebSocketProvider>
  );
}