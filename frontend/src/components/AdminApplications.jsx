import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Typography, Box, Alert, Chip, Avatar, IconButton,
  Tooltip, TextField, InputAdornment, Snackbar, Popover, LinearProgress,
  Divider, CircularProgress,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Bloodtype as BloodIcon,
  Search as SearchIcon,
  HourglassEmpty as PendingIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  HelpOutline as UnknownIcon,
} from '@mui/icons-material';
import axios from 'axios';

import { API_BASE_URL } from '../config/api';

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

// Rules: goodAnswer = the answer that is FAVORABLE for donation
const APTITUDE_RULES = {
  1:  { goodAnswer: 'yes', weight: 20, label: 'Buen estado de salud hoy',        critical: true  },
  2:  { goodAnswer: 'yes', weight: 15, label: 'Edad entre 18-65 años',            critical: true  },
  3:  { goodAnswer: 'yes', weight: 15, label: 'Peso mayor a 50 kg',               critical: true  },
  4:  { goodAnswer: 'no',  weight: 20, label: 'Sin donación en últimos 56 días',  critical: true  },
  5:  { goodAnswer: 'no',  weight: 10, label: 'Sin hipertensión arterial',        critical: false },
  6:  { goodAnswer: 'no',  weight: 15, label: 'Sin anemia ni problemas de Hb',   critical: false },
  7:  { goodAnswer: 'no',  weight: 10, label: 'Sin fiebre/gripe reciente',        critical: false },
  8:  { goodAnswer: 'no',  weight:  5, label: 'Sin vacuna en últimos 7 días',     critical: false },
  9:  { goodAnswer: 'no',  weight:  5, label: 'Sin alcohol en últimas 24h',       critical: false },
  10: { goodAnswer: 'no',  weight: 20, label: 'Sin ITS en últimos 12 meses',      critical: true  },
  11: { goodAnswer: 'no',  weight: 10, label: 'Sin viaje a zona de riesgo',       critical: false },
};

function calcAptitude(answers) {
  if (!answers || Object.keys(answers).length === 0) return null;

  let earned = 0;
  let maxPossible = 0;
  const criticalFails = [];
  const details = [];

  for (const [qIdStr, rule] of Object.entries(APTITUDE_RULES)) {
    const qId = qIdStr;
    const raw = answers[qId];
    if (raw === undefined) continue;

    maxPossible += rule.weight;
    const answer = raw?.toLowerCase?.() === 'yes' ? 'yes' : raw?.toLowerCase?.() === 'no' ? 'no' : 'text';
    const pass = answer === rule.goodAnswer;

    if (pass) {
      earned += rule.weight;
    } else if (rule.critical && answer !== 'text') {
      criticalFails.push(rule.label);
    }

    details.push({ label: rule.label, pass, answer, isText: answer === 'text', critical: rule.critical });
  }

  // Q12 — medication text
  const med = answers['12'];
  const hasMedication = med && med.trim().toLowerCase() !== 'ninguno' && med.trim() !== '' && med.trim().toLowerCase() !== 'no';

  const score = maxPossible > 0 ? Math.round((earned / maxPossible) * 100) : null;
  const disqualified = criticalFails.length > 0;

  let label, color;
  if (disqualified) { label = 'No Apto'; color = '#c62828'; }
  else if (score >= 80) { label = 'Apto'; color = '#2e7d32'; }
  else if (score >= 55) { label = 'Requiere Revisión'; color = '#e65100'; }
  else { label = 'No Apto'; color = '#c62828'; }

  return { score, label, color, details, criticalFails, hasMedication, medication: med };
}

