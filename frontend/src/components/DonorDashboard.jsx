import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Divider,
  LinearProgress,
  Stack,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Favorite as DonateIcon,
  LocalHospital as ElligibilityIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  Event as EventIcon,
  FitnessCenter as WeightIcon,
  Verified as VerifiedIcon,
  Warning as WarningIcon,
  Notifications as NotificationsIcon,
  Message as MessageIcon,
  Info as InfoIcon,
  EmojiEvents as TrophyIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Opacity as BloodIcon,
} from '@mui/icons-material';
import axios from 'axios';
import NotificationsPanel from './NotificationsPanel';
import ChatPanel from './ChatPanel';

import { API_BASE_URL } from '../config/api';
const ROLE_LABELS = {
  admin: 'Administrador',
  staff: 'Staff',
  donor: 'Donante',
  requester: 'Solicitante',
};

function DonorDashboard() {
  const [donor, setDonor] = useState(null);
  const [donorProfile, setDonorProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [action, setAction] = useState(null);
  const [notes, setNotes] = useState('');
  const [eligibilityStatus, setEligibilityStatus] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [contactRequests, setContactRequests] = useState([]);
  const [activeChatCr, setActiveChatCr] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', address: '', weight: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);
  const token = localStorage.getItem('access_token');
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
    fetchNotifications();
    fetchContactRequests();
    const interval = setInterval(() => {
      fetchNotifications();
      fetchContactRequests();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [meResp, donorResp, requestsResp, donationsResp] = await Promise.all([
        axios.get(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/donor/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: null })),
        axios.get(`${API_BASE_URL}/requests/incoming`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/donor/donations`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: [] })),
      ]);

      setDonor(meResp.data);
      setDonorProfile(donorResp.data);
      setRequests(requestsResp.data || []);
      setDonations(donationsResp.data || []);
      if (donorResp.data) {
        setProfileForm({
          name: donorResp.data.name || '',
          phone: donorResp.data.phone || '',
          address: donorResp.data.address || '',
          weight: donorResp.data.weight || '',
        });
      }

      // Calculate eligibility status
      if (meResp.data.role === 'donor' && donorResp.data) {
        checkEligibility(donorResp.data);
      }
    } catch (err) {
      console.error(err);
      setError('Error al cargar datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getCooldownDays = (volumeMl) => {
    if (!volumeMl || volumeMl <= 450) return 56;
    if (volumeMl <= 600) return 90;
    if (volumeMl <= 800) return 120;
    return 180;
  };

  const checkEligibility = (donor) => {
    const issues = [];

    if (donor.age < 18 || donor.age > 65)
      issues.push(`Edad fuera de rango (${donor.age} años)`);

    if (donor.weight < 50)
      issues.push(`Peso insuficiente (${donor.weight} kg)`);

    if (donor.approval_status !== 'approved')
      issues.push(`Cuenta ${donor.approval_status === 'pending' ? 'pendiente de aprobación' : 'rechazada'}`);

    const cooldown = getCooldownDays(donor.last_donation_volume_ml);
    let nextDonationDate = 'Disponible';

    if (donor.last_donation_date) {
      const last = new Date(donor.last_donation_date);
      const daysSince = Math.floor((Date.now() - last) / 86400000);
      if (daysSince < cooldown) {
        const daysLeft = cooldown - daysSince;
        issues.push(`Próxima donación disponible en ${daysLeft} día(s) (recuperación de ${cooldown} días por ${donor.last_donation_volume_ml?.toFixed(0) ?? 450} ml donados)`);
      }
      nextDonationDate = new Date(last.getTime() + cooldown * 86400000).toLocaleDateString('es-ES');
    }

    setEligibilityStatus({
      eligible: issues.length === 0,
      reason: issues.length > 0 ? issues.join('. ') : 'Cumples con todos los requisitos para donar',
      nextDonationDate,
      lastDonationDate: donor.last_donation_date
        ? new Date(donor.last_donation_date).toLocaleDateString('es-ES')
        : 'Nunca',
      cooldownDays: cooldown,
    });
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const payload = {
        name: profileForm.name,
        phone: profileForm.phone || null,
        address: profileForm.address || null,
        weight: parseFloat(profileForm.weight) || undefined,
      };
      const { data } = await axios.patch(`${API_BASE_URL}/donor/profile`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDonorProfile(data);
      setEditMode(false);
      setProfileMsg({ type: 'success', text: 'Perfil actualizado correctamente.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.detail || 'Error al guardar.' });
    } finally {
      setProfileSaving(false);
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
      loadDashboardData();
    } catch (err) {
      console.error(err);
      alert('Error al aprobar solicitud');
    }
  };

  const handleRejectRequest = async () => {
    try {
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
      loadDashboardData();
    } catch (err) {
      console.error(err);
      alert('Error al rechazar solicitud');
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/notifications`, {
        params: { skip: 0, limit: 30 },
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const handleMarkNotificationRead = async (id) => {
    try {
      await axios.patch(`${API_BASE_URL}/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.patch(`${API_BASE_URL}/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message': return <MessageIcon sx={{ color: '#2196F3' }} />;
      case 'request': return <WarningIcon sx={{ color: '#FF9800' }} />;
      case 'alert': return <WarningIcon sx={{ color: '#F44336' }} />;
      case 'system': return <InfoIcon sx={{ color: '#9C27B0' }} />;
      default: return <NotificationsIcon />;
    }
  };

  const fetchContactRequests = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/chat/contact-requests/received`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setContactRequests(res.data || []);
    } catch {
      // silent
    }
  };

  const handleAcceptContact = async (crId) => {
    try {
      await axios.patch(`${API_BASE_URL}/chat/contact-requests/${crId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchContactRequests();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al aceptar');
    }
  };

  const handleRejectContact = async (crId) => {
    try {
      await axios.patch(`${API_BASE_URL}/chat/contact-requests/${crId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchContactRequests();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al rechazar');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    window.location.href = '/login';
  };

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
    <Container maxWidth="lg" sx={{ py: 4, background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      {/* Hero Header - Mejorado */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 3,
        p: 4,
        mb: 4,
        color: 'white',
        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
      }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm="auto">
            <Avatar sx={{ 
              width: 100, 
              height: 100, 
              backgroundColor: 'rgba(255,255,255,0.3)',
              fontSize: '3rem',
              border: '4px solid white',
            }}>
              {donorProfile?.name?.charAt(0)?.toUpperCase() || donor?.username?.charAt(0)?.toUpperCase() || 'D'}
            </Avatar>
          </Grid>
          <Grid item xs={12} sm>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
              Bienvenido, {donorProfile?.name || donor?.username || 'Donante'}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, mb: 1 }}>
              {donor?.email}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip
                label={ROLE_LABELS[donor?.role] || 'Donante'}
                icon={<VerifiedIcon />}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: 700,
                  padding: '20px 10px',
                  '& .MuiChip-icon': { color: 'white' }
                }}
              />
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Miembro desde {new Date(donor?.created_at || Date.now()).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm="auto">
            <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'row', sm: 'column' } }}>
              <Button 
                variant="contained" 
                onClick={handleLogout}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.3)',
                  }
                }}
              >
                Cerrar sesión
              </Button>
              <NotificationsPanel accentColor="#c62828" />
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Pending approval banner */}
      {donorProfile?.approval_status === 'pending' && (
        <Alert
          severity="warning"
          sx={{ mb: 3, borderRadius: 2, fontWeight: 600 }}
          icon={<span>⏳</span>}
        >
          Tu cuenta está <strong>pendiente de aprobación</strong> por un administrador. Una vez aprobada, serás visible para los solicitantes y podrás donar.
        </Alert>
      )}

      {/* Info Cards — 3 × 2 grid, all equal size */}
      {(() => {
        const BLOOD_CAN_DONATE_TO = {
          'O-':  ['O-','O+','A-','A+','B-','B+','AB-','AB+'],
          'O+':  ['O+','A+','B+','AB+'],
          'A-':  ['A-','A+','AB-','AB+'],
          'A+':  ['A+','AB+'],
          'B-':  ['B-','B+','AB-','AB+'],
          'B+':  ['B+','AB+'],
          'AB-': ['AB-','AB+'],
          'AB+': ['AB+'],
        };
        const bt = donorProfile?.blood_type;
        const canDonateTo = BLOOD_CAN_DONATE_TO[bt] || [];
        const pendingCount = requests.filter((r) => r.status === 'pending').length;
        const totalVol = donations.reduce((s, d) => s + (d.volume_ml || 0), 0);

        const cardSx = {
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 3,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        };

        return (
          <Grid container spacing={3} sx={{ mb: 4 }} alignItems="stretch">

            {/* 1 — Elegibilidad */}
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{
                ...cardSx,
                background: eligibilityStatus?.eligible
                  ? 'linear-gradient(135deg, #2e7d32 0%, #43a047 100%)'
                  : 'linear-gradient(135deg, #c62828 0%, #e53935 100%)',
                color: 'white',
              }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <ElligibilityIcon sx={{ fontSize: 28, mr: 1.5, opacity: 0.9 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Elegibilidad</Typography>
                  </Box>
                  <Chip
                    label={eligibilityStatus?.eligible ? '✓ ELEGIBLE' : '✗ NO ELEGIBLE'}
                    sx={{ mb: 1.5, backgroundColor: 'rgba(255,255,255,0.95)', color: eligibilityStatus?.eligible ? '#2e7d32' : '#c62828', fontWeight: 800, fontSize: '0.75rem' }}
                  />
                  <Typography variant="body2" sx={{ opacity: 0.92, lineHeight: 1.4, mb: 1.5 }}>
                    {eligibilityStatus?.reason}
                  </Typography>
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.25)', mb: 1.5 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>
                      <strong>Última donación:</strong> {eligibilityStatus?.lastDonationDate || 'Nunca'}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>
                      <strong>Próxima:</strong> {eligibilityStatus?.nextDonationDate || 'Disponible'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* 2 — Perfil */}
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={cardSx}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ width: 52, height: 52, mr: 1.5, background: 'linear-gradient(135deg,#667eea,#764ba2)', fontSize: '1.4rem', fontWeight: 700 }}>
                      {donorProfile?.name?.charAt(0)?.toUpperCase() || donor?.username?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    <Box sx={{ overflow: 'hidden' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                        {donorProfile?.name || donor?.username}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {donor?.email}
                      </Typography>
                    </Box>
                  </Box>
                  <Divider sx={{ mb: 1.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Grupo sanguíneo</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 900, color: '#c62828', lineHeight: 1.1 }}>
                        {donorProfile?.blood_type || '—'}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Estado</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          label={donorProfile?.approval_status === 'approved' ? 'Aprobado' : donorProfile?.approval_status === 'pending' ? 'Pendiente' : 'Rechazado'}
                          size="small"
                          color={donorProfile?.approval_status === 'approved' ? 'success' : donorProfile?.approval_status === 'pending' ? 'warning' : 'error'}
                          sx={{ fontWeight: 700 }}
                        />
                      </Box>
                    </Box>
                  </Box>
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Edad</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{donorProfile?.age ?? '—'} años</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Peso</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{donorProfile?.weight ?? '—'} kg</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* 3 — Compatibilidad sanguínea (NUEVO) */}
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ ...cardSx, background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)', color: 'white' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <BloodIcon sx={{ fontSize: 28, mr: 1.5, opacity: 0.9 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Compatibilidad</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>Puedes donar sangre a:</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mt: 1, mb: 1.5 }}>
                    {bt ? canDonateTo.map((t) => (
                      <Chip key={t} label={t} size="small"
                        sx={{ backgroundColor: 'rgba(255,255,255,0.18)', color: 'white', fontWeight: 700, fontSize: '0.7rem' }} />
                    )) : (
                      <Typography variant="caption" sx={{ opacity: 0.7 }}>Sin datos de grupo sanguíneo</Typography>
                    )}
                  </Box>
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', mb: 1.5 }} />
                  {bt === 'O-' && (
                    <Chip label="⭐ Donante Universal" size="small"
                      sx={{ backgroundColor: 'rgba(255,215,0,0.25)', color: '#FFD700', fontWeight: 700 }} />
                  )}
                  {bt === 'AB+' && (
                    <Chip label="♥ Receptor Universal" size="small"
                      sx={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 700 }} />
                  )}
                  <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', mt: 1 }}>
                    {canDonateTo.length} tipo{canDonateTo.length !== 1 ? 's' : ''} de sangre compatible{canDonateTo.length !== 1 ? 's' : ''}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 4 — Total Donaciones */}
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={cardSx}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ width: 44, height: 44, borderRadius: 2, background: 'linear-gradient(135deg,#c62828,#e53935)', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5 }}>
                      <DonateIcon sx={{ color: 'white', fontSize: 22 }} />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#555' }}>Total de Donaciones</Typography>
                  </Box>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: '#c62828', lineHeight: 1 }}>
                    {donations.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    donaciones registradas
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="caption" color="text.secondary">
                    Volumen total: <strong>{(totalVol / 1000).toFixed(2)} L</strong>
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 5 — Solicitudes Pendientes */}
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={cardSx}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ width: 44, height: 44, borderRadius: 2, background: 'linear-gradient(135deg,#1565c0,#1976d2)', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5 }}>
                      <HistoryIcon sx={{ color: 'white', fontSize: 22 }} />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#555' }}>Solicitudes Pendientes</Typography>
                  </Box>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: pendingCount > 0 ? '#e65100' : '#2e7d32', lineHeight: 1 }}>
                    {pendingCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    requieren tu atención
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="caption" color="text.secondary">
                    Total recibidas: <strong>{requests.length}</strong>
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 6 — Mi Impacto */}
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ ...cardSx, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <TrophyIcon sx={{ fontSize: 28, mr: 1.5, opacity: 0.9 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Mi Impacto</Typography>
                  </Box>
                  <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1 }}>
                    {donations.length * 3}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                    personas potencialmente ayudadas
                  </Typography>
                  <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.3)' }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PeopleIcon sx={{ fontSize: 16, opacity: 0.85 }} />
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>
                      {(totalVol / 1000).toFixed(1)} L donados en total
                    </Typography>
                  </Box>
                  <Box sx={{ mt: 1 }}>
                    {donations.length >= 10 && (
                      <Chip label="🏆 Donante Élite" size="small"
                        sx={{ backgroundColor: 'rgba(255,215,0,0.3)', color: '#FFD700', fontWeight: 700 }} />
                    )}
                    {donations.length >= 5 && donations.length < 10 && (
                      <Chip label="⭐ Donante Frecuente" size="small"
                        sx={{ backgroundColor: 'rgba(255,255,255,0.25)', color: 'white', fontWeight: 700 }} />
                    )}
                    {donations.length === 0 && (
                      <Typography variant="caption" sx={{ opacity: 0.85 }}>
                        ¡Tu primera donación puede salvar 3 vidas!
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

          </Grid>
        );
      })()}

      {/* Tabs Section */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => { setTabValue(newValue); setActiveChatCr(null); }} variant="scrollable" scrollButtons="auto">
          <Tab label="Solicitudes Recibidas" />
          <Tab label="Historial de Donaciones" />
          <Tab label="Mi Perfil" />
          <Tab
            label={
              <Badge badgeContent={unreadCount} color="error" max={99}>
                <Box sx={{ pr: unreadCount > 0 ? 1.5 : 0 }}>Notificaciones</Box>
              </Badge>
            }
          />
          <Tab
            label={
              <Badge badgeContent={contactRequests.filter(c => c.status === 'pending').length} color="warning" max={99}>
                <Box sx={{ pr: contactRequests.filter(c => c.status === 'pending').length > 0 ? 1.5 : 0 }}>Contactos</Box>
              </Badge>
            }
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Solicitudes de Donación ({requests.length})
          </Typography>
          {requests.length > 0 ? (
            <Grid container spacing={2}>
              {requests.map((request) => (
                <Grid item xs={12} sm={6} md={4} key={request.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
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
                        <strong>Solicitante ID:</strong> #{request.requester_id}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>Razón:</strong> {request.reason || 'Sin especificar'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Urgencia:</strong> {request.urgency || 'Normal'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                        {new Date(request.created_at).toLocaleString()}
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
            <Alert severity="info">
              No hay solicitudes de donación en este momento
            </Alert>
          )}
        </Paper>
      )}

      {tabValue === 1 && (() => {
        const totalVol = donations.reduce((s, d) => s + (d.volume_ml || 0), 0);
        const eligible = eligibilityStatus?.eligible;
        const lastDate = donorProfile?.last_donation_date;
        const daysSince = lastDate ? Math.floor((Date.now() - new Date(lastDate)) / 86400000) : null;
        const daysLeft = lastDate ? Math.max(0, 56 - daysSince) : 0;
        const nextDate = lastDate ? new Date(new Date(lastDate).getTime() + 56 * 86400000).toLocaleDateString('es-ES') : null;
        return (
          <Box>
            {/* Eligibility card */}
            <Paper sx={{ p: 3, mb: 3, borderRadius: 2, border: `2px solid ${eligible ? '#2e7d32' : '#e65100'}`, background: eligible ? '#f1f8e9' : '#fff3e0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ width: 56, height: 56, borderRadius: '50%', background: eligible ? '#2e7d32' : '#e65100', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {eligible ? <CheckCircleIcon sx={{ color: 'white', fontSize: 28 }} /> : <WarningIcon sx={{ color: 'white', fontSize: 28 }} />}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: eligible ? '#2e7d32' : '#e65100' }}>
                    {eligible ? 'Apto para donar' : 'No elegible actualmente'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {eligible
                      ? 'Cumples con todos los requisitos para realizar una donación.'
                      : eligibilityStatus?.reason || `Próxima fecha: ${nextDate || '—'}`}
                  </Typography>
                </Box>
                {!eligible && daysLeft > 0 && (
                  <Box sx={{ textAlign: 'center', px: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#e65100', lineHeight: 1 }}>{daysLeft}</Typography>
                    <Typography variant="caption" color="text.secondary">días restantes</Typography>
                    {nextDate && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Próximo: {nextDate}</Typography>}
                  </Box>
                )}
              </Box>
            </Paper>

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {[
                { label: 'Total donaciones', value: donations.length, color: '#c62828' },
                { label: 'Volumen total', value: `${totalVol.toLocaleString()} ml`, color: '#1565c0' },
                { label: 'Última donación', value: lastDate ? new Date(lastDate).toLocaleDateString('es-ES') : 'Nunca', color: '#2e7d32' },
                { label: 'Vidas impactadas', value: `~${donations.length * 3}`, color: '#6a1b9a' },
              ].map((s) => (
                <Grid item xs={6} sm={3} key={s.label}>
                  <Card sx={{ borderRadius: 2, textAlign: 'center', p: 1.5, border: `1px solid ${s.color}22` }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: s.color }}>{s.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Table */}
            <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
              {donations.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ background: 'linear-gradient(135deg,#c62828,#e53935)' }}>
                        <TableCell sx={{ color: 'white', fontWeight: 700 }}>#</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 700 }}>Fecha</TableCell>
                        <TableCell align="right" sx={{ color: 'white', fontWeight: 700 }}>Volumen</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 700 }}>Estado</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {donations.map((d, i) => (
                        <TableRow key={d.id} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#fafafa' } }}>
                          <TableCell>{donations.length - i}</TableCell>
                          <TableCell>{new Date(d.donation_date).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>{d.volume_ml} ml</TableCell>
                          <TableCell><Chip label="Completada" color="success" size="small" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <BloodIcon sx={{ fontSize: 48, color: '#bdbdbd', mb: 1 }} />
                  <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>Sin donaciones registradas</Typography>
                  <Typography variant="body2" color="text.secondary">Tu historial aparecerá aquí cuando el administrador registre tu primera donación.</Typography>
                </Box>
              )}
            </Paper>
          </Box>
        );
      })()}

      {tabValue === 2 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Mi Perfil de Donante</Typography>
            {!editMode ? (
              <Button startIcon={<EditIcon />} onClick={() => { setEditMode(true); setProfileMsg(null); }}
                sx={{ textTransform: 'none', fontWeight: 600, color: '#c62828', borderColor: '#c62828' }} variant="outlined">
                Editar
              </Button>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button startIcon={<CancelIcon />} onClick={() => { setEditMode(false); setProfileForm({ name: donorProfile?.name || '', phone: donorProfile?.phone || '', address: donorProfile?.address || '', weight: donorProfile?.weight || '' }); setProfileMsg(null); }}
                  sx={{ textTransform: 'none', fontWeight: 600 }}>
                  Cancelar
                </Button>
                <Button variant="contained" startIcon={profileSaving ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <SaveIcon />}
                  onClick={handleSaveProfile} disabled={profileSaving}
                  sx={{ textTransform: 'none', fontWeight: 700, background: 'linear-gradient(135deg,#c62828,#e53935)' }}>
                  {profileSaving ? 'Guardando...' : 'Guardar'}
                </Button>
              </Box>
            )}
          </Box>

          {profileMsg && <Alert severity={profileMsg.type} sx={{ mb: 2, borderRadius: 2 }}>{profileMsg.text}</Alert>}

          {donorProfile && (
            <Grid container spacing={3}>
              {/* Datos fijos */}
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ p: 2, borderRadius: 2, background: '#ffebee', textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Tipo de Sangre</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#c62828' }}>{donorProfile.blood_type}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ p: 2, borderRadius: 2, background: '#f3e5f5', textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Edad</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#6a1b9a' }}>{donorProfile.age}</Typography>
                  <Typography variant="caption" color="text.secondary">años</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ p: 2, borderRadius: 2, background: '#e8f5e9', textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Estado</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip label={donorProfile.approval_status === 'approved' ? 'Aprobado' : donorProfile.approval_status === 'pending' ? 'Pendiente' : 'Rechazado'}
                      color={donorProfile.approval_status === 'approved' ? 'success' : donorProfile.approval_status === 'pending' ? 'warning' : 'error'}
                      sx={{ fontWeight: 700 }} />
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ p: 2, borderRadius: 2, background: '#e3f2fd', textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Usuario</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1565c0', wordBreak: 'break-all' }}>{donor?.username}</Typography>
                </Box>
              </Grid>

              {/* Campos editables */}
              <Grid item xs={12}>
                <Divider sx={{ mb: 2 }}><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Información editable</Typography></Divider>
              </Grid>

              <Grid item xs={12} sm={6}>
                {editMode ? (
                  <TextField fullWidth label="Nombre Completo" value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
                ) : (
                  <Box><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Nombre Completo</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>{donorProfile.name}</Typography></Box>
                )}
              </Grid>
              <Grid item xs={12} sm={6}>
                {editMode ? (
                  <TextField fullWidth label="Teléfono" value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
                ) : (
                  <Box><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Teléfono</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>{donorProfile.phone || '—'}</Typography></Box>
                )}
              </Grid>
              <Grid item xs={12} sm={8}>
                {editMode ? (
                  <TextField fullWidth label="Dirección" value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} />
                ) : (
                  <Box><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Dirección</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>{donorProfile.address || '—'}</Typography></Box>
                )}
              </Grid>
              <Grid item xs={12} sm={4}>
                {editMode ? (
                  <TextField fullWidth label="Peso (kg)" type="number" value={profileForm.weight}
                    inputProps={{ min: 50, max: 200, step: 0.5 }}
                    onChange={(e) => setProfileForm({ ...profileForm, weight: e.target.value })} />
                ) : (
                  <Box><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Peso</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>{donorProfile.weight} kg</Typography></Box>
                )}
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ mb: 1 }}><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Datos de cuenta (no editables)</Typography></Divider>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Email</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>{donorProfile.email}</Typography></Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Miembro desde</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>{new Date(donorProfile.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</Typography></Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Box><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Última donación</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>{donorProfile.last_donation_date ? new Date(donorProfile.last_donation_date).toLocaleDateString('es-ES') : 'Nunca'}</Typography></Box>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          )}
        </Paper>
      )}

      {tabValue === 3 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Notificaciones
              {unreadCount > 0 && (
                <Chip
                  label={`${unreadCount} sin leer`}
                  size="small"
                  color="error"
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>
            {unreadCount > 0 && (
              <Button size="small" variant="outlined" onClick={handleMarkAllRead} startIcon={<CheckCircleIcon />}>
                Marcar todas como leídas
              </Button>
            )}
          </Box>

          {notifications.length > 0 ? (
            <List disablePadding>
              {notifications.map((notif, index) => (
                <Box key={notif.id}>
                  <ListItem
                    alignItems="flex-start"
                    sx={{
                      borderRadius: 2,
                      mb: 0.5,
                      backgroundColor: notif.is_read ? 'transparent' : 'rgba(25, 118, 210, 0.06)',
                      borderLeft: notif.is_read ? '4px solid transparent' : '4px solid #1976d2',
                      cursor: notif.is_read ? 'default' : 'pointer',
                      transition: 'background-color 0.2s',
                      '&:hover': { backgroundColor: notif.is_read ? '#fafafa' : 'rgba(25, 118, 210, 0.10)' },
                    }}
                    onClick={() => !notif.is_read && handleMarkNotificationRead(notif.id)}
                    secondaryAction={
                      !notif.is_read && (
                        <Button
                          size="small"
                          onClick={(e) => { e.stopPropagation(); handleMarkNotificationRead(notif.id); }}
                          sx={{ whiteSpace: 'nowrap' }}
                        >
                          Marcar leída
                        </Button>
                      )
                    }
                  >
                    <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                      {getNotificationIcon(notif.notification_type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Typography variant="body2" sx={{ fontWeight: notif.is_read ? 400 : 700 }}>
                            {notif.title}
                          </Typography>
                          <Chip
                            label={notif.notification_type}
                            size="small"
                            variant="outlined"
                            color={
                              notif.notification_type === 'message' ? 'info' :
                              notif.notification_type === 'request' ? 'warning' :
                              notif.notification_type === 'alert' ? 'error' : 'default'
                            }
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {notif.content}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">
                            {new Date(notif.created_at).toLocaleString('es-ES')}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < notifications.length - 1 && <Divider component="li" />}
                </Box>
              ))}
            </List>
          ) : (
            <Alert severity="info" icon={<NotificationsIcon />}>
              No tienes notificaciones por el momento. Cuando un solicitante te contacte, aparecerá aquí.
            </Alert>
          )}
        </Paper>
      )}

      {/* Tab 4 — Contactos / Chat */}
      {tabValue === 4 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
            Solicitudes de Contacto ({contactRequests.length})
          </Typography>

          {activeChatCr ? (
            <Box>
              <Button
                size="small"
                onClick={() => setActiveChatCr(null)}
                sx={{ mb: 2, textTransform: 'none' }}
              >
                ← Volver a solicitudes
              </Button>
              <ChatPanel
                contactRequest={activeChatCr}
                currentRole="donor"
                currentProfileId={donorProfile?.id}
                otherName={`Solicitante #${activeChatCr.requester_id}`}
              />
            </Box>
          ) : contactRequests.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              No tienes solicitudes de contacto. Cuando un solicitante quiera chatear contigo, aparecerá aquí.
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
                          label={cr.status === 'pending' ? 'Pendiente' : cr.status === 'accepted' ? 'Aceptada' : 'Rechazada'}
                          color={cr.status === 'accepted' ? 'success' : cr.status === 'rejected' ? 'error' : 'warning'}
                          size="small" sx={{ fontWeight: 700 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(cr.created_at).toLocaleDateString('es-ES')}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Solicitante #{cr.requester_id}
                      </Typography>
                      {cr.message && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                          "{cr.message}"
                        </Typography>
                      )}
                    </CardContent>
                    {cr.status === 'pending' && (
                      <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
                        <Button
                          size="small" variant="contained" color="success"
                          onClick={() => handleAcceptContact(cr.id)}
                          sx={{ textTransform: 'none', fontWeight: 700, flexGrow: 1 }}
                        >
                          Aceptar
                        </Button>
                        <Button
                          size="small" variant="outlined" color="error"
                          onClick={() => handleRejectContact(cr.id)}
                          sx={{ textTransform: 'none', fontWeight: 700, flexGrow: 1 }}
                        >
                          Rechazar
                        </Button>
                      </CardActions>
                    )}
                    {cr.status === 'accepted' && (
                      <CardActions sx={{ px: 2, pb: 2 }}>
                        <Button
                          fullWidth size="small" variant="contained"
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

      {/* Decision Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {action === 'approve' ? 'Aprobar' : 'Rechazar'} Solicitud de Donación
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedRequest && (
            <Box>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Solicitante:</strong> #{selectedRequest.requester_id}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Razón de la solicitud:</strong> {selectedRequest.reason || 'No especificada'}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notas (opcional)"
                placeholder="Agrega cualquier nota adicional..."
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
              Aprobar Donación
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
