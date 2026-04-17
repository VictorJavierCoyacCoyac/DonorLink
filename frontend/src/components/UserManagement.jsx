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
  IconButton,
  Tooltip,
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, PersonAdd as PersonAddIcon } from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', email: '', role: '' });
  const [createForm, setCreateForm] = useState({ username: '', email: '', password: '', role: 'donor' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data.users || []);
      setLoading(false);
    } catch (err) {
      setError('Error al cargar usuarios');
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.delete(`${API_BASE_URL}/admin/users/${selectedUser.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(users.filter(user => user.id !== selectedUser.id));
      setOpenDeleteDialog(false);
      setSelectedUser(null);
    } catch (err) {
      setError('Error al eliminar usuario');
    }
  };

  const handleEditUser = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.patch(`${API_BASE_URL}/admin/users/${selectedUser.id}`, editForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(users.map(user => user.id === selectedUser.id ? response.data : user));
      setOpenEditDialog(false);
      setSelectedUser(null);
    } catch (err) {
      setError('Error al actualizar usuario');
    }
  };

  const handleCreateUser = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(`${API_BASE_URL}/admin/users`, createForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers([...users, response.data]);
      setOpenCreateDialog(false);
      setCreateForm({ username: '', email: '', password: '', role: 'donor' });
    } catch (err) {
      setError('Error al crear usuario');
    }
  };

  const openEditDialog = (user) => {
    setSelectedUser(user);
    setEditForm({ username: user.username, email: user.email, role: user.role });
    setOpenEditDialog(true);
  };

  const openDeleteDialog = (user) => {
    setSelectedUser(user);
    setOpenDeleteDialog(true);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'staff': return 'warning';
      case 'donor': return 'success';
      case 'requester': return 'info';
      default: return 'default';
    }
  };

  if (loading) return <Typography>Cargando usuarios...</Typography>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Gestión de Usuarios
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PersonAddIcon />}
          onClick={() => setOpenCreateDialog(true)}
        >
          Crear Usuario
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Usuario</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.id}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip label={user.role} color={getRoleColor(user.role)} size="small" />
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.is_active ? 'Activo' : 'Inactivo'}
                    color={user.is_active ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="Editar">
                    <IconButton onClick={() => openEditDialog(user)} color="primary">
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton onClick={() => openDeleteDialog(user)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que quieres eliminar al usuario "{selectedUser?.username}"?
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancelar</Button>
          <Button onClick={handleDeleteUser} color="error">Eliminar</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
        <DialogTitle>Editar Usuario</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Usuario"
            value={editForm.username}
            onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Email"
            value={editForm.email}
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            select
            fullWidth
            label="Rol"
            value={editForm.role}
            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
            sx={{ mt: 2 }}
            SelectProps={{ native: true }}
          >
            <option value="donor">Donor</option>
            <option value="requester">Requester</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancelar</Button>
          <Button onClick={handleEditUser} color="primary">Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)}>
        <DialogTitle>Crear Usuario</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Usuario"
            value={createForm.username}
            onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Email"
            value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Contraseña"
            type="password"
            value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            select
            fullWidth
            label="Rol"
            value={createForm.role}
            onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
            sx={{ mt: 2 }}
            SelectProps={{ native: true }}
          >
            <option value="donor">Donor</option>
            <option value="requester">Requester</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Cancelar</Button>
          <Button onClick={handleCreateUser} color="primary">Crear</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default UserManagement;