import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { clearToken, getToken } from './api/api';
import NavBar from './components/NavBar';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import Register from './pages/Register';

const delayImport = (importer, minDelayMs = 300) =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now();

    importer()
      .then((module) => {
        const elapsed = Date.now() - startedAt;
        const waitTime = Math.max(0, minDelayMs - elapsed);
        window.setTimeout(() => resolve(module), waitTime);
      })
      .catch(reject);
  });

const Projects = lazy(() => delayImport(() => import('./pages/Projects')));
const Contact = lazy(() => delayImport(() => import('./pages/Contact')));

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

      <Suspense fallback={<div className="route-loading">Loading page...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={token ? <Projects /> : <Navigate to="/login" replace />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login onLogin={() => setToken(getToken())} />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;