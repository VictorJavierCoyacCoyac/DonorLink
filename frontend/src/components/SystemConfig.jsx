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
  IconButton,
  Tooltip,
} from '@mui/material';
import { Edit as EditIcon, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

function SystemConfig() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [editForm, setEditForm] = useState({ key: '', value: '', description: '' });
  const [createForm, setCreateForm] = useState({ key: '', value: '', description: '' });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE_URL}/admin/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConfigs(response.data.configs || []);
      setLoading(false);
    } catch (err) {
      setError('Error al cargar configuraciones');
      setLoading(false);
    }
  };

  const handleEditConfig = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.patch(`${API_BASE_URL}/admin/config/${selectedConfig.id}`, editForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConfigs(configs.map(config => config.id === selectedConfig.id ? response.data : config));
      setOpenEditDialog(false);
      setSelectedConfig(null);
    } catch (err) {
      setError('Error al actualizar configuración');
    }
  };

  const handleCreateConfig = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(`${API_BASE_URL}/admin/config`, createForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConfigs([...configs, response.data]);
      setOpenCreateDialog(false);
      setCreateForm({ key: '', value: '', description: '' });
    } catch (err) {
      setError('Error al crear configuración');
    }
  };

  const handleDeleteConfig = async () => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.delete(`${API_BASE_URL}/admin/config/${selectedConfig.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConfigs(configs.filter(config => config.id !== selectedConfig.id));
      setOpenDeleteDialog(false);
      setSelectedConfig(null);
    } catch (err) {
      setError('Error al eliminar configuración');
    }
  };

  const openEditDialog = (config) => {
    setSelectedConfig(config);
    setEditForm({ key: config.key, value: config.value, description: config.description || '' });
    setOpenEditDialog(true);
  };

  const openDeleteDialog = (config) => {
    setSelectedConfig(config);
    setOpenDeleteDialog(true);
  };

  if (loading) return <Typography>Cargando configuraciones del sistema...</Typography>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Configuración del Sistema
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setOpenCreateDialog(true)}
        >
          Agregar Configuración
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Clave</TableCell>
              <TableCell>Valor</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {configs.map((config) => (
              <TableRow key={config.id}>
                <TableCell>{config.key}</TableCell>
                <TableCell>{config.value}</TableCell>
                <TableCell>{config.description || 'Sin descripción'}</TableCell>
                <TableCell>
                  <Tooltip title="Editar">
                    <IconButton onClick={() => openEditDialog(config)} color="primary">
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton onClick={() => openDeleteDialog(config)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
        <DialogTitle>Editar Configuración</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Clave"
            value={editForm.key}
            onChange={(e) => setEditForm({ ...editForm, key: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Valor"
            value={editForm.value}
            onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Descripción"
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancelar</Button>
          <Button onClick={handleEditConfig} color="primary">Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)}>
        <DialogTitle>Crear Configuración</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Clave"
            value={createForm.key}
            onChange={(e) => setCreateForm({ ...createForm, key: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Valor"
            value={createForm.value}
            onChange={(e) => setCreateForm({ ...createForm, value: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Descripción"
            value={createForm.description}
            onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Cancelar</Button>
          <Button onClick={handleCreateConfig} color="primary">Crear</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que quieres eliminar la configuración "{selectedConfig?.key}"?
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancelar</Button>
          <Button onClick={handleDeleteConfig} color="error">Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default SystemConfig;