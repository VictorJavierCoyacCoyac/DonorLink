import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Typography, Box, Alert, Chip, IconButton, Tooltip,
  TextField, InputAdornment, Snackbar, Avatar, Divider,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Search as SearchIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  ArrowBack as BackIcon,
  Bloodtype as BloodIcon,
  Refresh as RefreshIcon,
  Favorite as DonateIcon,
  CheckCircleOutline as EligibleIcon,
  WarningAmber as WarningIcon,
} from '@mui/icons-material';
import axios from 'axios';

import { API_BASE_URL } from '../config/api';

const getCooldownDays = (volumeMl) => {
  if (!volumeMl || volumeMl <= 450) return 56;
  if (volumeMl <= 600) return 90;
  if (volumeMl <= 800) return 120;
  return 180;
};

const getCooldownLabel = (volumeMl) => {
  if (!volumeMl || volumeMl <= 450) return '56 días (estándar)';
  if (volumeMl <= 600) return '90 días (donación aumentada)';
  if (volumeMl <= 800) return '120 días (aféresis)';
  return '180 días (plasmapéresis intensiva)';
};

const BLOOD_COLORS = {
  'O+': { bg: '#ffebee', color: '#c62828' },
  'O-': { bg: '#ffcdd2', color: '#b71c1c' },
  'A+': { bg: '#e3f2fd', color: '#1565c0' },
  'A-': { bg: '#bbdefb', color: '#0d47a1' },
  'B+': { bg: '#e8f5e9', color: '#2e7d32' },
  'B-': { bg: '#c8e6c9', color: '#1b5e20' },
  'AB+': { bg: '#f3e5f5', color: '#6a1b9a' },
  'AB-': { bg: '#e1bee7', color: '#4a148c' },
};

const STATUS_CONFIG = {
  approved: { label: 'Aprobado', color: 'success' },
  pending: { label: 'Pendiente', color: 'warning' },
  rejected: { label: 'Rechazado', color: 'error' },
};

