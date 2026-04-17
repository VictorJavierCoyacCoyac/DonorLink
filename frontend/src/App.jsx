import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import DonorApplication from './components/DonorApplication';
import RequesterRegister from './components/RequesterRegister';
import AdminApplications from './components/AdminApplications';
import UserManagement from './components/UserManagement';
import SystemConfig from './components/SystemConfig';
import AuditLogs from './components/AuditLogs';
import DonorManagement from './components/DonorManagement';

const API_BASE_URL = 'http://localhost:8000/api/v1';

function App() {
  console.log('🔧 App component rendering');
  const token = localStorage.getItem('access_token');

  useEffect(() => {
    if (!token) return;

    fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).catch((err) => {
      console.error('Unable to validate current user:', err);
    });
  }, [token]);

  if (!token) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/donor-application" element={<DonorApplication />} />
          <Route path="/requester-register" element={<RequesterRegister />} />
          <Route path="*" element={<Login />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/admin/applications" element={<AdminApplications />} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/donors" element={<DonorManagement />} />
        <Route path="/admin/config" element={<SystemConfig />} />
        <Route path="/admin/audit" element={<AuditLogs />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;

