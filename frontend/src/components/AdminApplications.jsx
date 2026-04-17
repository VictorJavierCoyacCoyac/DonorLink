import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Box,
  Alert,
  Chip,
} from '@mui/material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionType, setActionType] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(
        `${API_BASE_URL}/donor-applications?status=pending`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setApplications(response.data.applications || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Error al cargar las aplicaciones');
      setLoading(false);
    }
  };

  const handleOpenDialog = (app, action) => {
    setSelectedApp(app);
    setActionType(action);
    setReviewNotes('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedApp(null);
    setReviewNotes('');
    setActionType(null);
  };

  const handleApprove = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.patch(
        `${API_BASE_URL}/donor-applications/${selectedApp.id}/approve`,
        { review_notes: reviewNotes },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Show credentials
      alert(`Aplicación aprobada!\n\nCredenciales temporales:\nUsuario: ${response.data.username}\nContraseña: ${response.data.temporary_password}\n\nEl usuario debe cambiar la contraseña en el primer login.`);

      handleCloseDialog();
      fetchApplications();
    } catch (err) {
      console.error(err);
      setError('Error al aprobar la aplicación');
    }
  };

  const handleReject = async () => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.patch(
        `${API_BASE_URL}/donor-applications/${selectedApp.id}/reject`,
        { review_notes: reviewNotes },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert('Aplicación rechazada');
      handleCloseDialog();
      fetchApplications();
    } catch (err) {
      console.error(err);
      setError('Error al rechazar la aplicación');
    }
  };

  if (loading) {
    return <Container><Typography>Cargando...</Typography></Container>;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Solicitudes de Donantes
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {applications.length === 0 ? (
        <Alert severity="info">No hay solicitudes pendientes</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell>Nombre</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Tipo Sangre</TableCell>
                <TableCell>Edad</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {applications.map((app) => (
                <TableRow key={app.id} hover>
                  <TableCell>{app.full_name}</TableCell>
                  <TableCell>{app.email}</TableCell>
                  <TableCell>{app.blood_type}</TableCell>
                  <TableCell>{app.age}</TableCell>
                  <TableCell>
                    <Chip
                      label={app.status}
                      color={app.status === 'pending' ? 'warning' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      onClick={() => handleOpenDialog(app, 'approve')}
                      sx={{ mr: 1 }}
                    >
                      Aprobar
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      color="error"
                      onClick={() => handleOpenDialog(app, 'reject')}
                    >
                      Rechazar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionType === 'approve' ? 'Aprobar' : 'Rechazar'} Aplicación
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedApp && (
            <Box>
              <Typography variant="body2">
                <strong>Nombre:</strong> {selectedApp.full_name}
              </Typography>
              <Typography variant="body2">
                <strong>Email:</strong> {selectedApp.email}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notas de Revisión"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          {actionType === 'approve' ? (
            <Button onClick={handleApprove} color="success" variant="contained">
              Aprobar
            </Button>
          ) : (
            <Button onClick={handleReject} color="error" variant="contained">
              Rechazar
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default AdminApplications;
