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
  Avatar,
  Divider,
  Tab,
  Tabs,
  InputAdornment,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Switch,
  FormControlLabel,
  LinearProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Bloodtype as BloodIcon,
  LocalHospital as HospitalIcon,
  Verified as VerifiedIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Message as MessageIcon,
  Edit as EditIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import axios from 'axios';
import NotificationsPanel from './NotificationsPanel';
import ChatPanel from './ChatPanel';

import { API_BASE_URL } from '../config/api';

const URGENCY_LABELS = { low: 'Baja', normal: 'Normal', high: 'Alta' };
const URGENCY_COLORS = { low: 'success', normal: 'info', high: 'error' };
const STATUS_COLORS = { pending: 'warning', approved: 'success', rejected: 'error' };
const STATUS_LABELS = { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' };

const BLOOD_TYPES = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

// Donors compatible with a given recipient blood type
const COMPATIBLE_DONORS_FOR = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
};

const donorEligibility = (lastDonationDate) => {
  if (!lastDonationDate) return { eligible: true, daysLeft: 0 };
  const days = Math.floor((Date.now() - new Date(lastDonationDate)) / 86400000);
  const daysLeft = Math.max(0, 56 - days);
  return { eligible: daysLeft === 0, daysLeft };
};

function RequesterDashboard() {
  const [user, setUser] = useState(null);
  const [donors, setDonors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchFilters, setSearchFilters] = useState({ blood_type: '', name: '' });
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [requestData, setRequestData] = useState({ reason: '', urgency: 'normal' });
  const [tabValue, setTabValue] = useState(0);
  const [hasSearched, setHasSearched] = useState(true);
  const [contactRequests, setContactRequests] = useState([]);
  const [activeChatCr, setActiveChatCr] = useState(null);
  const [contactMsg, setContactMsg] = useState('');
  const [contactingDonor, setContactingDonor] = useState(null);
  const [contactDialog, setContactDialog] = useState(false);
  const [compatMode, setCompatMode] = useState(false);
  const [requesterProfile, setRequesterProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', address: '', blood_type_needed: '', urgency: 'normal' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);
  const token = localStorage.getItem('access_token');
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
    fetchDonors();
    fetchContactRequests();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const h = { headers: { Authorization: `Bearer ${token}` } };
      const [meResp, requestsResp, profileResp] = await Promise.all([
        axios.get(`${API_BASE_URL}/auth/me`, h),
        axios.get(`${API_BASE_URL}/requester/requests`, h).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/requester/profile`, h).catch(() => ({ data: null })),
      ]);
      setUser(meResp.data);
      setRequests(requestsResp.data || []);
      if (profileResp.data) {
        setRequesterProfile(profileResp.data);
        setProfileForm({
          name: profileResp.data.name || '',
          phone: profileResp.data.phone || '',
          address: profileResp.data.address || '',
          blood_type_needed: profileResp.data.blood_type_needed || '',
          urgency: profileResp.data.urgency || 'normal',
        });
      }
    } catch (err) {
      console.error(err);
      setError('Error al cargar el panel');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const { data } = await axios.patch(`${API_BASE_URL}/requester/profile`, {
        name: profileForm.name,
        phone: profileForm.phone || null,
        address: profileForm.address || null,
        blood_type_needed: profileForm.blood_type_needed || undefined,
        urgency: profileForm.urgency,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setRequesterProfile(data);
      setEditMode(false);
      setProfileMsg({ type: 'success', text: 'Perfil actualizado correctamente.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.detail || 'Error al guardar.' });
    } finally {
      setProfileSaving(false);
    }
  };

  const fetchDonors = async () => {
    try {
      setSearchLoading(true);
      setHasSearched(true);
      const params = new URLSearchParams();
      // In compat mode, skip the blood_type filter (handled client-side)
      if (searchFilters.blood_type && !compatMode) params.append('blood_type', searchFilters.blood_type);
      if (searchFilters.name) params.append('name', searchFilters.name);

      const response = await axios.get(
        `${API_BASE_URL}/requester/donors?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      let results = response.data.donors || response.data || [];

      // Client-side compatibility filter
      if (compatMode && searchFilters.blood_type) {
        const compatTypes = COMPATIBLE_DONORS_FOR[searchFilters.blood_type] || [searchFilters.blood_type];
        results = results.filter((d) => compatTypes.includes(d.blood_type));
      }

      setDonors(results);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Error al buscar donantes. Verifica tu conexión.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    try {
      await axios.post(
        `${API_BASE_URL}/requester/requests`,
        { donor_id: selectedDonor.id, reason: requestData.reason, urgency: requestData.urgency },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      handleCloseDialog();
      loadDashboard();
      setTabValue(1);
    } catch (err) {
      console.error(err);
      setError('Error al enviar la solicitud. Intenta de nuevo.');
    }
  };

  const handleOpenDialog = (donor) => {
    setSelectedDonor(donor);
    setRequestData({ reason: '', urgency: 'normal' });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedDonor(null);
  };

  const fetchContactRequests = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/chat/contact-requests/sent`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setContactRequests(res.data || []);
    } catch {
      // silent
    }
  };

  const handleSendContactRequest = async () => {
    if (!contactingDonor) return;
    try {
      await axios.post(
        `${API_BASE_URL}/chat/contact-requests`,
        { donor_id: contactingDonor.id, message: contactMsg.trim() || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setContactDialog(false);
      setContactingDonor(null);
      setContactMsg('');
      fetchContactRequests();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al enviar solicitud de contacto');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    window.location.href = '/login';
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4, background: 'linear-gradient(135deg, #f0f4ff 0%, #cfe8fc 100%)', minHeight: '100vh' }}>

      {/* Hero Header */}
      <Box sx={{
        background: 'linear-gradient(135deg, #1565c0 0%, #0288d1 60%, #26c6da 100%)',
        borderRadius: 3,
        p: 4,
        mb: 4,
        color: 'white',
        boxShadow: '0 8px 32px rgba(21,101,192,0.35)',
      }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm="auto">
            <Avatar sx={{
              width: 100,
              height: 100,
              backgroundColor: 'rgba(255,255,255,0.25)',
              fontSize: '3rem',
              border: '4px solid rgba(255,255,255,0.6)',
              fontWeight: 800,
            }}>
              {user?.username?.charAt(0)?.toUpperCase() || 'S'}
            </Avatar>
          </Grid>

          <Grid item xs={12} sm>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
              Bienvenido, {user?.username || 'Solicitante'}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.85, mb: 1.5 }}>
              {user?.email}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip
                label="Solicitante"
                icon={<HospitalIcon />}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: 700,
                  padding: '20px 10px',
                  '& .MuiChip-icon': { color: 'white' },
                }}
              />
              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                Miembro desde {new Date(user?.created_at || Date.now()).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm="auto">
            <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'row', sm: 'column' } }}>
              <Button
                onClick={handleLogout}
                startIcon={<LogoutIcon />}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  color: 'white',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.25)' },
                }}
              >
                Cerrar sesión
              </Button>
              <NotificationsPanel accentColor="#1565c0" />
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{
            background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
            color: 'white',
            boxShadow: '0 4px 20px rgba(21,101,192,0.3)',
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <SendIcon sx={{ fontSize: 28, mr: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Solicitudes Enviadas</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 800 }}>{requests.length}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>en total</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{
            background: 'linear-gradient(135deg, #e65100 0%, #f57c00 100%)',
            color: 'white',
            boxShadow: '0 4px 20px rgba(230,81,0,0.3)',
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PendingIcon sx={{ fontSize: 28, mr: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Pendientes</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 800 }}>{pendingCount}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>esperando respuesta</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{
            background: 'linear-gradient(135deg, #2e7d32 0%, #43a047 100%)',
            color: 'white',
            boxShadow: '0 4px 20px rgba(46,125,50,0.3)',
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircleIcon sx={{ fontSize: 28, mr: 1 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Aprobadas</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 800 }}>{approvedCount}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>donaciones conseguidas</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ '& .MuiTabs-indicator': { backgroundColor: '#1565c0', height: 3 } }}
        >
          <Tab label="Buscar Donantes" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab
            label={
              <Badge badgeContent={pendingCount} color="error" max={99}>
                <Box sx={{ pr: pendingCount > 0 ? 1.5 : 0 }}>Mis Solicitudes</Box>
              </Badge>
            }
          />
          <Tab label="Mi Perfil" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab
            label={
              <Badge badgeContent={contactRequests.filter(c => c.status === 'accepted').length} color="success" max={99}>
                <Box sx={{ pr: contactRequests.filter(c => c.status === 'accepted').length > 0 ? 1.5 : 0 }}>Mis Chats</Box>
              </Badge>
            }
          />
        </Tabs>
      </Paper>

      {/* Tab 0 — Buscar Donantes */}
      {tabValue === 0 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          {/* Search Bar */}
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Buscar Donantes Disponibles
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 160 }}>
              <InputLabel>Tipo de Sangre</InputLabel>
              <Select
                value={searchFilters.blood_type}
                onChange={(e) => setSearchFilters({ ...searchFilters, blood_type: e.target.value })}
                label="Tipo de Sangre"
                startAdornment={
                  <InputAdornment position="start">
                    <BloodIcon sx={{ color: '#c62828', ml: 1 }} />
                  </InputAdornment>
                }
              >
                <MenuItem value="">Todos</MenuItem>
                {BLOOD_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    <Chip label={t} size="small" sx={{ backgroundColor: '#ffebee', color: '#c62828', fontWeight: 700 }} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Switch checked={compatMode} onChange={(e) => setCompatMode(e.target.checked)} color="error" />}
              label={<Typography variant="body2" sx={{ fontWeight: 600, color: compatMode ? '#c62828' : 'text.secondary' }}>Incluir compatibles</Typography>}
              sx={{ ml: 0 }}
            />

            <TextField
              label="Buscar por nombre"
              value={searchFilters.name}
              onChange={(e) => setSearchFilters({ ...searchFilters, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && fetchDonors()}
              sx={{ flexGrow: 1, minWidth: 180 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon sx={{ color: '#1565c0' }} />
                  </InputAdornment>
                ),
              }}
            />

            <Button
              variant="contained"
              onClick={fetchDonors}
              disabled={searchLoading}
              startIcon={searchLoading ? <CircularProgress size={18} sx={{ color: 'white' }} /> : <SearchIcon />}
              sx={{
                px: 3,
                textTransform: 'none',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #1565c0, #1976d2)',
                boxShadow: '0 3px 12px rgba(21,101,192,0.35)',
                '&:hover': { background: 'linear-gradient(135deg, #0d47a1, #1565c0)' },
              }}
            >
              {searchLoading ? 'Buscando...' : 'Buscar'}
            </Button>
          </Box>

          {/* Results */}
          {!hasSearched ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <BloodIcon sx={{ fontSize: 64, color: '#e0e0e0', mb: 2 }} />
              <Typography color="text.secondary" variant="h6">
                Usa el buscador para encontrar donantes compatibles
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                Puedes filtrar por tipo de sangre o nombre
              </Typography>
            </Box>
          ) : searchLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : donors.length > 0 ? (
            <Grid container spacing={2}>
              {donors.map((donor) => (
                <Grid item xs={12} sm={6} md={4} key={donor.id}>
                  <Card sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 2,
                    border: '1px solid #e3f2fd',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: '0 8px 24px rgba(21,101,192,0.15)',
                    },
                  }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar sx={{
                          width: 48,
                          height: 48,
                          background: 'linear-gradient(135deg, #c62828, #e53935)',
                          mr: 1.5,
                          fontWeight: 800,
                          fontSize: '1.3rem',
                        }}>
                          {donor.name?.charAt(0)?.toUpperCase() || '?'}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                            {donor.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {donor.age} años · {donor.weight || '?'} kg
                          </Typography>
                        </Box>
                      </Box>

                      {(() => {
                        const { eligible, daysLeft } = donorEligibility(donor.last_donation_date);
                        return (
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                            <Chip icon={<BloodIcon />} label={donor.blood_type} size="small"
                              sx={{ backgroundColor: '#ffebee', color: '#c62828', fontWeight: 800, '& .MuiChip-icon': { color: '#c62828' } }} />
                            {eligible ? (
                              <Chip icon={<CheckCircleIcon />} label="Elegible" size="small" color="success" />
                            ) : (
                              <Chip icon={<WarningIcon />} label={`${daysLeft}d`} size="small"
                                sx={{ backgroundColor: '#fff3e0', color: '#e65100', fontWeight: 700, '& .MuiChip-icon': { color: '#e65100' } }} />
                            )}
                          </Box>
                        );
                      })()}

                      {donor.email && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {donor.email}
                        </Typography>
                      )}
                    </CardContent>

                    <CardActions sx={{ px: 2, pb: 2, gap: 1, flexDirection: 'column' }}>
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={() => handleOpenDialog(donor)}
                        startIcon={<SendIcon />}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 700,
                          borderRadius: 2,
                          background: 'linear-gradient(135deg, #1565c0, #1976d2)',
                          '&:hover': { background: 'linear-gradient(135deg, #0d47a1, #1565c0)' },
                        }}
                      >
                        Solicitar Donación
                      </Button>
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => { setContactingDonor(donor); setContactMsg(''); setContactDialog(true); }}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 700,
                          borderRadius: 2,
                          borderColor: '#c62828',
                          color: '#c62828',
                          '&:hover': { borderColor: '#b71c1c', backgroundColor: '#ffebee' },
                        }}
                      >
                        Solicitar Chat
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              No se encontraron donantes con los filtros seleccionados. Intenta con otros criterios.
            </Alert>
          )}
        </Paper>
      )}

      {/* Tab 1 — Mis Solicitudes */}
      {tabValue === 1 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
            Mis Solicitudes de Donación ({requests.length})
          </Typography>

          {requests.length > 0 ? (
            <Grid container spacing={2}>
              {requests.map((req) => (
                <Grid item xs={12} sm={6} md={4} key={req.id}>
                  <Card sx={{
                    borderRadius: 2,
                    border: `2px solid ${req.status === 'approved' ? '#a5d6a7' : req.status === 'rejected' ? '#ffcdd2' : '#ffe0b2'}`,
                    transition: 'box-shadow 0.15s',
                    '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.1)' },
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Chip
                          label={STATUS_LABELS[req.status] || req.status}
                          color={STATUS_COLORS[req.status] || 'default'}
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                        <Chip
                          label={URGENCY_LABELS[req.urgency] || req.urgency}
                          color={URGENCY_COLORS[req.urgency] || 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                        <Avatar sx={{ width: 36, height: 36, background: 'linear-gradient(135deg, #c62828, #e53935)', mr: 1.5, fontSize: '0.9rem', fontWeight: 700 }}>
                          D
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Donante #{req.donor_id}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Solicitado el {new Date(req.created_at).toLocaleDateString('es-ES')}
                          </Typography>
                        </Box>
                      </Box>

                      <Divider sx={{ my: 1.5 }} />

                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: req.reason ? 'normal' : 'italic' }}>
                        {req.reason || 'Sin descripción adicional'}
                      </Typography>

                      {req.notes && (
                        <Alert severity="info" sx={{ mt: 1.5, py: 0.5, borderRadius: 1 }}>
                          <Typography variant="caption">{req.notes}</Typography>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <SendIcon sx={{ fontSize: 64, color: '#e0e0e0', mb: 2 }} />
              <Typography color="text.secondary" variant="h6">
                Aún no has enviado solicitudes
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mt: 1, mb: 3 }}>
                Busca un donante compatible y envía tu primera solicitud
              </Typography>
              <Button
                variant="contained"
                onClick={() => setTabValue(0)}
                startIcon={<SearchIcon />}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Buscar Donantes
              </Button>
            </Box>
          )}
        </Paper>
      )}

      {/* Tab 2 — Mi Perfil */}
      {tabValue === 2 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Mi Perfil de Solicitante</Typography>
            {!editMode ? (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => setEditMode(true)}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Editar perfil
              </Button>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<CancelIcon />}
                  onClick={() => {
                    setEditMode(false);
                    setProfileMsg(null);
                    if (requesterProfile) {
                      setProfileForm({
                        name: requesterProfile.name || '',
                        phone: requesterProfile.phone || '',
                        address: requesterProfile.address || '',
                        blood_type_needed: requesterProfile.blood_type_needed || '',
                        urgency: requesterProfile.urgency || 'normal',
                      });
                    }
                  }}
                  sx={{ textTransform: 'none' }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="contained"
                  startIcon={profileSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  sx={{ textTransform: 'none', fontWeight: 600, background: 'linear-gradient(135deg, #1565c0, #1976d2)' }}
                >
                  Guardar
                </Button>
              </Box>
            )}
          </Box>

          {profileMsg && (
            <Alert severity={profileMsg.type} sx={{ mb: 2, borderRadius: 2 }} onClose={() => setProfileMsg(null)}>
              {profileMsg.text}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Account summary cards */}
            <Grid item xs={6} sm={3}>
              <Card variant="outlined" sx={{ borderRadius: 2, textAlign: 'center', py: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#1565c0' }}>{requests.length}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Solicitudes enviadas</Typography>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined" sx={{ borderRadius: 2, textAlign: 'center', py: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#2e7d32' }}>{approvedCount}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Aprobadas</Typography>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined" sx={{ borderRadius: 2, textAlign: 'center', py: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5 }}>
                  <Chip
                    icon={<VerifiedIcon />}
                    label={user?.is_active ? 'Activa' : 'Inactiva'}
                    color={user?.is_active ? 'success' : 'error'}
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Cuenta</Typography>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined" sx={{ borderRadius: 2, textAlign: 'center', py: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#555' }}>
                  {new Date(user?.created_at || Date.now()).toLocaleDateString('es-ES', { year: 'numeric', month: 'short' })}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Miembro desde</Typography>
              </Card>
            </Grid>

            {/* Profile identity section */}
            <Grid item xs={12}>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{
                      width: 64,
                      height: 64,
                      background: 'linear-gradient(135deg, #1565c0, #1976d2)',
                      fontSize: '1.8rem',
                      fontWeight: 800,
                      mr: 2,
                    }}>
                      {user?.username?.charAt(0)?.toUpperCase() || 'S'}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{user?.username}</Typography>
                      <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
                      <Chip label="Solicitante" size="small" color="primary" sx={{ mt: 0.5, fontWeight: 600 }} />
                    </Box>
                  </Box>

                  <Divider sx={{ mb: 3 }} />

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      {editMode ? (
                        <TextField
                          fullWidth
                          label="Nombre completo"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm(f => ({ ...f, name: e.target.value }))}
                          size="small"
                          required
                        />
                      ) : (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Nombre</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>{requesterProfile?.name || '—'}</Typography>
                        </Box>
                      )}
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      {editMode ? (
                        <TextField
                          fullWidth
                          label="Teléfono"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                          size="small"
                        />
                      ) : (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Teléfono</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>{requesterProfile?.phone || '—'}</Typography>
                        </Box>
                      )}
                    </Grid>

                    <Grid item xs={12}>
                      {editMode ? (
                        <TextField
                          fullWidth
                          label="Dirección"
                          value={profileForm.address}
                          onChange={(e) => setProfileForm(f => ({ ...f, address: e.target.value }))}
                          size="small"
                          multiline
                          rows={2}
                        />
                      ) : (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Dirección</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>{requesterProfile?.address || '—'}</Typography>
                        </Box>
                      )}
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      {editMode ? (
                        <FormControl fullWidth size="small">
                          <InputLabel>Tipo de sangre necesario</InputLabel>
                          <Select
                            value={profileForm.blood_type_needed}
                            onChange={(e) => setProfileForm(f => ({ ...f, blood_type_needed: e.target.value }))}
                            label="Tipo de sangre necesario"
                          >
                            <MenuItem value=""><em>No especificado</em></MenuItem>
                            {BLOOD_TYPES.map(bt => <MenuItem key={bt} value={bt}>{bt}</MenuItem>)}
                          </Select>
                        </FormControl>
                      ) : (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Tipo de sangre necesario</Typography>
                          <Box sx={{ mt: 0.5 }}>
                            {requesterProfile?.blood_type_needed ? (
                              <Chip icon={<BloodIcon />} label={requesterProfile.blood_type_needed} color="error" size="small" sx={{ fontWeight: 700 }} />
                            ) : (
                              <Typography variant="body2" color="text.secondary">No especificado</Typography>
                            )}
                          </Box>
                        </Box>
                      )}
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      {editMode ? (
                        <FormControl fullWidth size="small">
                          <InputLabel>Urgencia</InputLabel>
                          <Select
                            value={profileForm.urgency}
                            onChange={(e) => setProfileForm(f => ({ ...f, urgency: e.target.value }))}
                            label="Urgencia"
                          >
                            <MenuItem value="low">Baja</MenuItem>
                            <MenuItem value="normal">Normal</MenuItem>
                            <MenuItem value="high">Alta</MenuItem>
                          </Select>
                        </FormControl>
                      ) : (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Urgencia</Typography>
                          <Box sx={{ mt: 0.5 }}>
                            <Chip
                              label={URGENCY_LABELS[requesterProfile?.urgency] || 'Normal'}
                              color={URGENCY_COLORS[requesterProfile?.urgency] || 'info'}
                              size="small"
                              sx={{ fontWeight: 700 }}
                            />
                          </Box>
                        </Box>
                      )}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Tab 3 — Mis Chats */}
      {tabValue === 3 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Mis Chats con Donantes</Typography>

          {activeChatCr ? (
            <Box>
              <Button size="small" onClick={() => setActiveChatCr(null)} sx={{ mb: 2, textTransform: 'none' }}>
                ← Volver a la lista
              </Button>
              <ChatPanel
                contactRequest={activeChatCr}
                currentRole="requester"
                currentProfileId={null}
                otherName={`Donante #${activeChatCr.donor_id}`}
              />
            </Box>
          ) : contactRequests.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Aún no has enviado solicitudes de chat. Busca un donante y haz clic en "Solicitar Chat".
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {contactRequests.map((cr) => (
                <Grid item xs={12} sm={6} md={4} key={cr.id}>
                  <Card sx={{
                    borderRadius: 2,
                    border: `2px solid ${cr.status === 'accepted' ? '#a5d6a7' : cr.status === 'rejected' ? '#ffcdd2' : '#ffe0b2'}`,
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                        <Chip
                          label={cr.status === 'pending' ? 'Esperando respuesta' : cr.status === 'accepted' ? 'Aceptado' : 'Rechazado'}
                          color={cr.status === 'accepted' ? 'success' : cr.status === 'rejected' ? 'error' : 'warning'}
                          size="small" sx={{ fontWeight: 700 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(cr.created_at).toLocaleDateString('es-ES')}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Donante #{cr.donor_id}</Typography>
                      {cr.message && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                          "{cr.message}"
                        </Typography>
                      )}
                    </CardContent>
                    {cr.status === 'accepted' && (
                      <CardActions sx={{ px: 2, pb: 2 }}>
                        <Button
                          fullWidth variant="contained"
                          onClick={() => setActiveChatCr(cr)}
                          sx={{ textTransform: 'none', fontWeight: 700, background: 'linear-gradient(135deg,#c62828,#e53935)' }}
                        >
                          Abrir Chat
                        </Button>
                      </CardActions>
                    )}
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      )}

      {/* Dialog: Solicitar Chat */}
      <Dialog open={contactDialog} onClose={() => setContactDialog(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #c62828, #e53935)', color: 'white', fontWeight: 700 }}>
          Solicitar Chat con Donante
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {contactingDonor && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 1.5, backgroundColor: '#ffebee', borderRadius: 2 }}>
                <Avatar sx={{ background: 'linear-gradient(135deg,#c62828,#e53935)', mr: 1.5, fontWeight: 700 }}>
                  {contactingDonor.name?.charAt(0)?.toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{contactingDonor.name}</Typography>
                  <Chip label={contactingDonor.blood_type} size="small" sx={{ backgroundColor: '#ffcdd2', color: '#c62828', fontWeight: 800 }} />
                </Box>
              </Box>
              <TextField
                fullWidth multiline rows={3}
                label="Mensaje inicial (opcional)"
                placeholder="Preséntate y explica brevemente tu necesidad..."
                value={contactMsg}
                onChange={(e) => setContactMsg(e.target.value)}
                inputProps={{ maxLength: 500 }}
                helperText={`${contactMsg.length}/500`}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setContactDialog(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button
            onClick={handleSendContactRequest}
            variant="contained"
            sx={{ textTransform: 'none', fontWeight: 700, background: 'linear-gradient(135deg,#c62828,#e53935)' }}
          >
            Enviar Solicitud
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Enviar Solicitud */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #1565c0, #1976d2)',
          color: 'white',
          fontWeight: 700,
        }}>
          Solicitar Donación
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedDonor && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, p: 2, backgroundColor: '#e3f2fd', borderRadius: 2 }}>
                <Avatar sx={{ background: 'linear-gradient(135deg, #c62828, #e53935)', mr: 2, fontWeight: 700 }}>
                  {selectedDonor.name?.charAt(0)?.toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{selectedDonor.name}</Typography>
                  <Chip
                    icon={<BloodIcon />}
                    label={selectedDonor.blood_type}
                    size="small"
                    sx={{ backgroundColor: '#ffebee', color: '#c62828', fontWeight: 800 }}
                  />
                </Box>
              </Box>

              <TextField
                fullWidth
                multiline
                rows={4}
                label="Razón de la solicitud *"
                placeholder="Describe brevemente la necesidad de la donación..."
                value={requestData.reason}
                onChange={(e) => setRequestData({ ...requestData, reason: e.target.value })}
                sx={{ mb: 2 }}
              />

              <FormControl fullWidth>
                <InputLabel>Nivel de Urgencia</InputLabel>
                <Select
                  value={requestData.urgency}
                  onChange={(e) => setRequestData({ ...requestData, urgency: e.target.value })}
                  label="Nivel de Urgencia"
                >
                  <MenuItem value="low">
                    <Chip label="Baja" color="success" size="small" sx={{ mr: 1 }} /> Baja prioridad
                  </MenuItem>
                  <MenuItem value="normal">
                    <Chip label="Normal" color="info" size="small" sx={{ mr: 1 }} /> Prioridad normal
                  </MenuItem>
                  <MenuItem value="high">
                    <Chip label="Alta" color="error" size="small" sx={{ mr: 1 }} /> Urgente
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={handleCloseDialog} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmitRequest}
            variant="contained"
            disabled={!requestData.reason.trim()}
            startIcon={<SendIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #1565c0, #1976d2)',
              '&:hover': { background: 'linear-gradient(135deg, #0d47a1, #1565c0)' },
            }}
          >
            Enviar Solicitud
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default RequesterDashboard;
