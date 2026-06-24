import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';

const Logout = () => {
  const { setToken } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    setToken(null);
    router.push('/auth/login');
  };

  return (
    <button className="bg-red-600 text-white px-4 py-2 rounded"
           onClick={handleLogout}
    >
      Logout
    </button>
  );
};
export default Logout;