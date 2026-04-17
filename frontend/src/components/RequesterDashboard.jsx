import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Card,
  CardContent,
  CardActions,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

function RequesterDashboard() {
  const [donors, setDonors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchFilters, setSearchFilters] = useState({
    blood_type: '',
    name: '',
  });
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [requestData, setRequestData] = useState({
    reason: '',
    urgency: 'normal',
  });
  const [activeTab, setActiveTab] = useState('search'); // 'search' or 'requests'
  const token = localStorage.getItem('access_token');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchDonors = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/requester/donors?blood_type=${searchFilters.blood_type || ''}&name=${searchFilters.name || ''}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setDonors(response.data.donors || []);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Error al buscar donantes');
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/requests/outgoing`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setRequests(response.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchChange = (e) => {
    setSearchFilters({
      ...searchFilters,
      [e.target.name]: e.target.value,
    });
  };

  const handleSearch = () => {
    fetchDonors();
  };

  const handleOpenDialog = (donor) => {
    setSelectedDonor(donor);
    setOpenDialog(true);
    setRequestData({ reason: '', urgency: 'normal' });
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedDonor(null);
  };

  const handleSubmitRequest = async () => {
    try {
      const payload = {
        donor_id: selectedDonor.id,
        reason: requestData.reason,
        urgency: requestData.urgency,
      };

      const response = await axios.post(`${API_BASE_URL}/requester/requests`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      alert('Solicitud enviada exitosamente');
      handleCloseDialog();
      fetchRequests();
    } catch (err) {
      console.error(err);
      alert('Error al enviar solicitud');
    }
  };

  const bloodTypes = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Panel de Solicitante
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Tabs */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <Button
          variant={activeTab === 'search' ? 'contained' : 'outlined'}
          onClick={() => setActiveTab('search')}
        >
          Buscar Donantes
        </Button>
        <Button
          variant={activeTab === 'requests' ? 'contained' : 'outlined'}
          onClick={() => setActiveTab('requests')}
        >
          Mis Solicitudes ({requests.length})
        </Button>
      </Box>

      {/* Búsqueda de Donantes */}
      {activeTab === 'search' && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Buscar Donantes
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Sangre</InputLabel>
              <Select
                name="blood_type"
                value={searchFilters.blood_type}
                onChange={handleSearchChange}
                label="Tipo de Sangre"
              >
                <MenuItem value="">Todos</MenuItem>
                {bloodTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Nombre"
              name="name"
              value={searchFilters.name}
              onChange={handleSearchChange}
            />

            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </Button>
          </Box>

          {loading ? (
            <CircularProgress />
          ) : (
            <Grid container spacing={2}>
              {donors.length > 0 ? (
                donors.map((donor) => (
                  <Grid item xs={12} sm={6} md={4} key={donor.id}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6">{donor.name}</Typography>
                        <Typography color="textSecondary">
                          {donor.blood_type}
                        </Typography>
                        <Typography variant="body2">
                          Edad: {donor.age}
                        </Typography>
                        <Typography variant="body2">
                          Email: {donor.email}
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={() => handleOpenDialog(donor)}
                        >
                          Solicitar Donación
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))
              ) : (
                <Typography>No se encontraron donantes</Typography>
              )}
            </Grid>
          )}
        </Paper>
      )}

      {/* Mis Solicitudes */}
      {activeTab === 'requests' && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Mis Solicitudes de Donación
          </Typography>

          {requests.length > 0 ? (
            <Grid container spacing={2}>
              {requests.map((req) => (
                <Grid item xs={12} sm={6} md={4} key={req.id}>
                  <Card>
                    <CardContent>
                      <Chip
                        label={req.status}
                        color={
                          req.status === 'pending'
                            ? 'warning'
                            : req.status === 'approved'
                            ? 'success'
                            : 'error'
                        }
                        size="small"
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="body2">
                        <strong>Donante:</strong> Donador #{req.donor_id}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Razón:</strong> {req.reason || 'Sin especificar'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Urgencia:</strong> {req.urgency}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Creada: {new Date(req.created_at).toLocaleDateString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography>No tienes solicitudes</Typography>
          )}
        </Paper>
      )}

      {/* Dialog para Solicitud */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Solicitar Donación</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedDonor && (
            <Box>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Donante:</strong> {selectedDonor.name} ({selectedDonor.blood_type})
              </Typography>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Razón de la Solicitud"
                value={requestData.reason}
                onChange={(e) => setRequestData({ ...requestData, reason: e.target.value })}
                sx={{ mb: 2 }}
              />

              <FormControl fullWidth>
                <InputLabel>Urgencia</InputLabel>
                <Select
                  value={requestData.urgency}
                  onChange={(e) => setRequestData({ ...requestData, urgency: e.target.value })}
                  label="Urgencia"
                >
                  <MenuItem value="low">Baja</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="high">Alta</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmitRequest} variant="contained" color="primary">
            Enviar Solicitud
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default RequesterDashboard;
