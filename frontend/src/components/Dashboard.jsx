import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import axios from 'axios';

import { API_BASE_URL } from '../config/api';
const ROLE_LABELS = {
  admin: 'Administrador',
  staff: 'Staff',
  donor: 'Donante',
  requester: 'Solicitante',
};

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const token = localStorage.getItem('access_token');
    try {
      const [meResp, statsResp] = await Promise.all([
        axios.get(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/statistics/donors`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setUser(meResp.data);
      setStats(statsResp.data);

      if (meResp.data.role === 'admin') {
        const metricsResp = await axios.get(`${API_BASE_URL}/admin/metrics`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMetrics(metricsResp.data);
      }

      if (meResp.data.role === 'donor') {
        await fetchIncomingRequests(token);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIncomingRequests = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/requests/incoming`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(response.data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
      setRequests([]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
  };

  const handleOpenPasswordDialog = () => {
    setPasswordError('');
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordDialogOpen(true);
  };

  const handleClosePasswordDialog = () => {
    setPasswordDialogOpen(false);
    setPasswordError('');
  };

  const handlePasswordChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };

  const handleSubmitPassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Las contraseñas nuevas no coinciden');
      return;
    }

    const token = localStorage.getItem('access_token');
    try {
      await axios.post(
        `${API_BASE_URL}/auth/change-password`,
        {
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setPasswordSuccess('Contraseña actualizada correctamente');
      setSnackbarOpen(true);
      handleClosePasswordDialog();
    } catch (error) {
      console.error('Error updating password:', error);
      setPasswordError(error.response?.data?.detail || 'Error al cambiar la contraseña');
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
    setPasswordSuccess('');
  };

  if (loading) {
    return <Typography sx={{ mt: 10, textAlign: 'center' }}>Cargando dashboard...</Typography>;
  }

  const displayName = user ? (user.username || ROLE_LABELS[user.role?.toLowerCase()] || 'Usuario') : 'Usuario';
  const displayRole = ROLE_LABELS[user?.role?.toLowerCase()] || user?.role || 'N/A';

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 5, gap: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Bienvenido, {displayName}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Rol activo: <Chip label={displayRole} color="primary" size="small" />
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button variant="outlined" color="secondary" onClick={handleOpenPasswordDialog} size="small">
            Cambiar contraseña
          </Button>
          <Button variant="contained" color="error" onClick={handleLogout} size="small">
            Cerrar sesión
          </Button>
        </Box>
      </Box>

      {user?.role === 'admin' ? (
        <>
          <Paper sx={{ p: 4, mb: 6, backgroundColor: '#f5f7ff', borderRadius: 3, boxShadow: 2 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 3, color: '#1976d2' }}>
              Privilegios del administrador
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              <Box
                component={Link}
                to="/admin/applications"
                sx={{
                  p: 2,
                  textDecoration: 'none',
                  borderLeft: '4px solid #1976d2',
                  backgroundColor: '#ffffff',
                  borderRadius: 1,
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: '#e3f2fd',
                    transform: 'translateX(4px)'
                  }
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                  Solicitudes
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Revisar y aprobar donantes
                </Typography>
              </Box>

              <Box
                component={Link}
                to="/admin/users"
                sx={{
                  p: 2,
                  textDecoration: 'none',
                  borderLeft: '4px solid #1976d2',
                  backgroundColor: '#ffffff',
                  borderRadius: 1,
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: '#e3f2fd',
                    transform: 'translateX(4px)'
                  }
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                  Usuarios
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Gestionar roles y acceso
                </Typography>
              </Box>

              <Box
                component={Link}
                to="/admin/config"
                sx={{
                  p: 2,
                  textDecoration: 'none',
                  borderLeft: '4px solid #1976d2',
                  backgroundColor: '#ffffff',
                  borderRadius: 1,
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: '#e3f2fd',
                    transform: 'translateX(4px)'
                  }
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                  Configuración
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Parámetros del sistema
                </Typography>
              </Box>

              <Box
                component={Link}
                to="/admin/audit"
                sx={{
                  p: 2,
                  textDecoration: 'none',
                  borderLeft: '4px solid #1976d2',
                  backgroundColor: '#ffffff',
                  borderRadius: 1,
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: '#e3f2fd',
                    transform: 'translateX(4px)'
                  }
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                  Auditoría
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Ver eventos del sistema
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 6, justifyContent: 'center' }}>
            <Button component={Link} to="/admin/applications" variant="contained" color="primary" size="large">
              📋 Ver Solicitudes
            </Button>
            <Button component={Link} to="/admin/donors" variant="contained" color="secondary" size="large">
              💉 Gestionar Donantes
            </Button>
            <Button component={Link} to="/admin/users" variant="outlined" color="primary" size="large">
              👥 Gestionar Usuarios
            </Button>
            <Button component={Link} to="/admin/config" variant="outlined" color="primary" size="large">
              ⚙️ Configuración
            </Button>
            <Button component={Link} to="/admin/audit" variant="outlined" color="primary" size="large">
              📊 Ver Logs
            </Button>
          </Box>

          <Typography variant="h5" gutterBottom sx={{ mt: 6, mb: 3 }}>Resumen del sistema</Typography>
          <Grid container spacing={3}>
            {metrics ? (
              [
                { label: 'Usuarios totales', value: metrics.total_users },
                { label: 'Usuarios activos', value: metrics.active_users },
                { label: 'Donantes', value: metrics.total_donors },
                { label: 'Solicitantes', value: metrics.total_requesters },
                { label: 'Donaciones', value: metrics.total_donations },
                { label: 'Mensajes', value: metrics.total_messages },
                { label: 'Logs de auditoría', value: metrics.total_audit_logs },
              ].map((item) => (
                <Grid item xs={12} sm={6} md={4} key={item.label}>
                  <Card sx={{ minHeight: 120, display: 'flex', alignItems: 'center' }}>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        {item.label}
                      </Typography>
                      <Typography variant="h4">{item.value}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            ) : (
              <Grid item xs={12}>
                <Typography color="text.secondary">No se pudieron cargar las métricas del admin.</Typography>
              </Grid>
            )}
          </Grid>
        </>
      ) : (
        <>
          {user?.role === 'donor' && (
            <Paper sx={{ p: 3, mb: 4, backgroundColor: '#f7fbff' }}>
              <Typography variant="h6" gutterBottom>
                Solicitudes de personas que te buscan
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Estas son las solicitudes de donación dirigidas a tu perfil. Puedes revisar el estado y responder cuando estés listo.
              </Typography>
              {requests.length > 0 ? (
                <Grid container spacing={2}>
                  {requests.map((request) => (
                    <Grid item xs={12} md={6} key={request.id}>
                      <Card sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Solicitud #{request.id}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Solicitante:</strong> {request.requester_id}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Estado:</strong> {request.status}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Urgencia:</strong> {request.urgency || 'Normal'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Razón:</strong> {request.reason || 'Sin detalle adicional'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Recibida: {new Date(request.created_at).toLocaleDateString()}
                        </Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography color="text.secondary">Aún no tienes solicitudes pendientes.</Typography>
              )}
            </Paper>
          )}

          <Typography variant="h5" gutterBottom>Resumen del sistema</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Donantes registrados
                </Typography>
                <Typography variant="h4">{stats?.total_donors ?? 'N/A'}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Donantes activos
                </Typography>
                <Typography variant="h4">{stats?.active_donors ?? 'N/A'}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Donaciones totales
                </Typography>
                <Typography variant="h4">{stats?.total_donations ?? 'N/A'}</Typography>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}

      <Dialog open={passwordDialogOpen} onClose={handleClosePasswordDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Cambiar contraseña</DialogTitle>
        <DialogContent>
          <TextField
            margin="normal"
            fullWidth
            type="password"
            label="Contraseña actual"
            name="currentPassword"
            value={passwordForm.currentPassword}
            onChange={handlePasswordChange}
          />
          <TextField
            margin="normal"
            fullWidth
            type="password"
            label="Nueva contraseña"
            name="newPassword"
            value={passwordForm.newPassword}
            onChange={handlePasswordChange}
          />
          <TextField
            margin="normal"
            fullWidth
            type="password"
            label="Confirmar nueva contraseña"
            name="confirmPassword"
            value={passwordForm.confirmPassword}
            onChange={handlePasswordChange}
          />
          {passwordError && (
            <Typography color="error" sx={{ mt: 1 }}>
              {passwordError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePasswordDialog}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmitPassword}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbarOpen} autoHideDuration={5000} onClose={handleCloseSnackbar}>
        <Alert severity="success" sx={{ width: '100%' }} onClose={handleCloseSnackbar}>
          {passwordSuccess}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default Dashboard;
