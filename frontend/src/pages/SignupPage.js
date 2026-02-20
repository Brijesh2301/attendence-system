import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const { signup }  = useAuth();
  const navigate    = useNavigate();
  const [form, setForm]       = useState({ name: '', email: '', password: '', role: 'employee' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      await signup(form);
      toast.success('Account created!');
      navigate('/dashboard');
    } catch (err) {
      const d = err.response?.data;
      if (d?.errors) {
        const fe = {};
        d.errors.forEach((e) => { fe[e.field] = e.message; });
        setErrors(fe);
      } else {
        setErrors({ general: d?.message || 'Signup failed' });
      }
    } finally {
      setLoading(false);
    }
  };

  const f = (name) => ({
    value: form[name],
    onChange: (e) => setForm(p => ({ ...p, [name]: e.target.value })),
    className: `form-input ${errors[name] ? 'input-error' : ''}`,
  });

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">📋</div>
          <h1>Create Account</h1>
          <p>Join AttendTrack today</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          {errors.general && <div className="alert alert-error">{errors.general}</div>}
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" required placeholder="Your name" {...f('name')} />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" required placeholder="Enter your email" {...f('email')} />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" required placeholder="Please enter your password" {...f('password')} />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>
          <div className="form-group">
            <label>Role</label>
            <select {...f('role')}>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <><span className="spinner" /> Creating...</> : 'SignUp'}
          </button>
        </form>
        <div className="auth-footer">
          <p>Already have an account? <Link to="/login" className="link">login</Link></p>
        </div>
      </div>
    </div>
  );
}
