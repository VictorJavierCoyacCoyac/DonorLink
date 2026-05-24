import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, CircularProgress, InputAdornment,
} from '@mui/material';
import {
  Bloodtype as BloodIcon,
  EmailOutlined as EmailIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import axios from 'axios';

import { API_BASE_URL } from '../config/api';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Ocurrió un error. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      position: 'fixed', inset: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a0000 0%, #6b0000 40%, #c62828 70%, #e53935 100%)',
    }}>
      <Card sx={{
        width: '100%', maxWidth: 420, mx: 2, borderRadius: 4,
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        background: 'rgba(255,255,255,0.97)',
      }}>
        <Box sx={{ height: 6, background: 'linear-gradient(90deg, #b71c1c, #e53935, #ef9a9a)', borderRadius: '16px 16px 0 0' }} />

        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, #c62828, #e53935)', mb: 2,
              boxShadow: '0 8px 20px rgba(198,40,40,0.4)',
            }}>
              <BloodIcon sx={{ fontSize: 32, color: 'white' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#1a1a1a' }}>
              Recuperar contraseña
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Te enviaremos un enlace a tu email
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

          {sent ? (
            <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
              Si el email está registrado, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
            </Alert>
          ) : (
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Correo electrónico"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: '#c62828' }} />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                size="large"
                sx={{
                  py: 1.5, borderRadius: 2, textTransform: 'none',
                  fontWeight: 700, fontSize: '1rem',
                  background: 'linear-gradient(135deg, #c62828 0%, #e53935 100%)',
                  boxShadow: '0 4px 15px rgba(198,40,40,0.35)',
                  '&:hover': { background: 'linear-gradient(135deg, #b71c1c 0%, #c62828 100%)' },
                }}
              >
                {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Enviar enlace'}
              </Button>
            </form>
          )}

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button
              component={Link}
              to="/login"
              startIcon={<ArrowBackIcon />}
              sx={{ textTransform: 'none', color: '#c62828', fontWeight: 600 }}
            >
              Volver al login
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export default ForgotPassword;
