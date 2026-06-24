import React, { useContext } from 'react';
import { useRouter } from 'next/navigation';
import AuthContext from '../../context/AuthContext';

const Logout = () => {
  const { setToken } = useContext(AuthContext);
  const router = useRouter();

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('authToken');
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