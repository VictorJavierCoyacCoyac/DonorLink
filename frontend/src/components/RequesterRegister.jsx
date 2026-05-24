import { useState } from 'react';
import { Link } from 'react-router-dom';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  Grid,
} from '@mui/material';
import {
  LocalHospitalOutlined as HospitalIcon,
  PersonOutline as PersonIcon,
  EmailOutlined as EmailIcon,
  LockOutlined as LockIcon,
  PhoneOutlined as PhoneIcon,
  LocationOnOutlined as LocationIcon,
  Bloodtype as BloodIcon,
  PriorityHigh as UrgencyIcon,
  Visibility,
  VisibilityOff,
  ArrowForward as NextIcon,
  ArrowBack as BackIcon,
  CheckCircleOutline as SuccessIcon,
} from '@mui/icons-material';
import axios from 'axios';

import { API_BASE_URL } from '../config/api';
const BLOOD_TYPES = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
const URGENCY_OPTIONS = [
  { value: 'low', label: 'Baja — No es urgente' },
  { value: 'normal', label: 'Normal — En las próximas semanas' },
  { value: 'high', label: 'Alta — Lo antes posible' },
  { value: 'critical', label: 'Crítica — Emergencia médica' },
];

const STEPS = ['Cuenta', 'Información', 'Confirmar'];

