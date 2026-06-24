import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function ProtectedRoute({ children }) {
  const { token } = useAuth();
  const router = useRouter();

  if (!token) {
    router.push('/auth/login');
    return null;
  }

  return children;
}