function DonorManagement() {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [dialogType, setDialogType] = useState(null); // 'delete' | 'approve' | 'reject' | 'donate'
  const [donationForm, setDonationForm] = useState({ volume_ml: 450, donation_date: new Date().toISOString().split('T')[0] });
  const [donating, setDonating] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const navigate = useNavigate();
  const token = localStorage.getItem('access_token');

  useEffect(() => { fetchDonors(); }, []);

  const fetchDonors = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/donors?limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDonors(response.data || []);
      setError('');
    } catch (err) {
      setError('Error al cargar donantes');
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (donor, type) => {
    setSelectedDonor(donor);
    setDialogType(type);
  };

  const closeDialog = () => {
    setSelectedDonor(null);
    setDialogType(null);
  };

  const handleApprove = async () => {
    try {
      await axios.patch(
        `${API_BASE_URL}/admin/donors/${selectedDonor.id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDonors((prev) => prev.map((d) => d.id === selectedDonor.id ? { ...d, approval_status: 'approved' } : d));
      setSnackbar({ open: true, message: `${selectedDonor.name} ha sido aprobado y ya es visible para solicitantes`, severity: 'success' });
      closeDialog();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Error al aprobar', severity: 'error' });
      closeDialog();
    }
  };

  const handleReject = async () => {
    try {
      await axios.patch(
        `${API_BASE_URL}/admin/donors/${selectedDonor.id}/reject`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDonors((prev) => prev.map((d) => d.id === selectedDonor.id ? { ...d, approval_status: 'rejected' } : d));
      setSnackbar({ open: true, message: `${selectedDonor.name} ha sido rechazado`, severity: 'warning' });
      closeDialog();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Error al rechazar', severity: 'error' });
      closeDialog();
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/admin/donors/${selectedDonor.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDonors((prev) => prev.filter((d) => d.id !== selectedDonor.id));
      setSnackbar({ open: true, message: `Donante ${selectedDonor.name} eliminado`, severity: 'info' });
      closeDialog();
    } catch (err) {
      setSnackbar({ open: true, message: 'Error al eliminar donante', severity: 'error' });
      closeDialog();
    }
  };

  const handleRegisterDonation = async () => {
    setDonating(true);
    try {
      await axios.post(
        `${API_BASE_URL}/donors/${selectedDonor.id}/donate`,
        { volume_ml: Number(donationForm.volume_ml) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const today = new Date().toISOString();
      setDonors((prev) => prev.map((d) =>
        d.id === selectedDonor.id ? { ...d, last_donation_date: today } : d
      ));
      setSnackbar({ open: true, message: `Donación de ${donationForm.volume_ml} ml registrada para ${selectedDonor.name}`, severity: 'success' });
      closeDialog();
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'object' ? detail?.error || JSON.stringify(detail) : detail;
      setSnackbar({ open: true, message: msg || 'Error al registrar la donación', severity: 'error' });
    } finally {
      setDonating(false);
    }
  };

  const filtered = donors.filter((d) => {
    const term = searchTerm.toLowerCase();
    return (
      d.name?.toLowerCase().includes(term) ||
      d.email?.toLowerCase().includes(term) ||
      d.blood_type?.toLowerCase().includes(term) ||
      d.approval_status?.toLowerCase().includes(term)
    );
  });

  const pendingCount = donors.filter((d) => d.approval_status === 'pending').length;
  const approvedCount = donors.filter((d) => d.approval_status === 'approved').length;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/admin')} sx={{ textTransform: 'none' }}>
          Volver al panel
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 700, flexGrow: 1 }}>
          Gestión de Donantes
        </Typography>
        <Button startIcon={<RefreshIcon />} onClick={fetchDonors} variant="outlined" sx={{ textTransform: 'none' }}>
          Actualizar
        </Button>
      </Box>

      {/* Summary chips */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <Chip label={`Total: ${donors.length}`} variant="outlined" sx={{ fontWeight: 700 }} />
        <Chip label={`Aprobados: ${approvedCount}`} color="success" sx={{ fontWeight: 700 }} />
        {pendingCount > 0 && (
          <Chip label={`Pendientes de aprobación: ${pendingCount}`} color="warning" sx={{ fontWeight: 700, animation: 'pulse 1.5s infinite' }} />
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Search */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          fullWidth
          label="Buscar por nombre, email, tipo de sangre o estado..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
          }}
        />
      </Paper>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 700 }}>Donante</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Sangre</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Edad / Peso</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Última Donación</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">Cargando...</Typography>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {searchTerm ? 'No hay coincidencias' : 'No hay donantes registrados'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((donor) => {
                const bt = BLOOD_COLORS[donor.blood_type] || { bg: '#f5f5f5', color: '#555' };
                const st = STATUS_CONFIG[donor.approval_status] || STATUS_CONFIG.pending;
                return (
                  <TableRow
                    key={donor.id}
                    sx={{
                      '&:hover': { backgroundColor: '#fafafa' },
                      backgroundColor: donor.approval_status === 'pending' ? '#fffde7' : 'inherit',
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 36, height: 36, background: `linear-gradient(135deg, ${bt.color}, ${bt.color}88)`, fontSize: '0.9rem', fontWeight: 800 }}>
                          {donor.name?.charAt(0)?.toUpperCase() || '?'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{donor.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{donor.email}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<BloodIcon />}
                        label={donor.blood_type}
                        size="small"
                        sx={{ backgroundColor: bt.bg, color: bt.color, fontWeight: 800, '& .MuiChip-icon': { color: bt.color } }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{donor.age} años</Typography>
                      <Typography variant="caption" color="text.secondary">{donor.weight} kg</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {donor.last_donation_date ? new Date(donor.last_donation_date).toLocaleDateString('es-ES') : 'Nunca'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={st.label} color={st.color} size="small" sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        {donor.approval_status === 'pending' && (
                          <>
                            <Tooltip title="Aprobar donante — estará disponible para solicitantes">
                              <IconButton onClick={() => openDialog(donor, 'approve')} color="success" size="small">
                                <ApproveIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Rechazar donante">
                              <IconButton onClick={() => openDialog(donor, 'reject')} color="warning" size="small">
                                <RejectIcon />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {donor.approval_status === 'rejected' && (
                          <Tooltip title="Re-aprobar donante">
                            <IconButton onClick={() => openDialog(donor, 'approve')} color="success" size="small">
                              <ApproveIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {donor.approval_status === 'approved' && (() => {
                          const lastDate = donor.last_donation_date ? new Date(donor.last_donation_date) : null;
                          const daysSince = lastDate ? Math.floor((Date.now() - lastDate) / 86400000) : null;
                          const cooldown = getCooldownDays(donor.last_donation_volume_ml);
                          const eligible = daysSince === null || daysSince >= cooldown;
                          const daysLeft = eligible ? 0 : cooldown - daysSince;
                          return (
                            <Tooltip title={eligible ? 'Registrar donación' : `No elegible — quedan ${daysLeft} días (cooldown ${cooldown}d)`}>
                              <span>
                                <IconButton
                                  onClick={() => {
                                    setDonationForm({ volume_ml: 450, donation_date: new Date().toISOString().split('T')[0] });
                                    openDialog(donor, 'donate');
                                  }}
                                  size="small"
                                  disabled={!eligible}
                                  sx={{
                                    color: eligible ? '#c62828' : undefined,
                                    '&:hover': { backgroundColor: eligible ? '#ffebee' : undefined },
                                  }}
                                >
                                  <DonateIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                          );
                        })()}
                        <Tooltip title="Eliminar donante">
                          <IconButton onClick={() => openDialog(donor, 'delete')} color="error" size="small">
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Approve Dialog */}
      <Dialog open={dialogType === 'approve'} onClose={closeDialog} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: '#2e7d32' }}>Aprobar Donante</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, backgroundColor: '#e8f5e9', borderRadius: 2 }}>
            <ApproveIcon sx={{ color: '#2e7d32', fontSize: 36 }} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{selectedDonor?.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                Al aprobar, este donante será visible para todos los solicitantes.
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button onClick={handleApprove} variant="contained" color="success" sx={{ textTransform: 'none', fontWeight: 700 }}>
            Aprobar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={dialogType === 'reject'} onClose={closeDialog} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: '#e65100' }}>Rechazar Donante</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            ¿Seguro que quieres rechazar a <strong>{selectedDonor?.name}</strong>? El donante no aparecerá en búsquedas de solicitantes.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button onClick={handleReject} variant="contained" color="warning" sx={{ textTransform: 'none', fontWeight: 700 }}>
            Rechazar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={dialogType === 'delete'} onClose={closeDialog} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: '#c62828' }}>Eliminar Donante</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            Esta acción es permanente. Se eliminarán todos los datos de <strong>{selectedDonor?.name}</strong>.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button onClick={handleDelete} variant="contained" color="error" sx={{ textTransform: 'none', fontWeight: 700 }}>
            Eliminar definitivamente
          </Button>
        </DialogActions>
      </Dialog>

      {/* Donate Dialog */}
      <Dialog open={dialogType === 'donate'} onClose={closeDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 2, background: 'linear-gradient(135deg,#c62828,#e53935)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DonateIcon sx={{ color: 'white', fontSize: 20 }} />
          </Box>
          Registrar Donación
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedDonor && (() => {
            const lastDate = selectedDonor.last_donation_date ? new Date(selectedDonor.last_donation_date) : null;
            const daysSince = lastDate ? Math.floor((Date.now() - lastDate) / 86400000) : null;
            const bt = BLOOD_COLORS[selectedDonor.blood_type] || { bg: '#ffebee', color: '#c62828' };
            return (
              <Box>
                {/* Donor summary */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: 2, background: '#f8f9fa', border: '1px solid #e0e0e0', mb: 3 }}>
                  <Avatar sx={{ width: 52, height: 52, background: `linear-gradient(135deg,${bt.color},${bt.color}88)`, fontWeight: 800, fontSize: '1.3rem' }}>
                    {selectedDonor.name?.charAt(0)?.toUpperCase()}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{selectedDonor.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{selectedDonor.email}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      <Chip icon={<BloodIcon />} label={selectedDonor.blood_type} size="small"
                        sx={{ backgroundColor: bt.bg, color: bt.color, fontWeight: 800, '& .MuiChip-icon': { color: bt.color } }} />
                      <Chip icon={<EligibleIcon />} label="Elegible" size="small" color="success" sx={{ fontWeight: 700 }} />
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary">Última donación</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {lastDate ? `${daysSince} días atrás` : 'Nunca'}
                    </Typography>
                  </Box>
                </Box>

                {/* Form */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      Volumen donado (ml)
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                      {[
                        { v: 450, desc: '56 días' },
                        { v: 500, desc: '90 días' },
                        { v: 700, desc: '120 días' },
                        { v: 1000, desc: '180 días' },
                      ].map(({ v, desc }) => (
                        <Button key={v} size="small" variant={donationForm.volume_ml === v ? 'contained' : 'outlined'}
                          onClick={() => setDonationForm((f) => ({ ...f, volume_ml: v }))}
                          sx={{ textTransform: 'none', fontWeight: 700, minWidth: 80, flexDirection: 'column', py: 0.5,
                            ...(donationForm.volume_ml === v
                              ? { background: 'linear-gradient(135deg,#c62828,#e53935)', borderColor: 'transparent' }
                              : { borderColor: '#e0e0e0', color: '#555' })
                          }}>
                          <span>{v} ml</span>
                          <span style={{ fontSize: '0.62rem', opacity: 0.8 }}>↻ {desc}</span>
                        </Button>
                      ))}
                    </Box>
                    <TextField
                      fullWidth size="small"
                      label="O ingresa un volumen personalizado (ml)"
                      type="number"
                      value={donationForm.volume_ml}
                      onChange={(e) => {
                        const val = Math.max(100, Math.min(1000, Number(e.target.value)));
                        setDonationForm((f) => ({ ...f, volume_ml: val }));
                      }}
                      inputProps={{ min: 100, max: 1000, step: 10 }}
                      helperText="Rango válido: 100 – 1000 ml."
                    />
                  </Box>

                  <TextField
                    fullWidth size="small"
                    label="Fecha de donación"
                    type="date"
                    value={donationForm.donation_date}
                    onChange={(e) => setDonationForm((f) => ({ ...f, donation_date: e.target.value }))}
                    inputProps={{ max: new Date().toISOString().split('T')[0] }}
                    helperText="No puede ser una fecha futura."
                  />

                  <Alert severity="info" icon={<EligibleIcon />} sx={{ borderRadius: 2 }}>
                    Con <strong>{donationForm.volume_ml} ml</strong>, el período de recuperación será de{' '}
                    <strong>{getCooldownLabel(donationForm.volume_ml)}</strong>{' '}
                    (NOM-253-SSA1-2012 / OMS).
                  </Alert>
                </Box>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={closeDialog} sx={{ textTransform: 'none' }} disabled={donating}>Cancelar</Button>
          <Button
            onClick={handleRegisterDonation}
            variant="contained"
            disabled={donating || !donationForm.volume_ml}
            startIcon={donating ? null : <DonateIcon />}
            sx={{ textTransform: 'none', fontWeight: 700, px: 3, background: 'linear-gradient(135deg,#c62828,#e53935)',
              '&:hover': { background: 'linear-gradient(135deg,#b71c1c,#c62828)' } }}
          >
            {donating ? 'Registrando...' : 'Confirmar Donación'}
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

export default DonorManagement;
