import { useState } from 'react';
import {
  Container,
  Paper,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import axios from 'axios';

import { API_BASE_URL } from '../config/api';

function TestConnection() {
  const [status, setStatus] = useState('');
  const [result, setResult] = useState('');

  const testBackendConnection = async () => {
    setStatus('Testing...');
    setResult('');
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username: 'admin',
        password: 'admin123',
      });
      setStatus('✓ SUCCESS');
      setResult(JSON.stringify(response.data, null, 2));
    } catch (err) {
      setStatus('✗ ERROR');
      setResult(
        `Error: ${err.message}\n\n` +
        `Status: ${err.response?.status}\n` +
        `Data: ${JSON.stringify(err.response?.data, null, 2)}`
      );
      console.error('Full error:', err);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ marginTop: 8, padding: 4 }}>
        <Paper elevation={3} sx={{ padding: 4 }}>
          <Typography component="h1" variant="h5" gutterBottom>
            Test Backend Connection
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={testBackendConnection}
            fullWidth
            sx={{ mt: 2 }}
          >
            Test Login Endpoint
          </Button>
          {status && (
            <Alert severity={status.includes('SUCCESS') ? 'success' : 'error'} sx={{ mt: 2 }}>
              {status}
            </Alert>
          )}
          {result && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                backgroundColor: '#f5f5f5',
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '300px',
                overflow: 'auto',
              }}
            >
              {result}
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
}

export default TestConnection;
