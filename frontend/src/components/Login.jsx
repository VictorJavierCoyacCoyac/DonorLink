import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

function Login() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, formData);
      const { access_token, refresh_token } = response.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);

      navigate('/');
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
        err.message ||
        'Login failed. Check backend at http://localhost:8000'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h1>DonorLink Login</h1>
      <p>Sistema de Gestión de Donantes de Sangre</p>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label>Username or Email:</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Password:</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '10px', backgroundColor: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      <hr style={{ margin: '20px 0' }} />

      <p>¿Quieres hacer algo más?</p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <Link to="/donor-application" style={{ flex: 1, padding: '10px', textAlign: 'center', borderRadius: '4px', backgroundColor: '#e5e7eb', color: '#111827', textDecoration: 'none' }}>
          Aplicar como Donante
        </Link>
        <Link to="/requester-register" style={{ flex: 1, padding: '10px', textAlign: 'center', borderRadius: '4px', backgroundColor: '#e5e7eb', color: '#111827', textDecoration: 'none' }}>
          Registrarse como Solicitante
        </Link>
      </div>
    </div>
  );
}

export default Login;