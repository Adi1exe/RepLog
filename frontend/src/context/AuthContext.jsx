import { createContext, useContext, useState, useEffect } from 'react';
import { getMe, logout as apiLogout } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      const storedUser = localStorage.getItem('user');
      const storedUserData = storedUser ? JSON.parse(storedUser) : null;
      if (storedUser) {
        setUser(storedUserData);
      }

      try {
        const { data } = await getMe();
        if (!mounted) return;
        const userObj = { ...(storedUserData || {}), ...data };
        delete userObj.access_token;
        delete userObj.token;
        localStorage.setItem('user', JSON.stringify(userObj));
        setUser(userObj);
      } catch {
        localStorage.removeItem('user');
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    restoreSession();
    return () => { mounted = false; };
  }, []);

  const loginContext = (data) => {
    const userObj = data.user || data;
    delete userObj.access_token;
    delete userObj.token;
    localStorage.setItem('user', JSON.stringify(userObj));
    setUser(userObj);
  };

  const logout = () => {
    apiLogout().catch(() => {});
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login: loginContext, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
