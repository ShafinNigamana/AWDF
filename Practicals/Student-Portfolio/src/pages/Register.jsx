import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api/api';

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await register(form.email, form.password);
      navigate('/login');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return <main className="page-content auth-page"><section className="card auth-card">
    <p className="eyebrow">Create access</p><h1>Register</h1>
    <form className="task-form" onSubmit={handleSubmit}>
      <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
      <label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>
      {error && <p className="error-message" role="alert">{error}</p>}
      <button className="btn" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Registering...' : 'Register'}</button>
    </form>
    <p className="auth-footer">Already registered? <Link to="/login">Log in</Link></p>
  </section></main>;
}

export default Register;