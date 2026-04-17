import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  Card,
  CardContent,
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

function Statistics() {
  const [donorStats, setDonorStats] = useState(null);
  const [donationStats, setDonationStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const token = localStorage.getItem('access_token');

      const [donorResponse, donationResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/statistics/donors`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/statistics/donations`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setDonorStats(donorResponse.data);
      setDonationStats(donationResponse.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  // Prepare data for charts
  const bloodTypeData = donorStats?.blood_type_distribution
    ? Object.entries(donorStats.blood_type_distribution).map(([type, count]) => ({
        name: type,
        value: count,
      }))
    : [];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Statistics
      </Typography>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Donors
              </Typography>
              <Typography variant="h4">
                {donorStats?.total_donors || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Donations
              </Typography>
              <Typography variant="h4">
                {donationStats?.total_donations || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Volume (ml)
              </Typography>
              <Typography variant="h4">
                {donationStats?.total_volume_ml ? Math.round(donationStats.total_volume_ml) : 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Average Age
              </Typography>
              <Typography variant="h4">
                {donorStats?.average_age ? Math.round(donorStats.average_age) : 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Blood Type Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Blood Type Distribution
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie
                  data={bloodTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {bloodTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Placeholder for additional charts */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Donation Trends
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%' }}>
              <Typography color="textSecondary">
                Chart will be implemented with more donation data
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Statistics;