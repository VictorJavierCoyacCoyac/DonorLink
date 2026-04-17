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
  Typography,
  Box,
  Alert,
  Chip,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    action: '',
    entity_type: '',
    user_id: '',
    skip: 0,
    limit: 50,
  });

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== 0) {
          params.append(key, value);
        }
      });

      const response = await axios.get(`${API_BASE_URL}/audit/logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(response.data.logs || []);
      setLoading(false);
    } catch (err) {
      setError('Error al cargar logs de auditoría');
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value, skip: 0 })); // Reset pagination
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'create': return 'success';
      case 'update': return 'warning';
      case 'delete': return 'error';
      case 'login': return 'info';
      case 'logout': return 'default';
      default: return 'default';
    }
  };

  if (loading) return <Typography>Cargando logs de auditoría...</Typography>;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Audit Logs
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filtros
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Acción</InputLabel>
            <Select
              value={filters.action}
              label="Acción"
              onChange={(e) => handleFilterChange('action', e.target.value)}
            >
              <MenuItem value="">Todas</MenuItem>
              <MenuItem value="create">Crear</MenuItem>
              <MenuItem value="update">Actualizar</MenuItem>
              <MenuItem value="delete">Eliminar</MenuItem>
              <MenuItem value="login">Login</MenuItem>
              <MenuItem value="logout">Logout</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Tipo de Entidad</InputLabel>
            <Select
              value={filters.entity_type}
              label="Tipo de Entidad"
              onChange={(e) => handleFilterChange('entity_type', e.target.value)}
            >
              <MenuItem value="">Todas</MenuItem>
              <MenuItem value="user">Usuario</MenuItem>
              <MenuItem value="donor">Donante</MenuItem>
              <MenuItem value="requester">Solicitante</MenuItem>
              <MenuItem value="donation_request">Solicitud de Donación</MenuItem>
              <MenuItem value="message">Mensaje</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="ID de Usuario"
            value={filters.user_id}
            onChange={(e) => handleFilterChange('user_id', e.target.value)}
            size="small"
          />

          <Button
            variant="outlined"
            startIcon={<SearchIcon />}
            onClick={fetchLogs}
          >
            Buscar
          </Button>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Timestamp</TableCell>
              <TableCell>Usuario</TableCell>
              <TableCell>Acción</TableCell>
              <TableCell>Tipo de Entidad</TableCell>
              <TableCell>ID de Entidad</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>IP</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{log.id}</TableCell>
                <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                <TableCell>{log.user_id}</TableCell>
                <TableCell>
                  <Chip label={log.action} color={getActionColor(log.action)} size="small" />
                </TableCell>
                <TableCell>{log.entity_type}</TableCell>
                <TableCell>{log.entity_id}</TableCell>
                <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {log.description}
                </TableCell>
                <TableCell>{log.ip_address}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {logs.length === 0 && (
        <Typography variant="body1" sx={{ textAlign: 'center', mt: 4 }}>
          No se encontraron logs de auditoría con los filtros aplicados.
        </Typography>
      )}
    </Container>
  );
}

export default AuditLogs;