function AptitudePopover({ donor, anchorEl, open, onClose }) {
  if (!donor) return null;

  let answers = {};
  try {
    answers = typeof donor.questionnaire_answers === 'string'
      ? JSON.parse(donor.questionnaire_answers)
      : (donor.questionnaire_answers || {});
  } catch { /* ignore */ }

  const apt = calcAptitude(answers);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
      transformOrigin={{ vertical: 'center', horizontal: 'left' }}
      disableRestoreFocus
      sx={{ pointerEvents: 'none' }}
      PaperProps={{
        sx: { width: 320, borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', p: 0, overflow: 'hidden' },
      }}
    >
      {/* Header */}
      <Box sx={{
        p: 2,
        background: apt ? `linear-gradient(135deg, ${apt.color}dd, ${apt.color})` : 'linear-gradient(135deg,#9e9e9e,#616161)',
        color: 'white',
      }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
          {donor.name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {donor.blood_type} · {donor.age} años · {donor.weight} kg
          </Typography>
        </Box>
        {apt && (
          <Box sx={{ mt: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>Aptitud para donar</Typography>
              <Typography variant="caption" sx={{ fontWeight: 800 }}>{apt.score}% — {apt.label}</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={apt.score}
              sx={{
                height: 8, borderRadius: 4,
                backgroundColor: 'rgba(255,255,255,0.3)',
                '& .MuiLinearProgress-bar': { backgroundColor: 'white', borderRadius: 4 },
              }}
            />
          </Box>
        )}
      </Box>

      {/* Body */}
      <Box sx={{ p: 2, maxHeight: 300, overflowY: 'auto' }}>
        {!apt ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            Sin respuestas de cuestionario
          </Typography>
        ) : (
          <>
            {apt.criticalFails.length > 0 && (
              <Alert severity="error" sx={{ mb: 1.5, py: 0.5, borderRadius: 2, fontSize: '0.75rem' }}>
                <strong>Factores críticos:</strong> {apt.criticalFails.join(', ')}
              </Alert>
            )}
            {apt.hasMedication && (
              <Alert severity="warning" sx={{ mb: 1.5, py: 0.5, borderRadius: 2, fontSize: '0.75rem' }}>
                Medicación reportada: <strong>{apt.medication}</strong>
              </Alert>
            )}

            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Cuestionario
            </Typography>

            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.6 }}>
              {apt.details.map((d, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  {d.isText ? (
                    <UnknownIcon sx={{ fontSize: 16, color: '#9e9e9e', mt: 0.2, flexShrink: 0 }} />
                  ) : d.pass ? (
                    <CheckIcon sx={{ fontSize: 16, color: '#2e7d32', mt: 0.2, flexShrink: 0 }} />
                  ) : (
                    <CloseIcon sx={{ fontSize: 16, color: d.critical ? '#c62828' : '#e65100', mt: 0.2, flexShrink: 0 }} />
                  )}
                  <Typography variant="caption" sx={{
                    color: d.isText ? '#666' : d.pass ? '#1b5e20' : d.critical ? '#c62828' : '#e65100',
                    fontWeight: d.critical && !d.pass ? 700 : 400,
                    lineHeight: 1.3,
                  }}>
                    {d.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </>
        )}
      </Box>
    </Popover>
  );
}

function AdminApplications() {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [dialogType, setDialogType] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Hover popover state
  const [popoverAnchor, setPopoverAnchor] = useState(null);
  const [hoveredDonor, setHoveredDonor] = useState(null);

  const token = localStorage.getItem('access_token');
  const navigate = useNavigate();

  useEffect(() => { fetchPendingDonors(); }, []);

  const fetchPendingDonors = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/donors/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDonors(response.data || []);
      setError('');
    } catch {
      setError('Error al cargar solicitudes pendientes');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      await axios.patch(
        `${API_BASE_URL}/admin/donors/${selectedDonor.id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDonors((prev) => prev.filter((d) => d.id !== selectedDonor.id));
      setSnackbar({ open: true, message: `${selectedDonor.name} aprobado — ya visible para solicitantes`, severity: 'success' });
      setDialogType(null);
      setSelectedDonor(null);
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Error al aprobar', severity: 'error' });
    }
  };

  const handleReject = async () => {
    try {
      await axios.patch(
        `${API_BASE_URL}/admin/donors/${selectedDonor.id}/reject`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDonors((prev) => prev.filter((d) => d.id !== selectedDonor.id));
      setSnackbar({ open: true, message: `${selectedDonor.name} rechazado`, severity: 'warning' });
      setDialogType(null);
      setSelectedDonor(null);
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Error al rechazar', severity: 'error' });
    }
  };

  const handleRowEnter = (e, donor) => {
    setHoveredDonor(donor);
    setPopoverAnchor(e.currentTarget);
  };

  const handleRowLeave = () => {
    setPopoverAnchor(null);
    setHoveredDonor(null);
  };

  const filtered = donors.filter((d) => {
    const t = searchTerm.toLowerCase();
    return (
      d.name?.toLowerCase().includes(t) ||
      d.email?.toLowerCase().includes(t) ||
      d.blood_type?.toLowerCase().includes(t)
    );
  });

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/admin')} sx={{ textTransform: 'none' }}>
          Volver al panel
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 700, flexGrow: 1 }}>
          Solicitudes de Donantes Pendientes
        </Typography>
        <Button startIcon={<RefreshIcon />} onClick={fetchPendingDonors} variant="outlined" sx={{ textTransform: 'none' }}>
          Actualizar
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, alignItems: 'center' }}>
        <Chip
          icon={<PendingIcon />}
          label={`${donors.length} pendiente${donors.length !== 1 ? 's' : ''}`}
          color="warning"
          sx={{ fontWeight: 700 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Pasa el cursor sobre un donante para ver su resumen de aptitud
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Search */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          fullWidth
          label="Buscar por nombre, email o tipo de sangre..."
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
            <TableRow sx={{ backgroundColor: '#fff8e1' }}>
              <TableCell sx={{ fontWeight: 700 }}>Donante</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Sangre</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Edad / Peso</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Aptitud</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Registro</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={32} sx={{ color: '#e65100' }} />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <PendingIcon sx={{ fontSize: 48, color: '#e0e0e0', mb: 1, display: 'block', mx: 'auto' }} />
                  <Typography color="text.secondary" variant="h6">
                    {searchTerm ? 'Sin coincidencias' : 'No hay solicitudes pendientes'}
                  </Typography>
                  <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
                    {!searchTerm && 'Cuando un donante se registre, aparecerá aquí'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((donor) => {
                const bt = BLOOD_COLORS[donor.blood_type] || { bg: '#f5f5f5', color: '#555' };

                let answers = {};
                try {
                  answers = typeof donor.questionnaire_answers === 'string'
                    ? JSON.parse(donor.questionnaire_answers)
                    : (donor.questionnaire_answers || {});
                } catch { /* ignore */ }

                const apt = calcAptitude(answers);

                return (
                  <TableRow
                    key={donor.id}
                    onMouseEnter={(e) => handleRowEnter(e, donor)}
                    onMouseLeave={handleRowLeave}
                    sx={{
                      '&:hover': { backgroundColor: '#fffde7' },
                      cursor: 'default',
                      transition: 'background 0.15s',
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
                      {apt ? (
                        <Box sx={{ minWidth: 100 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.5 }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: apt.color, flexShrink: 0 }} />
                            <Typography variant="caption" sx={{ fontWeight: 700, color: apt.color }}>
                              {apt.label}
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={apt.score}
                            sx={{
                              height: 5, borderRadius: 3,
                              backgroundColor: '#e0e0e0',
                              '& .MuiLinearProgress-bar': { backgroundColor: apt.color, borderRadius: 3 },
                            }}
                          />
                          <Typography variant="caption" color="text.secondary">{apt.score}%</Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.disabled">Sin datos</Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {new Date(donor.created_at).toLocaleDateString('es-ES')}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title="Aprobar — será visible para solicitantes">
                          <IconButton
                            onClick={() => { setSelectedDonor(donor); setDialogType('approve'); }}
                            color="success" size="small"
                          >
                            <ApproveIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Rechazar registro">
                          <IconButton
                            onClick={() => { setSelectedDonor(donor); setDialogType('reject'); }}
                            color="error" size="small"
                          >
                            <RejectIcon />
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

      {/* Hover Aptitude Popover */}
      <AptitudePopover
        donor={hoveredDonor}
        anchorEl={popoverAnchor}
        open={Boolean(popoverAnchor) && Boolean(hoveredDonor)}
        onClose={handleRowLeave}
      />

      {/* Approve Dialog */}
      <Dialog open={dialogType === 'approve'} onClose={() => setDialogType(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: '#2e7d32' }}>Aprobar Donante</DialogTitle>
        <DialogContent>
          {selectedDonor && (() => {
            let answers = {};
            try { answers = typeof selectedDonor.questionnaire_answers === 'string' ? JSON.parse(selectedDonor.questionnaire_answers) : (selectedDonor.questionnaire_answers || {}); } catch {}
            const apt = calcAptitude(answers);
            return (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, backgroundColor: '#e8f5e9', borderRadius: 2, mb: apt?.criticalFails?.length > 0 ? 2 : 0 }}>
                  <ApproveIcon sx={{ color: '#2e7d32', fontSize: 36 }} />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{selectedDonor.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Al aprobar, este donante estará visible para todos los solicitantes.
                    </Typography>
                  </Box>
                </Box>
                {apt?.criticalFails?.length > 0 && (
                  <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                    <strong>Advertencia:</strong> Este candidato presentó factores de riesgo: {apt.criticalFails.join(', ')}. ¿Deseas aprobarlo de todas formas?
                  </Alert>
                )}
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogType(null)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button onClick={handleApprove} variant="contained" color="success" sx={{ textTransform: 'none', fontWeight: 700 }}>
            Aprobar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={dialogType === 'reject'} onClose={() => setDialogType(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: '#c62828' }}>Rechazar Donante</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            ¿Seguro que deseas rechazar a <strong>{selectedDonor?.name}</strong>? No aparecerá en búsquedas de solicitantes.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogType(null)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button onClick={handleReject} variant="contained" color="error" sx={{ textTransform: 'none', fontWeight: 700 }}>
            Rechazar
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

export default AdminApplications;
