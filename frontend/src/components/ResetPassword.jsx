import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, CircularProgress, InputAdornment, IconButton,
} from '@mui/material';
import {
  Bloodtype as BloodIcon,
  LockOutlined as LockIcon,
  Visibility, VisibilityOff,
  CheckCircleOutline as CheckIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import axios from 'axios';

import { API_BASE_URL } from '../config/api';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        token,
        new_password: newPassword,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'El enlace es inválido o ha expirado.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Box sx={{
        position: 'fixed', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a0000 0%, #6b0000 40%, #c62828 70%, #e53935 100%)',
      }}>
        <Card sx={{ maxWidth: 400, mx: 2, borderRadius: 4, p: 2 }}>
          <CardContent>
            <Alert severity="error">Enlace inválido. Solicita uno nuevo desde la pantalla de recuperación.</Alert>
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button component={Link} to="/forgot-password" variant="contained"
                sx={{ textTransform: 'none', background: '#c62828' }}>
                Solicitar nuevo enlace
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

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
              background: success
                ? 'linear-gradient(135deg, #2e7d32, #43a047)'
                : 'linear-gradient(135deg, #c62828, #e53935)',
              mb: 2, boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
            }}>
              {success
                ? <CheckIcon sx={{ fontSize: 36, color: 'white' }} />
                : <BloodIcon sx={{ fontSize: 32, color: 'white' }} />}
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#1a1a1a' }}>
              {success ? '¡Contraseña restablecida!' : 'Nueva contraseña'}
            </Typography>
            {!success && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Elige una contraseña segura para tu cuenta
              </Typography>
            )}
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

          {success ? (
            <>
              <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                Tu contraseña fue actualizada correctamente. Ya puedes iniciar sesión.
              </Alert>
              <Button
                component={Link}
                to="/login"
                fullWidth
                variant="contained"
                size="large"
                sx={{
                  py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 700,
                  background: 'linear-gradient(135deg, #c62828, #e53935)',
                }}
              >
                Ir al login
              </Button>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Nueva contraseña"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                helperText="Mínimo 8 caracteres, una mayúscula y un número"
                sx={{ mb: 2 }}
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
              <TextField
                fullWidth
                label="Confirmar contraseña"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: '#c62828' }} />
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
                {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Restablecer contraseña'}
              </Button>
            </form>
          )}

          {!success && (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button
                component={Link}
                to="/login"
                startIcon={<ArrowBackIcon />}
                sx={{ textTransform: 'none', color: '#c62828', fontWeight: 600 }}
              >
                Volver al login
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default ResetPassword;
