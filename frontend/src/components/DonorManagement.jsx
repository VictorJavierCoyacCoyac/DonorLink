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
  Typography,
  Box,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Delete as DeleteIcon, Search as SearchIcon } from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

function DonorManagement() {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDonors();
  }, []);

  const fetchDonors = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE_URL}/donors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDonors(response.data || []);
      setLoading(false);
    } catch (err) {
      setError('Error al cargar donantes');
      setLoading(false);
    }
  };

  const handleDeleteDonor = async () => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.delete(`${API_BASE_URL}/admin/donors/${selectedDonor.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDonors(donors.filter(donor => donor.id !== selectedDonor.id));
      setOpenDeleteDialog(false);
      setSelectedDonor(null);
    } catch (err) {
      setError('Error al eliminar donante');
    }
  };

  const openDeleteDialog = (donor) => {
    setSelectedDonor(donor);
    setOpenDeleteDialog(true);
  };

  const filteredDonors = donors.filter(donor =>
    donor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    donor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    donor.blood_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  const getBloodTypeColor = (bloodType) => {
    // Simple color coding for blood types
    const colors = {
      'O_POSITIVE': 'error',
      'O_NEGATIVE': 'error',
      'A_POSITIVE': 'warning',
      'A_NEGATIVE': 'warning',
      'B_POSITIVE': 'success',
      'B_NEGATIVE': 'success',
      'AB_POSITIVE': 'info',
      'AB_NEGATIVE': 'info',
    };
    return colors[bloodType] || 'default';
  };

  if (loading) return <Typography>Cargando donantes...</Typography>;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Gestión de Donantes
        </Typography>
        <Button variant="contained" color="primary" onClick={fetchDonors}>
          Actualizar Lista
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          label="Buscar donantes"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          placeholder="Buscar por nombre, email o tipo de sangre..."
        />
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Teléfono</TableCell>
              <TableCell>Tipo de Sangre</TableCell>
              <TableCell>Edad</TableCell>
              <TableCell>Peso (kg)</TableCell>
              <TableCell>Última Donación</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDonors.map((donor) => (
              <TableRow key={donor.id}>
                <TableCell>{donor.id}</TableCell>
                <TableCell>{donor.name}</TableCell>
                <TableCell>{donor.email}</TableCell>
                <TableCell>{donor.phone}</TableCell>
                <TableCell>
                  <Chip
                    label={donor.blood_type.replace('_', ' ')}
                    color={getBloodTypeColor(donor.blood_type)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{donor.age}</TableCell>
                <TableCell>{donor.weight}</TableCell>
                <TableCell>{formatDate(donor.last_donation_date)}</TableCell>
                <TableCell>
                  <Tooltip title="Eliminar Donante">
                    <IconButton onClick={() => openDeleteDialog(donor)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredDonors.length === 0 && (
        <Typography variant="body1" sx={{ textAlign: 'center', mt: 4 }}>
          {searchTerm ? 'No se encontraron donantes con los criterios de búsqueda.' : 'No hay donantes registrados.'}
        </Typography>
      )}

      {/* Delete Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que quieres eliminar al donante "{selectedDonor?.name}"?
            Esta acción no se puede deshacer y eliminará permanentemente todos los datos del donante.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancelar</Button>
          <Button onClick={handleDeleteDonor} color="error">Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default DonorManagement;