import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import axios from 'axios';

import { API_BASE_URL } from '../config/api';

const bloodTypes = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

function DonorForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    blood_type: '',
    age: '',
    weight: '',
    last_donation_date: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditing) {
      fetchDonor();
    }
  }, [id]);

  const fetchDonor = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE_URL}/donors/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const donor = response.data;
      setFormData({
        name: donor.name,
        email: donor.email,
        blood_type: donor.blood_type,
        age: donor.age.toString(),
        weight: donor.weight.toString(),
        last_donation_date: donor.last_donation_date || '',
      });
    } catch (error) {
      console.error('Error fetching donor:', error);
      setError('Failed to load donor data');
    }
  };

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
      const token = localStorage.getItem('access_token');
      const data = {
        ...formData,
        age: parseInt(formData.age),
        weight: parseFloat(formData.weight),
        last_donation_date: formData.last_donation_date || null,
      };

      if (isEditing) {
        await axios.patch(`${API_BASE_URL}/donors/${id}`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${API_BASE_URL}/donors`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      navigate('/donors');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save donor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            {isEditing ? 'Edit Donor' : 'Add New Donor'}
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="name"
              label="Full Name"
              name="name"
              autoComplete="name"
              autoFocus
              value={formData.name}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Blood Type</InputLabel>
              <Select
                name="blood_type"
                value={formData.blood_type}
                label="Blood Type"
                onChange={handleChange}
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
              name="age"
              label="Age"
              type="number"
              id="age"
              inputProps={{ min: 18, max: 120 }}
              value={formData.age}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="weight"
              label="Weight (kg)"
              type="number"
              id="weight"
              inputProps={{ min: 50, step: 0.1 }}
              value={formData.weight}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              fullWidth
              name="last_donation_date"
              label="Last Donation Date"
              type="date"
              id="last_donation_date"
              InputLabelProps={{ shrink: true }}
              value={formData.last_donation_date}
              onChange={handleChange}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Saving...' : (isEditing ? 'Update Donor' : 'Add Donor')}
            </Button>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => navigate('/donors')}
            >
              Cancel
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default DonorForm;