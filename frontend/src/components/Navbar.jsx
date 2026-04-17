import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
} from '@mui/material';
import { Bloodtype } from '@mui/icons-material';

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('access_token');

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Bloodtype sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          DonorLink
        </Typography>
        {token ? (
          <Box>
            <Button color="inherit" onClick={() => navigate('/')}>
              Dashboard
            </Button>
            <Button color="inherit" onClick={() => navigate('/donors')}>
              Donors
            </Button>
            <Button color="inherit" onClick={() => navigate('/statistics')}>
              Statistics
            </Button>
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          </Box>
        ) : (
          <Button color="inherit" onClick={() => navigate('/login')}>
            Login
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;