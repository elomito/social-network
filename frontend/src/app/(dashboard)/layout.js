import ProtectedRoute from '../../context/ProtectedRoute'

export default function DashboardLayout({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}
