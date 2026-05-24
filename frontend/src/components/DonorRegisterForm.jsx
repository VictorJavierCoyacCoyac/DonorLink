import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert,
  CircularProgress, Divider, InputAdornment, IconButton, FormControl,
  InputLabel, Select, MenuItem, Stepper, Step, StepLabel, Grid,
  Chip, LinearProgress,
} from '@mui/material';
import {
  Bloodtype as BloodIcon,
  PersonOutline as PersonIcon,
  EmailOutlined as EmailIcon,
  LockOutlined as LockIcon,
  PhoneOutlined as PhoneIcon,
  LocationOnOutlined as LocationIcon,
  FitnessCenter as WeightIcon,
  Cake as AgeIcon,
  Visibility, VisibilityOff,
  ArrowForward as NextIcon,
  ArrowBack as BackIcon,
  CheckCircleOutline as SuccessIcon,
  QuestionAnswer as QuestionIcon,
} from '@mui/icons-material';
import axios from 'axios';

import { API_BASE_URL } from '../config/api';
const BLOOD_TYPES = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
const STEPS = ['Datos Personales', 'Cuestionario', 'Crear Cuenta', 'Confirmar'];

function DonorRegisterForm() {
  const [activeStep, setActiveStep] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '', email: '', phone: '', address: '',
    blood_type: 'O+', age: '', weight: '',
    username: '', password: '', confirmPassword: '',
  });
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    axios.get(`${API_BASE_URL}/donor-questionnaire`)
      .then((r) => setQuestions(r.data || []))
      .catch(() => setQuestions([]))
      .finally(() => setLoadingQuestions(false));
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleAnswer = (qId, val) => setAnswers({ ...answers, [qId]: val });

  const validateStep = (step) => {
    if (step === 0) {
      if (!formData.full_name || formData.full_name.trim().length < 2)
        return 'El nombre debe tener al menos 2 caracteres';
      if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
        return 'Ingresa un email válido';
      if (!formData.age || isNaN(formData.age))
        return 'Ingresa una edad válida';
      const age = parseInt(formData.age);
      if (age < 18 || age > 65)
        return 'La edad debe estar entre 18 y 65 años para ser donante';
      if (!formData.weight || isNaN(formData.weight))
        return 'Ingresa un peso válido';
      if (parseFloat(formData.weight) < 50)
        return 'El peso mínimo para donar es 50 kg';
    }
    if (step === 2) {
      if (!formData.username || formData.username.length < 3)
        return 'El usuario debe tener al menos 3 caracteres';
      if (!/^[a-zA-Z0-9_-]+$/.test(formData.username))
        return 'El usuario solo puede tener letras, números, _ y -';
      if (!formData.password || formData.password.length < 8)
        return 'La contraseña debe tener al menos 8 caracteres';
      if (!/[A-Z]/.test(formData.password))
        return 'La contraseña debe tener al menos una letra mayúscula';
      if (!/[0-9]/.test(formData.password))
        return 'La contraseña debe tener al menos un número';
      if (formData.password !== formData.confirmPassword)
        return 'Las contraseñas no coinciden';
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(activeStep);
    if (err) { setError(err); return; }
    setError('');
    setActiveStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone || null,
        address: formData.address || null,
        blood_type: formData.blood_type,
        age: parseInt(formData.age),
        weight: parseFloat(formData.weight),
        username: formData.username.trim(),
        password: formData.password,
        questionnaire_answers: answers,
      };

      await axios.post(`${API_BASE_URL}/auth/donors/register`, payload);

      const loginResp = await axios.post(`${API_BASE_URL}/auth/login`, {
        username: formData.username.trim(),
        password: formData.password,
      });

      localStorage.setItem('access_token', loginResp.data.access_token);
      localStorage.setItem('refresh_token', loginResp.data.refresh_token);
      localStorage.setItem('user_role', 'donor');

      window.location.href = '/donor-dashboard';
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg).join('. '));
      } else {
        setError(detail || err.message || 'Error al registrar. Verifica los datos e intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      position: 'fixed', inset: 0,
      overflowY: 'auto',
      background: 'linear-gradient(135deg, #1a0000 0%, #6b0000 40%, #c62828 70%, #e53935 100%)',
      py: 4,
    }}>
      {/* Decorative blobs */}
      <Box sx={{ position: 'fixed', top: '-80px', left: '-80px', width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
      <Box sx={{ position: 'fixed', bottom: '-100px', right: '-60px', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

      <Card sx={{ width: '100%', maxWidth: 560, mx: 'auto', px: 2, borderRadius: 4, boxShadow: '0 24px 60px rgba(0,0,0,0.5)', background: 'rgba(255,255,255,0.98)', position: 'relative' }}>
        <Box sx={{ height: 6, background: 'linear-gradient(90deg, #b71c1c, #e53935, #ef9a9a)', borderRadius: '16px 16px 0 0' }} />

        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 68, height: 68, borderRadius: '50%', background: 'linear-gradient(135deg, #c62828, #e53935)', mb: 1.5, boxShadow: '0 8px 20px rgba(198,40,40,0.4)' }}>
              <BloodIcon sx={{ fontSize: 34, color: 'white' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#1a1a1a' }}>
              Registro de Donante
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tu registro es aprobado automáticamente — estarás listo de inmediato
            </Typography>
          </Box>

          {/* Stepper */}
          <Stepper activeStep={activeStep} sx={{ mb: 3 }} alternativeLabel>
            {STEPS.map((label) => (
              <Step key={label}><StepLabel>{label}</StepLabel></Step>
            ))}
          </Stepper>

          {/* Progress */}
          <LinearProgress
            variant="determinate"
            value={((activeStep) / (STEPS.length - 1)) * 100}
            sx={{ mb: 3, height: 4, borderRadius: 2, backgroundColor: '#ffcdd2', '& .MuiLinearProgress-bar': { backgroundColor: '#c62828' } }}
          />

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

          {/* STEP 0 — Datos Personales */}
          {activeStep === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField fullWidth label="Nombre Completo *" name="full_name" value={formData.full_name} onChange={handleChange}
                  InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon sx={{ color: '#c62828' }} /></InputAdornment> }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Email *" name="email" type="email" value={formData.email} onChange={handleChange}
                  InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: '#c62828' }} /></InputAdornment> }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Teléfono" name="phone" value={formData.phone} onChange={handleChange}
                  InputProps={{ startAdornment: <InputAdornment position="start"><PhoneIcon sx={{ color: '#c62828' }} /></InputAdornment> }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Sangre *</InputLabel>
                  <Select name="blood_type" value={formData.blood_type} onChange={handleChange} label="Tipo de Sangre *">
                    {BLOOD_TYPES.map((t) => (
                      <MenuItem key={t} value={t}>
                        <Chip label={t} size="small" sx={{ backgroundColor: '#ffebee', color: '#c62828', fontWeight: 800, mr: 1 }} />{t}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Edad *" name="age" type="number" value={formData.age} onChange={handleChange}
                  inputProps={{ min: 18, max: 65 }}
                  helperText="18–65 años"
                  InputProps={{ startAdornment: <InputAdornment position="start"><AgeIcon sx={{ color: '#c62828' }} /></InputAdornment> }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Peso (kg) *" name="weight" type="number" value={formData.weight} onChange={handleChange}
                  inputProps={{ min: 50, step: 0.1 }}
                  helperText="Mínimo 50 kg"
                  InputProps={{ startAdornment: <InputAdornment position="start"><WeightIcon sx={{ color: '#c62828' }} /></InputAdornment> }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Dirección" name="address" value={formData.address} onChange={handleChange}
                  InputProps={{ startAdornment: <InputAdornment position="start"><LocationIcon sx={{ color: '#c62828' }} /></InputAdornment> }}
                />
              </Grid>
            </Grid>
          )}

          {/* STEP 1 — Cuestionario */}
          {activeStep === 1 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <QuestionIcon sx={{ color: '#c62828' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Cuestionario de Salud</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Responde estas preguntas para completar tu perfil médico
              </Typography>
              {loadingQuestions ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress sx={{ color: '#c62828' }} /></Box>
              ) : questions.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {questions.map((q, idx) => (
                    <Box key={q.id} sx={{ p: 2.5, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: answers[q.id] ? '#fff8f8' : 'transparent', borderColor: answers[q.id] ? '#ffcdd2' : '#e0e0e0' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
                        {idx + 1}. {q.question_text}
                      </Typography>
                      {q.question_type === 'yes_no' ? (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {['yes', 'no'].map((val) => (
                            <Button
                              key={val}
                              size="small"
                              variant={answers[q.id] === val ? 'contained' : 'outlined'}
                              onClick={() => handleAnswer(q.id, val)}
                              sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                borderColor: '#c62828',
                                color: answers[q.id] === val ? 'white' : '#c62828',
                                backgroundColor: answers[q.id] === val ? '#c62828' : 'transparent',
                                '&:hover': { backgroundColor: answers[q.id] === val ? '#b71c1c' : '#ffebee' },
                              }}
                            >
                              {val === 'yes' ? 'Sí' : 'No'}
                            </Button>
                          ))}
                        </Box>
                      ) : (
                        <TextField
                          size="small"
                          fullWidth
                          multiline
                          rows={2}
                          placeholder="Escribe tu respuesta..."
                          value={answers[q.id] || ''}
                          onChange={(e) => handleAnswer(q.id, e.target.value)}
                        />
                      )}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  No hay preguntas disponibles. Puedes continuar con el registro.
                </Alert>
              )}
            </Box>
          )}

          {/* STEP 2 — Crear Cuenta */}
          {activeStep === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField fullWidth label="Nombre de Usuario *" name="username" value={formData.username} onChange={handleChange}
                helperText="Solo letras, números, _ y -"
                InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon sx={{ color: '#c62828' }} /></InputAdornment> }}
              />
              <TextField fullWidth label="Contraseña *" name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange}
                helperText="Mínimo 8 caracteres, 1 mayúscula, 1 número"
                InputProps={{
                  startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: '#c62828' }} /></InputAdornment>,
                  endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} size="small">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>,
                }}
              />
              <TextField fullWidth label="Confirmar Contraseña *" name="confirmPassword" type={showConfirm ? 'text' : 'password'} value={formData.confirmPassword} onChange={handleChange}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: '#c62828' }} /></InputAdornment>,
                  endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowConfirm(!showConfirm)} size="small">{showConfirm ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>,
                }}
              />
            </Box>
          )}

          {/* STEP 3 — Confirmar */}
          {activeStep === 3 && (
            <Box>
              <Box sx={{ p: 2.5, backgroundColor: '#fff8f8', borderRadius: 2, mb: 2, border: '1px solid #ffcdd2' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#c62828', mb: 2 }}>
                  Resumen de tu registro
                </Typography>
                {[
                  { label: 'Nombre', value: formData.full_name },
                  { label: 'Email', value: formData.email },
                  { label: 'Tipo de sangre', value: formData.blood_type },
                  { label: 'Edad', value: `${formData.age} años` },
                  { label: 'Peso', value: `${formData.weight} kg` },
                  { label: 'Usuario', value: formData.username },
                  { label: 'Preguntas respondidas', value: `${Object.keys(answers).length} / ${questions.length}` },
                ].map(({ label, value }) => (
                  <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                    <Typography variant="body2" color="text.secondary">{label}:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{value}</Typography>
                  </Box>
                ))}
              </Box>
              <Alert severity="success" icon={<SuccessIcon />} sx={{ borderRadius: 2 }}>
                Tu cuenta será <strong>aprobada automáticamente</strong>. Podrás donar de inmediato una vez registrado.
              </Alert>
            </Box>
          )}

          {/* Navigation */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, gap: 2 }}>
            <Button
              onClick={() => { setActiveStep((s) => s - 1); setError(''); }}
              disabled={activeStep === 0 || loading}
              startIcon={<BackIcon />}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Atrás
            </Button>

            {activeStep < STEPS.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={<NextIcon />}
                sx={{ textTransform: 'none', fontWeight: 700, px: 3, background: 'linear-gradient(135deg, #c62828, #e53935)', boxShadow: '0 4px 12px rgba(198,40,40,0.35)', '&:hover': { background: 'linear-gradient(135deg, #b71c1c, #c62828)' } }}
              >
                {activeStep === 1 && questions.length === 0 ? 'Saltar' : 'Siguiente'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={18} sx={{ color: 'white' }} /> : <SuccessIcon />}
                sx={{ textTransform: 'none', fontWeight: 700, px: 3, background: 'linear-gradient(135deg, #c62828, #e53935)', boxShadow: '0 4px 12px rgba(198,40,40,0.35)', '&:hover': { background: 'linear-gradient(135deg, #b71c1c, #c62828)' } }}
              >
                {loading ? 'Creando cuenta...' : 'Completar Registro'}
              </Button>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary" align="center">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" style={{ color: '#c62828', fontWeight: 600, textDecoration: 'none' }}>
              Iniciar sesión
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

export default DonorRegisterForm;
