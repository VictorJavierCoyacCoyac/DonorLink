import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

function DonorDashboard() {
  const [donor, setDonor] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [action, setAction] = useState(null);
  const [notes, setNotes] = useState('');
  const token = localStorage.getItem('access_token');

  useEffect(() => {
    fetchDonorData();
    fetchIncomingRequests();
  }, []);

  const fetchDonorData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Get donor details - in a real app, we'd get this from a dedicated endpoint
      setDonor(response.data);
    } catch (err) {
      console.error(err);
      setError('Error al cargar perfil');
    } finally {
      setLoading(false);
    }
  };

  const fetchIncomingRequests = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/requests/incoming`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setRequests(response.data || []);
    } catch (err) {
      console.error(err);
      setError('Error al cargar solicitudes');
    }
  };

  const handleOpenDialog = (request, actionType) => {
    setSelectedRequest(request);
    setAction(actionType);
    setNotes('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedRequest(null);
    setAction(null);
    setNotes('');
  };

  const handleApproveRequest = async () => {
    try {
      // Note: This endpoint may need to be created in the backend
      await axios.patch(
        `${API_BASE_URL}/requests/${selectedRequest.id}/approve`,
        { notes },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert('Solicitud aprobada');
      handleCloseDialog();
      fetchIncomingRequests();
    } catch (err) {
      console.error(err);
      alert('Error al aprobar solicitud');
    }
  };

  const handleRejectRequest = async () => {
    try {
      // Note: This endpoint may need to be created in the backend
      await axios.patch(
        `${API_BASE_URL}/requests/${selectedRequest.id}/reject`,
        { notes },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert('Solicitud rechazada');
      handleCloseDialog();
      fetchIncomingRequests();
    } catch (err) {
      console.error(err);
      alert('Error al rechazar solicitud');
    }
  };

  if (loading) {
    return (
      <Container>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Panel de Donante
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Perfil del Donante */}
      {donor && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Mi Perfil
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Nombre:</strong> {donor.username}
              </Typography>
              <Typography variant="body2">
                <strong>Email:</strong> {donor.email}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Rol:</strong> {donor.role}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Solicitudes Recibidas */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Solicitudes de Donación Recibidas ({requests.length})
        </Typography>

        {requests.length > 0 ? (
          <Grid container spacing={2}>
            {requests.map((request) => (
              <Grid item xs={12} sm={6} md={4} key={request.id}>
                <Card>
                  <CardContent>
                    <Chip
                      label={request.status}
                      color={
                        request.status === 'pending'
                          ? 'warning'
                          : request.status === 'approved'
                          ? 'success'
                          : 'error'
                      }
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="body2">
                      <strong>Solicitante ID:</strong> {request.requester_id}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Razón:</strong> {request.reason || 'Sin especificar'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Urgencia:</strong> {request.urgency}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Recibida: {new Date(request.created_at).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    {request.status === 'pending' && (
                      <>
                        <Button
                          size="small"
                          color="success"
                          variant="contained"
                          onClick={() => handleOpenDialog(request, 'approve')}
                        >
                          Aprobar
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          onClick={() => handleOpenDialog(request, 'reject')}
                        >
                          Rechazar
                        </Button>
                      </>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography color="textSecondary">
            No hay solicitudes en este momento
          </Typography>
        )}
      </Paper>

      {/* Dialog para Decisión */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {action === 'approve' ? 'Aprobar' : 'Rechazar'} Solicitud
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedRequest && (
            <Box>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Solicitante:</strong> Solicitante #{selectedRequest.requester_id}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notas (opcional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          {action === 'approve' ? (
            <Button onClick={handleApproveRequest} color="success" variant="contained">
              Aprobar
            </Button>
          ) : (
            <Button onClick={handleRejectRequest} color="error" variant="contained">
              Rechazar
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default DonorDashboard;
