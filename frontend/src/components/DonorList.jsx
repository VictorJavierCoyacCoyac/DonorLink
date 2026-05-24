import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Chip,
  IconButton,
  TablePagination,
} from '@mui/material';
import { Add, Edit, Search } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import { API_BASE_URL } from '../config/api';

const bloodTypes = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

function DonorList() {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    name: '',
    blood_type: '',
    min_age: '',
    max_age: '',
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDonors();
  }, []);

  const fetchDonors = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE_URL}/donors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDonors(response.data);
    } catch (error) {
      console.error('Error fetching donors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const searchFilters = {
        name: filters.name || undefined,
        blood_type: filters.blood_type || undefined,
        min_age: filters.min_age ? parseInt(filters.min_age) : undefined,
        max_age: filters.max_age ? parseInt(filters.max_age) : undefined,
      };
      const response = await axios.post(`${API_BASE_URL}/donors/search`, searchFilters, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDonors(response.data.donors);
    } catch (error) {
      console.error('Error searching donors:', error);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters({
      ...filters,
      [field]: value,
    });
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Donors</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/donors/new')}
        >
          Add Donor
        </Button>
      </Box>

      {/* Search Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Search & Filter
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
          <TextField
            label="Name"
            value={filters.name}
            onChange={(e) => handleFilterChange('name', e.target.value)}
            size="small"
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Blood Type</InputLabel>
            <Select
              value={filters.blood_type}
              label="Blood Type"
              onChange={(e) => handleFilterChange('blood_type', e.target.value)}
            >
              <MenuItem value=""><em>All</em></MenuItem>
              {bloodTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Min Age"
            type="number"
            value={filters.min_age}
            onChange={(e) => handleFilterChange('min_age', e.target.value)}
            size="small"
            sx={{ width: 100 }}
          />
          <TextField
            label="Max Age"
            type="number"
            value={filters.max_age}
            onChange={(e) => handleFilterChange('max_age', e.target.value)}
            size="small"
            sx={{ width: 100 }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<Search />}
            onClick={handleSearch}
          >
            Search
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setFilters({
                name: '',
                blood_type: '',
                min_age: '',
                max_age: '',
              });
              fetchDonors();
            }}
          >
            Clear Filters
          </Button>
        </Box>
      </Paper>

      {/* Donors Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Blood Type</TableCell>
              <TableCell>Age</TableCell>
              <TableCell>Weight</TableCell>
              <TableCell>Last Donation</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {donors
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((donor) => (
              <TableRow key={donor.id}>
                <TableCell>{donor.name}</TableCell>
                <TableCell>{donor.email}</TableCell>
                <TableCell>
                  <Chip label={donor.blood_type} color="primary" size="small" />
                </TableCell>
                <TableCell>{donor.age}</TableCell>
                <TableCell>{donor.weight} kg</TableCell>
                <TableCell>
                  {donor.last_donation_date
                    ? new Date(donor.last_donation_date).toLocaleDateString()
                    : 'Never'
                  }
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => navigate(`/donors/${donor.id}/edit`)}
                    color="primary"
                  >
                    <Edit />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={donors.length}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>
    </Container>
  );
}

export default DonorList;