function RequesterRegister() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', confirmPassword: '',
    name: '', phone: '', address: '', blood_type_needed: 'O+', urgency: 'normal',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const validateStep0 = () => {
    if (!formData.username || formData.username.length < 3) return 'El usuario debe tener al menos 3 caracteres';
    if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) return 'El usuario solo puede tener letras, números, guiones y guiones bajos';
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Ingresa un email válido';
    if (!formData.password || formData.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
    if (!/[A-Z]/.test(formData.password)) return 'La contraseña debe tener al menos una mayúscula';
    if (!/[0-9]/.test(formData.password)) return 'La contraseña debe tener al menos un número';
    if (formData.password !== formData.confirmPassword) return 'Las contraseñas no coinciden';
    return null;
  };

  const validateStep1 = () => {
    if (!formData.name || formData.name.length < 2) return 'El nombre debe tener al menos 2 caracteres';
    if (!formData.blood_type_needed) return 'Selecciona el tipo de sangre necesario';
    return null;
  };

  const handleNext = () => {
    let err = null;
    if (step === 0) err = validateStep0();
    if (step === 1) err = validateStep1();
    if (err) { setError(err); return; }
    setError('');
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone || null,
        address: formData.address || null,
        blood_type_needed: formData.blood_type_needed,
        urgency: formData.urgency || 'normal',
      };

      await axios.post(`${API_BASE_URL}/requester/register`, payload);

      const loginResp = await axios.post(`${API_BASE_URL}/auth/login`, {
        username: formData.username,
        password: formData.password,
      });

      localStorage.setItem('access_token', loginResp.data.access_token);
      localStorage.setItem('refresh_token', loginResp.data.refresh_token);
      localStorage.setItem('user_role', 'requester');

      window.location.href = '/requester-dashboard';
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg).join('. '));
      } else {
        setError(detail || err.message || 'Error al registrar. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      position: 'fixed',
      inset: 0,
      overflowY: 'auto',
      background: 'linear-gradient(135deg, #003c8f 0%, #1565c0 45%, #1976d2 70%, #42a5f5 100%)',
      py: 4,
    }}>
      {/* Decorative blobs */}
      <Box sx={{ position: 'fixed', top: '-100px', right: '-80px', width: 350, height: 350, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
      <Box sx={{ position: 'fixed', bottom: '-80px', left: '-60px', width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

      <Card sx={{ width: '100%', maxWidth: 520, mx: 'auto', px: 2, borderRadius: 4, boxShadow: '0 24px 60px rgba(0,0,0,0.4)', background: 'rgba(255,255,255,0.98)', position: 'relative' }}>
        <Box sx={{ height: 6, background: 'linear-gradient(90deg, #003c8f, #1976d2, #42a5f5)', borderRadius: '16px 16px 0 0' }} />

        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 68, height: 68, borderRadius: '50%', background: 'linear-gradient(135deg, #1565c0, #1976d2)', mb: 1.5, boxShadow: '0 8px 20px rgba(21,101,192,0.4)' }}>
              <HospitalIcon sx={{ fontSize: 34, color: 'white' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#1a1a1a' }}>
              Registro de Solicitante
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Encuentra donantes compatibles para tu necesidad
            </Typography>
          </Box>

          {/* Stepper */}
          <Stepper activeStep={step} sx={{ mb: 3 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

          {/* STEP 0 — Cuenta */}
          {step === 0 && (
            <Box>
              <TextField fullWidth label="Usuario" name="username" value={formData.username} onChange={handleChange} sx={{ mb: 2 }}
                InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon sx={{ color: '#1565c0' }} /></InputAdornment> }}
                helperText="Solo letras, números, guiones y guiones bajos"
              />
              <TextField fullWidth label="Email" name="email" type="email" value={formData.email} onChange={handleChange} sx={{ mb: 2 }}
                InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: '#1565c0' }} /></InputAdornment> }}
              />
              <TextField fullWidth label="Contraseña" name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange} sx={{ mb: 2 }}
                helperText="Mínimo 8 caracteres, 1 mayúscula, 1 número"
                InputProps={{
                  startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: '#1565c0' }} /></InputAdornment>,
                  endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} size="small">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>,
                }}
              />
              <TextField fullWidth label="Confirmar Contraseña" name="confirmPassword" type={showConfirm ? 'text' : 'password'} value={formData.confirmPassword} onChange={handleChange}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: '#1565c0' }} /></InputAdornment>,
                  endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowConfirm(!showConfirm)} size="small">{showConfirm ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>,
                }}
              />
            </Box>
          )}

          {/* STEP 1 — Información */}
          {step === 1 && (
            <Box>
              <TextField fullWidth label="Nombre Completo *" name="name" value={formData.name} onChange={handleChange} sx={{ mb: 2 }}
                InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon sx={{ color: '#1565c0' }} /></InputAdornment> }}
              />
              <TextField fullWidth label="Teléfono" name="phone" value={formData.phone} onChange={handleChange} sx={{ mb: 2 }}
                InputProps={{ startAdornment: <InputAdornment position="start"><PhoneIcon sx={{ color: '#1565c0' }} /></InputAdornment> }}
              />
              <TextField fullWidth label="Dirección" name="address" value={formData.address} onChange={handleChange} sx={{ mb: 2 }}
                InputProps={{ startAdornment: <InputAdornment position="start"><LocationIcon sx={{ color: '#1565c0' }} /></InputAdornment> }}
              />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Tipo de Sangre Necesario *</InputLabel>
                    <Select name="blood_type_needed" value={formData.blood_type_needed} onChange={handleChange} label="Tipo de Sangre Necesario *"
                      startAdornment={<InputAdornment position="start"><BloodIcon sx={{ color: '#c62828', ml: 1 }} /></InputAdornment>}
                    >
                      {BLOOD_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Nivel de Urgencia</InputLabel>
                    <Select name="urgency" value={formData.urgency} onChange={handleChange} label="Nivel de Urgencia">
                      {URGENCY_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* STEP 2 — Confirmar */}
          {step === 2 && (
            <Box sx={{ p: 2, backgroundColor: '#f8faff', borderRadius: 2, mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#1565c0' }}>
                Resumen del registro
              </Typography>
              {[
                { label: 'Usuario', value: formData.username },
                { label: 'Email', value: formData.email },
                { label: 'Nombre', value: formData.name },
                { label: 'Teléfono', value: formData.phone || 'No especificado' },
                { label: 'Dirección', value: formData.address || 'No especificada' },
                { label: 'Tipo de sangre necesario', value: formData.blood_type_needed },
                { label: 'Urgencia', value: URGENCY_OPTIONS.find(o => o.value === formData.urgency)?.label },
              ].map(({ label, value }) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" color="text.secondary">{label}:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{value}</Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            {step > 0 && (
              <Button onClick={() => { setStep(s => s - 1); setError(''); }} startIcon={<BackIcon />} sx={{ textTransform: 'none', fontWeight: 600 }}>
                Atrás
              </Button>
            )}
            <Box sx={{ flexGrow: 1 }} />
            {step < 2 ? (
              <Button variant="contained" onClick={handleNext} endIcon={<NextIcon />}
                sx={{ textTransform: 'none', fontWeight: 700, px: 3, background: 'linear-gradient(135deg, #1565c0, #1976d2)', '&:hover': { background: 'linear-gradient(135deg, #0d47a1, #1565c0)' } }}
              >
                Siguiente
              </Button>
            ) : (
              <Button variant="contained" onClick={handleSubmit} disabled={loading}
                startIcon={loading ? <CircularProgress size={18} sx={{ color: 'white' }} /> : <SuccessIcon />}
                sx={{ textTransform: 'none', fontWeight: 700, px: 3, background: 'linear-gradient(135deg, #1565c0, #1976d2)', '&:hover': { background: 'linear-gradient(135deg, #0d47a1, #1565c0)' } }}
              >
                {loading ? 'Registrando...' : 'Crear Cuenta'}
              </Button>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary" align="center">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" style={{ color: '#1565c0', fontWeight: 600, textDecoration: 'none' }}>
              Iniciar sesión
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

export default RequesterRegister;
