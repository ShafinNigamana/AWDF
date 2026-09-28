import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/api';

function Login({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(form.email, form.password);
      onLogin();
      navigate('/projects');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return <main className="page-content auth-page"><section className="card auth-card">
    <p className="eyebrow">Task manager access</p><h1>Log in</h1>
    <form className="task-form" onSubmit={handleSubmit}>
      <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
      <label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>
      {error && <p className="error-message" role="alert">{error}</p>}
      <button className="btn" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Logging in...' : 'Log in'}</button>
    </form>
    <p className="auth-footer">Need an account? <Link to="/register">Register</Link></p>
  </section></main>;
}

export default Login;