import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

function RequesterRegister() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    address: '',
    blood_type_needed: 'O+',
    urgency: '',
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
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        blood_type_needed: formData.blood_type_needed,
        urgency: formData.urgency,
      };

      await axios.post(`${API_BASE_URL}/requester/register`, payload);
      
      // Auto-login after registration
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        username: formData.username,
        password: formData.password,
      });

      localStorage.setItem('access_token', loginResponse.data.access_token);
      localStorage.setItem('refresh_token', loginResponse.data.refresh_token);

      navigate('/');
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
        err.message ||
        'Error al registrar'
      );
    } finally {
      setLoading(false);
    }
  };

  const bloodTypes = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ marginTop: 4, marginBottom: 4 }}>
        <Paper elevation={3} sx={{ padding: 4 }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Registro de Solicitante
          </Typography>
          <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 3 }}>
            Registrate para buscar donantes de sangre
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Usuario"
              name="username"
              value={formData.username}
              onChange={handleChange}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              label="Nombre Completo"
              name="name"
              value={formData.name}
              onChange={handleChange}
            />

            <TextField
              margin="normal"
              fullWidth
              label="Teléfono"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />

            <TextField
              margin="normal"
              fullWidth
              label="Dirección"
              name="address"
              value={formData.address}
              onChange={handleChange}
            />

            <FormControl fullWidth margin="normal" required>
              <InputLabel>Tipo de Sangre Necesario</InputLabel>
              <Select
                name="blood_type_needed"
                value={formData.blood_type_needed}
                onChange={handleChange}
                label="Tipo de Sangre Necesario"
              >
                {bloodTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              margin="normal"
              fullWidth
              label="Urgencia"
              name="urgency"
              value={formData.urgency}
              onChange={handleChange}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              label="Contraseña"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              helperText="Mínimo 8 caracteres, 1 mayúscula, 1 número"
            />

            <TextField
              margin="normal"
              required
              fullWidth
              label="Confirmar Contraseña"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Registrando...' : 'Registrarse'}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" style={{ color: '#d32f2f', textDecoration: 'none' }}>
                  Inicia sesión
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default RequesterRegister;
