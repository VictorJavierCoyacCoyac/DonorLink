import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container, Grid, Paper, Typography, Box, Button, Card, CardContent,
  Avatar, Chip, Divider, Tab, Tabs, CircularProgress, Alert, Snackbar,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, LinearProgress,
} from '@mui/material';
import {
  People as PeopleIcon,
  Favorite as DonorIcon,
  LocalHospital as HospitalIcon,
  Assignment as ApplicationIcon,
  Settings as SettingsIcon,
  Security as AuditIcon,
  Logout as LogoutIcon,
  Campaign as BroadcastIcon,
  CheckCircle as CheckIcon,
  TrendingUp as TrendingIcon,
  Bloodtype as BloodIcon,
  ManageAccounts as ManageIcon,
  Notifications as NotifIcon,
  Send as SendIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import axios from 'axios';

import { API_BASE_URL } from '../config/api';

const BLOOD_COLORS = {
  'O+': '#e53935', 'O-': '#b71c1c',
  'A+': '#1e88e5', 'A-': '#0d47a1',
  'B+': '#43a047', 'B-': '#1b5e20',
  'AB+': '#8e24aa', 'AB-': '#4a148c',
};

const NAV_CARDS = [
  { label: 'Solicitudes de Donantes', desc: 'Aprobar o rechazar registros', icon: ApplicationIcon, to: '/admin/applications', color: '#e65100', bg: '#fff3e0' },
  { label: 'Gestionar Donantes', desc: 'Ver y editar perfiles de donantes', icon: DonorIcon, to: '/admin/donors', color: '#c62828', bg: '#ffebee' },
  { label: 'Gestionar Usuarios', desc: 'Roles, acceso y cuentas', icon: ManageIcon, to: '/admin/users', color: '#1565c0', bg: '#e3f2fd' },
  { label: 'Configuración', desc: 'Parámetros del sistema', icon: SettingsIcon, to: '/admin/config', color: '#2e7d32', bg: '#e8f5e9' },
  { label: 'Logs de Auditoría', desc: 'Historial completo de acciones', icon: AuditIcon, to: '/admin/audit', color: '#6a1b9a', bg: '#f3e5f5' },
];

function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [stats, setStats] = useState(null);
  const [extStats, setExtStats] = useState(null);
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  // Broadcast state
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '', type: 'system' });
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const token = localStorage.getItem('access_token');
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const h = { headers: { Authorization: `Bearer ${token}` } };
      const [meResp, metricsResp, statsResp, extResp, donorsResp] = await Promise.all([
        axios.get(`${API_BASE_URL}/auth/me`, h),
        axios.get(`${API_BASE_URL}/admin/metrics`, h).catch(() => ({ data: null })),
        axios.get(`${API_BASE_URL}/statistics/donors`, h).catch(() => ({ data: null })),
        axios.get(`${API_BASE_URL}/statistics/extended`, h).catch(() => ({ data: null })),
        axios.get(`${API_BASE_URL}/donors?limit=1000`, h).catch(() => ({ data: [] })),
      ]);
      setUser(meResp.data);
      setMetrics(metricsResp.data);
      setStats(statsResp.data);
      setExtStats(extResp.data);
      setDonors(donorsResp.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    window.location.href = '/login';
  };

  // Build blood type chart data from donors
  const bloodTypeData = donors.reduce((acc, d) => {
    if (d.blood_type) {
      const found = acc.find((x) => x.name === d.blood_type);
      if (found) found.value++;
      else acc.push({ name: d.blood_type, value: 1 });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value);

  // Broadcast: send notification to all donors
  const handleBroadcast = async () => {
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) return;
    setBroadcastLoading(true);
    setBroadcastResult(null);

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const donor of donors) {
      try {
        const res = await axios.post(
          `${API_BASE_URL}/notifications`,
          {
            donor_id: donor.id,
            notification_type: broadcastForm.type,
            title: broadcastForm.title,
            content: broadcastForm.message,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data?.skipped) skipped++;
        else sent++;
      } catch {
        failed++;
      }
    }

    setBroadcastLoading(false);
    setBroadcastResult({ sent, skipped, failed });
    if (sent > 0) {
      setSnackbar({ open: true, message: `Notificación enviada a ${sent} donante(s)`, severity: 'success' });
    }
  };

  const handleCloseBroadcast = () => {
    setBroadcastOpen(false);
    setBroadcastForm({ title: '', message: '', type: 'system' });
    setBroadcastResult(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  const METRIC_CARDS = [
    { label: 'Usuarios Totales', value: metrics?.total_users ?? '—', icon: PeopleIcon, color: '#1565c0', bg: 'linear-gradient(135deg,#1565c0,#1976d2)' },
    { label: 'Donantes', value: metrics?.total_donors ?? '—', icon: DonorIcon, color: '#c62828', bg: 'linear-gradient(135deg,#c62828,#e53935)' },
    { label: 'Solicitantes', value: metrics?.total_requesters ?? '—', icon: HospitalIcon, color: '#2e7d32', bg: 'linear-gradient(135deg,#2e7d32,#43a047)' },
    { label: 'Donaciones', value: metrics?.total_donations ?? '—', icon: BloodIcon, color: '#6a1b9a', bg: 'linear-gradient(135deg,#6a1b9a,#8e24aa)' },
    { label: 'Mensajes', value: metrics?.total_messages ?? '—', icon: NotifIcon, color: '#e65100', bg: 'linear-gradient(135deg,#e65100,#f57c00)' },
    { label: 'Logs de Auditoría', value: metrics?.total_audit_logs ?? '—', icon: AuditIcon, color: '#00838f', bg: 'linear-gradient(135deg,#00838f,#00acc1)' },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4, minHeight: '100vh', background: 'linear-gradient(135deg, #f0f0ff 0%, #e8eaf6 100%)' }}>

      {/* Hero Header */}
      <Box sx={{
        background: 'linear-gradient(135deg, #1a237e 0%, #283593 40%, #3949ab 75%, #5c6bc0 100%)',
        borderRadius: 3, p: 4, mb: 4, color: 'white',
        boxShadow: '0 8px 32px rgba(26,35,126,0.4)',
      }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm="auto">
            <Avatar sx={{ width: 100, height: 100, backgroundColor: 'rgba(255,255,255,0.2)', fontSize: '3rem', border: '4px solid rgba(255,255,255,0.5)', fontWeight: 800 }}>
              {user?.username?.charAt(0)?.toUpperCase() || 'A'}
            </Avatar>
          </Grid>
          <Grid item xs={12} sm>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
              Panel de Administración
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.85, mb: 1.5 }}>
              {user?.username} · {user?.email}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip
                label="Administrador"
                icon={<CheckIcon />}
                sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700, padding: '20px 10px', '& .MuiChip-icon': { color: 'white' } }}
              />
              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                {donors.length} donantes · {metrics?.total_users ?? '?'} usuarios registrados
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm="auto">
            <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'row', sm: 'column' } }}>
              <Button
                onClick={() => setBroadcastOpen(true)}
                startIcon={<BroadcastIcon />}
                sx={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', textTransform: 'none', fontWeight: 700, '&:hover': { backgroundColor: 'rgba(255,255,255,0.25)' } }}
              >
                Notificar Donantes
              </Button>
              <Button
                onClick={handleLogout}
                startIcon={<LogoutIcon />}
                sx={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' } }}
              >
                Cerrar sesión
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Metric Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {METRIC_CARDS.map((m) => (
          <Grid item xs={6} sm={4} md={2} key={m.label}>
            <Card sx={{ background: m.bg, color: 'white', borderRadius: 2, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <m.icon sx={{ fontSize: 28, opacity: 0.85, mb: 0.5 }} />
                <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>{m.value}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '0.7rem' }}>{m.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ '& .MuiTabs-indicator': { backgroundColor: '#3949ab', height: 3 } }}>
          <Tab label="Accesos Rápidos" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Estadísticas" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Distribución de Sangre" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Mi Perfil" sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>
      </Paper>

      {/* Tab 0 — Accesos Rápidos */}
      {tabValue === 0 && (
        <Grid container spacing={2}>
          {NAV_CARDS.map((card) => (
            <Grid item xs={12} sm={6} md={4} key={card.label}>
              <Card
                component={Link}
                to={card.to}
                sx={{
                  textDecoration: 'none',
                  display: 'block',
                  borderRadius: 2,
                  border: `1px solid ${card.bg}`,
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 24px ${card.color}30` },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: 2, backgroundColor: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 2 }}>
                      <card.icon sx={{ color: card.color, fontSize: 26 }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}>
                        {card.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{card.desc}</Typography>
                    </Box>
                  </Box>
                  <Button
                    size="small"
                    endIcon={<SendIcon sx={{ fontSize: 14 }} />}
                    sx={{ textTransform: 'none', color: card.color, fontWeight: 600, p: 0, '&:hover': { background: 'none' } }}
                  >
                    Ir al módulo
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}

          {/* Broadcast card */}
          <Grid item xs={12} sm={6} md={4}>
            <Card
              onClick={() => setBroadcastOpen(true)}
              sx={{
                cursor: 'pointer',
                borderRadius: 2,
                border: '2px dashed #3949ab',
                background: 'linear-gradient(135deg, #e8eaf6, #f3e5f5)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(57,73,171,0.2)' },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <Box sx={{ width: 48, height: 48, borderRadius: 2, backgroundColor: '#e8eaf6', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 2 }}>
                    <BroadcastIcon sx={{ color: '#3949ab', fontSize: 26 }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}>
                      Broadcast a Donantes
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Enviar notificación masiva
                    </Typography>
                  </Box>
                </Box>
                <Chip label={`${donors.length} receptores`} size="small" color="primary" variant="outlined" />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 1 — Estadísticas */}
      {tabValue === 1 && (() => {
        const approvalData = extStats ? [
          { name: 'Aprobados', value: extStats.approval_status.approved, fill: '#2e7d32' },
          { name: 'Pendientes', value: extStats.approval_status.pending, fill: '#e65100' },
          { name: 'Rechazados', value: extStats.approval_status.rejected, fill: '#c62828' },
        ].filter((d) => d.value > 0) : [];

        const crData = extStats ? [
          { name: 'Aceptadas', value: extStats.contact_requests.accepted, fill: '#2e7d32' },
          { name: 'Pendientes', value: extStats.contact_requests.pending, fill: '#e65100' },
          { name: 'Rechazadas', value: extStats.contact_requests.rejected, fill: '#c62828' },
        ] : [];

        const monthlyData = extStats?.monthly_donations?.map((m) => ({
          mes: m.month?.slice(5) || m.month,
          donaciones: m.total,
        })) || [];

        return (
          <Box>
            {/* Approval status + Contact requests cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {[
                { label: 'Donantes Aprobados', value: extStats?.approval_status.approved ?? '—', color: '#2e7d32', bg: 'linear-gradient(135deg,#2e7d32,#43a047)' },
                { label: 'Pendientes de Aprobación', value: extStats?.approval_status.pending ?? '—', color: '#e65100', bg: 'linear-gradient(135deg,#e65100,#f57c00)' },
                { label: 'Donantes Rechazados', value: extStats?.approval_status.rejected ?? '—', color: '#c62828', bg: 'linear-gradient(135deg,#c62828,#e53935)' },
                { label: 'Chats Aceptados', value: extStats?.contact_requests.accepted ?? '—', color: '#1565c0', bg: 'linear-gradient(135deg,#1565c0,#1976d2)' },
                { label: 'Solicitudes de Chat Pendientes', value: extStats?.contact_requests.pending ?? '—', color: '#6a1b9a', bg: 'linear-gradient(135deg,#6a1b9a,#8e24aa)' },
                { label: 'Total Donaciones Registradas', value: metrics?.total_donations ?? '—', color: '#00838f', bg: 'linear-gradient(135deg,#00838f,#00acc1)' },
              ].map((c) => (
                <Grid item xs={6} sm={4} md={2} key={c.label}>
                  <Card sx={{ background: c.bg, color: 'white', borderRadius: 2, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>{c.value}</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '0.7rem' }}>{c.label}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={3}>
              {/* Approval status donut */}
              <Grid item xs={12} md={5}>
                <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Estado de Solicitudes</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Donantes por estado de aprobación</Typography>
                  {approvalData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={approvalData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}>
                          {approvalData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip formatter={(v, n) => [v, n]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Alert severity="info">Sin datos de aprobación aún.</Alert>
                  )}
                </Paper>
              </Grid>

              {/* Monthly donations bar chart */}
              <Grid item xs={12} md={7}>
                <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Donaciones por Mes</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Últimos 6 meses</Typography>
                  {monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v) => [v, 'Donaciones']} />
                        <Bar dataKey="donaciones" fill="#c62828" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Alert severity="info">No hay donaciones registradas en los últimos 6 meses.</Alert>
                  )}
                </Paper>
              </Grid>

              {/* Contact requests donut */}
              <Grid item xs={12} md={5}>
                <Paper sx={{ p: 3, borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Solicitudes de Chat</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Estado de solicitudes entre solicitantes y donantes</Typography>
                  {crData.some((d) => d.value > 0) ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={crData.filter((d) => d.value > 0)} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}>
                          {crData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Alert severity="info">Sin solicitudes de chat registradas aún.</Alert>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Box>
        );
      })()}

      {/* Tab 2 (old Tab 1) — Distribución de Sangre */}
      {tabValue === 2 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Distribución de Tipos de Sangre
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<span style={{ fontSize: '1rem' }}>⬇</span>}
              onClick={() => {
                const link = document.createElement('a');
                link.href = `${API_BASE_URL}/admin/donors/export?status=approved`;
                link.setAttribute('download', 'donantes_aprobados.csv');
                const token = localStorage.getItem('access_token');
                fetch(link.href, { headers: { Authorization: `Bearer ${token}` } })
                  .then(r => r.blob())
                  .then(blob => {
                    const url = URL.createObjectURL(blob);
                    link.href = url;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  });
              }}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
            >
              Exportar CSV
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Basado en {donors.length} donantes registrados
          </Typography>

          {bloodTypeData.length > 0 ? (
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={7}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={bloodTypeData} cx="50%" cy="50%" outerRadius={110} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {bloodTypeData.map((entry) => (
                        <Cell key={entry.name} fill={BLOOD_COLORS[entry.name] || '#90a4ae'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} donantes`, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Grid>
              <Grid item xs={12} md={5}>
                {bloodTypeData.map((entry) => (
                  <Box key={entry.name} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: BLOOD_COLORS[entry.name] || '#90a4ae' }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{entry.name}</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">{entry.value} donantes</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(entry.value / donors.length) * 100}
                      sx={{ height: 6, borderRadius: 3, backgroundColor: '#e0e0e0', '& .MuiLinearProgress-bar': { backgroundColor: BLOOD_COLORS[entry.name] || '#90a4ae', borderRadius: 3 } }}
                    />
                  </Box>
                ))}
              </Grid>
            </Grid>
          ) : (
            <Alert severity="info">No hay datos de tipos de sangre disponibles aún.</Alert>
          )}
        </Paper>
      )}

      {/* Tab 3 — Mi Perfil */}
      {tabValue === 3 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Información del Administrador</Typography>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ width: 72, height: 72, background: 'linear-gradient(135deg, #1a237e, #3949ab)', fontSize: '2rem', fontWeight: 800, mr: 2 }}>
                  {user?.username?.charAt(0)?.toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{user?.username}</Typography>
                  <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
                  <Chip label="Administrador" size="small" color="primary" sx={{ mt: 0.5, fontWeight: 700 }} />
                </Box>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {[
                  { label: 'Estado de cuenta', value: user?.is_active ? 'Activa' : 'Inactiva' },
                  { label: 'Fecha de registro', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
                  { label: 'Total de usuarios en sistema', value: metrics?.total_users ?? '—' },
                  { label: 'Logs de auditoría generados', value: metrics?.total_audit_logs ?? '—' },
                ].map(({ label, value }) => (
                  <Grid item xs={12} sm={6} key={label}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.5 }}>{value}</Typography>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Paper>
      )}

      {/* Broadcast Dialog */}
      <Dialog open={broadcastOpen} onClose={handleCloseBroadcast} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #1a237e, #3949ab)', color: 'white', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BroadcastIcon />
            Notificación Masiva a Donantes
          </Box>
          <Button onClick={handleCloseBroadcast} sx={{ color: 'white', minWidth: 'auto' }}><CloseIcon /></Button>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            Se enviará a <strong>{donors.length} donantes</strong> registrados en el sistema.
          </Alert>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Tipo de notificación</InputLabel>
            <Select value={broadcastForm.type} onChange={(e) => setBroadcastForm({ ...broadcastForm, type: e.target.value })} label="Tipo de notificación">
              <MenuItem value="system">Sistema — Anuncio general</MenuItem>
              <MenuItem value="alert">Alerta — Urgente</MenuItem>
              <MenuItem value="message">Mensaje — Comunicado</MenuItem>
            </Select>
          </FormControl>

          <TextField fullWidth label="Título *" value={broadcastForm.title} onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
            sx={{ mb: 2 }} inputProps={{ maxLength: 100 }}
            helperText={`${broadcastForm.title.length}/100`}
          />
          <TextField fullWidth multiline rows={4} label="Mensaje *" value={broadcastForm.message}
            onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
            inputProps={{ maxLength: 500 }} helperText={`${broadcastForm.message.length}/500`}
          />

          {broadcastLoading && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Enviando notificaciones...</Typography>
              <LinearProgress />
            </Box>
          )}

          {broadcastResult && (
            <Alert severity={broadcastResult.sent > 0 ? 'success' : 'warning'} sx={{ mt: 2, borderRadius: 2 }}>
              Enviadas: <strong>{broadcastResult.sent}</strong>
              {broadcastResult.skipped > 0 && <> · Sin cuenta: <strong>{broadcastResult.skipped}</strong></>}
              {broadcastResult.failed > 0 && <> · Error: <strong>{broadcastResult.failed}</strong></>}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={handleCloseBroadcast} sx={{ textTransform: 'none', fontWeight: 600 }}>Cancelar</Button>
          <Button
            onClick={handleBroadcast}
            variant="contained"
            disabled={broadcastLoading || !broadcastForm.title.trim() || !broadcastForm.message.trim()}
            startIcon={broadcastLoading ? <CircularProgress size={18} sx={{ color: 'white' }} /> : <SendIcon />}
            sx={{ textTransform: 'none', fontWeight: 700, background: 'linear-gradient(135deg, #1a237e, #3949ab)', '&:hover': { background: 'linear-gradient(135deg, #0d1b6e, #1a237e)' } }}
          >
            {broadcastLoading ? 'Enviando...' : `Enviar a ${donors.length} donantes`}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} sx={{ borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default AdminDashboard;
