import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { clearToken, getToken } from './api/api';
import NavBar from './components/NavBar';
import Home from './pages/Home';
import Projects from './pages/Projects';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  const [token, setToken] = useState(getToken);

  useEffect(() => {
    const handleAuthExpired = () => setToken(null);
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  const logout = () => {
    clearToken();
    setToken(null);
  };

  return (
    <div className="app-shell">
      <NavBar isAuthenticated={Boolean(token)} onLogout={logout} />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projects" element={token ? <Projects /> : <Navigate to="/login" replace />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login onLogin={() => setToken(getToken())} />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;