import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Bloodtype as BloodIcon,
  Visibility,
  VisibilityOff,
  PersonOutline as PersonIcon,
  LockOutlined as LockIcon,
  FavoriteOutlined as HeartIcon,
  LocalHospitalOutlined as HospitalIcon,
} from '@mui/icons-material';
import axios from 'axios';

import { API_BASE_URL } from '../config/api';

function Login() {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

      const meResp = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const role = meResp.data.role?.toLowerCase();
      localStorage.setItem('user_role', role);

      if (role === 'donor') {
        window.location.href = '/donor-dashboard';
      } else if (role === 'requester') {
        window.location.href = '/requester-dashboard';
      } else if (role === 'admin' || role === 'staff') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/';
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Credenciales incorrectas. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a0000 0%, #6b0000 40%, #c62828 70%, #e53935 100%)',
        overflowY: 'auto',
        zIndex: 0,
      }}
    >
      {/* Decorative blobs */}
      <Box sx={{
        position: 'absolute', top: '-80px', left: '-80px',
        width: 300, height: 300, borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
      }} />
      <Box sx={{
        position: 'absolute', bottom: '-100px', right: '-60px',
        width: 400, height: 400, borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)',
      }} />
      <Box sx={{
        position: 'absolute', top: '30%', right: '10%',
        width: 150, height: 150, borderRadius: '50%',
        background: 'rgba(255,255,255,0.06)',
      }} />

      <Card
        sx={{
          width: '100%',
          maxWidth: 440,
          mx: 2,
          borderRadius: 4,
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)',
          background: 'rgba(255,255,255,0.97)',
          overflow: 'visible',
          position: 'relative',
        }}
      >
        {/* Top accent bar */}
        <Box sx={{
          height: 6,
          background: 'linear-gradient(90deg, #b71c1c, #e53935, #ef9a9a)',
          borderRadius: '16px 16px 0 0',
        }} />

        <CardContent sx={{ p: 4 }}>
          {/* Logo & Brand */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #c62828, #e53935)',
              mb: 2,
              boxShadow: '0 8px 20px rgba(198,40,40,0.4)',
            }}>
              <BloodIcon sx={{ fontSize: 38, color: 'white' }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.5px' }}>
              DonorLink
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Sistema de Gestión de Donantes de Sangre
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Usuario o Email"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              autoComplete="username"
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon sx={{ color: '#c62828' }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Contraseña"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: '#c62828' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ textAlign: 'right', mb: 1 }}>
              <Button
                component={Link}
                to="/forgot-password"
                size="small"
                sx={{ textTransform: 'none', color: '#c62828', fontWeight: 500, p: 0 }}
              >
                ¿Olvidaste tu contraseña?
              </Button>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              size="large"
              sx={{
                py: 1.5,
                borderRadius: 2,
                background: loading
                  ? '#e0e0e0'
                  : 'linear-gradient(135deg, #c62828 0%, #e53935 100%)',
                fontSize: '1rem',
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'none',
                boxShadow: '0 4px 15px rgba(198,40,40,0.35)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #b71c1c 0%, #c62828 100%)',
                  boxShadow: '0 6px 20px rgba(198,40,40,0.45)',
                },
              }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} sx={{ color: '#c62828' }} />
                  Iniciando sesión...
                </Box>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>

          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.secondary">
              ¿No tienes una cuenta?
            </Typography>
          </Divider>

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              component={Link}
              to="/donor-register"
              fullWidth
              variant="outlined"
              startIcon={<HeartIcon />}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                borderColor: '#c62828',
                color: '#c62828',
                '&:hover': {
                  borderColor: '#b71c1c',
                  backgroundColor: 'rgba(198,40,40,0.05)',
                },
              }}
            >
              Ser Donante
            </Button>
            <Button
              component={Link}
              to="/requester-register"
              fullWidth
              variant="outlined"
              startIcon={<HospitalIcon />}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                borderColor: '#1565c0',
                color: '#1565c0',
                '&:hover': {
                  borderColor: '#0d47a1',
                  backgroundColor: 'rgba(21,101,192,0.05)',
                },
              }}
            >
              Solicitante
            </Button>
          </Box>

          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
            Cada donación puede salvar hasta 3 vidas
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

export default Login;
