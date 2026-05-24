import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import axios from 'axios';

import { API_BASE_URL } from '../config/api';

function DonorApplication() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    blood_type: 'O+',
    age: '',
    weight: '',
  });
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch questionnaire
    const fetchQuestions = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/donor-questionnaire`);
        setQuestions(response.data || []);
      } catch (err) {
        console.error('Error fetching questions:', err);
        setError('No se pudieron cargar las preguntas del cuestionario');
      } finally {
        setLoadingQuestions(false);
      }
    };
    fetchQuestions();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers({
      ...answers,
      [questionId]: answer,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...formData,
        age: parseInt(formData.age),
        weight: parseFloat(formData.weight),
        questionnaire_answers: answers,
      };

      const response = await axios.post(`${API_BASE_URL}/donor-applications`, payload);
      setSuccess('¡Aplicación enviada exitosamente! Tu solicitud será revisada por nuestro equipo.');
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        address: '',
        blood_type: 'O+',
        age: '',
        weight: '',
      });
      setAnswers({});
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
        err.message ||
        'Error al enviar la aplicación'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loadingQuestions) {
    return <Container><Typography>Cargando formulario...</Typography></Container>;
  }

  const bloodTypes = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

  return (
    <Container component="main" maxWidth="md">
      <Box sx={{ marginTop: 4, marginBottom: 4 }}>
        <Paper elevation={3} sx={{ padding: 4 }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Aplicación de Donante
          </Typography>
          <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 3 }}>
            Completa este formulario para solicitar ser donante de sangre
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            {/* Información Personal */}
            <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
              Información Personal
            </Typography>

            <TextField
              margin="normal"
              required
              fullWidth
              label="Nombre Completo"
              name="full_name"
              value={formData.full_name}
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

            {/* Información de Salud */}
            <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
              Información de Salud
            </Typography>

            <FormControl fullWidth margin="normal" required>
              <InputLabel>Tipo de Sangre</InputLabel>
              <Select
                name="blood_type"
                value={formData.blood_type}
                onChange={handleChange}
                label="Tipo de Sangre"
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
              required
              fullWidth
              label="Edad"
              name="age"
              type="number"
              value={formData.age}
              onChange={handleChange}
              inputProps={{ min: 18, max: 120 }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              label="Peso (kg)"
              name="weight"
              type="number"
              value={formData.weight}
              onChange={handleChange}
              inputProps={{ min: 50, max: 200, step: 0.1 }}
            />

            {/* Cuestionario */}
            {questions.length > 0 && (
              <>
                <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                  Cuestionario
                </Typography>
                {questions.map((question) => (
                  <Box key={question.id} sx={{ mb: 2 }}>
                    <Typography variant="body1">{question.question_text}</Typography>
                    {question.question_type === 'yes_no' && (
                      <FormControl fullWidth margin="normal">
                        <Select
                          value={answers[question.id] || ''}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        >
                          <MenuItem value="">-- Selecciona una opción --</MenuItem>
                          <MenuItem value="Sí">Sí</MenuItem>
                          <MenuItem value="No">No</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                    {question.question_type === 'text' && (
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        margin="normal"
                        value={answers[question.id] || ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      />
                    )}
                  </Box>
                ))}
              </>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Enviando...' : 'Enviar Aplicación'}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" style={{ color: '#d32f2f', textDecoration: 'none' }}>
                  Inicia sesión aquí
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default DonorApplication;
