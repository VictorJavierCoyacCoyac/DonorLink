import { useState, useEffect, useCallback } from 'react';
import {
  Badge, IconButton, Popover, Box, Typography, List, ListItem,
  ListItemText, ListItemIcon, Chip, Button, Divider, CircularProgress,
} from '@mui/material';
import {
  Notifications as BellIcon,
  Warning as WarnIcon,
  Info as InfoIcon,
  Chat as ChatIcon,
  DoneAll as DoneAllIcon,
} from '@mui/icons-material';
import axios from 'axios';

import { API_BASE_URL } from '../config/api';

const TYPE_META = {
  system:  { icon: InfoIcon, color: '#1565c0', bg: '#e3f2fd' },
  alert:   { icon: WarnIcon, color: '#e65100', bg: '#fff3e0' },
  request: { icon: ChatIcon, color: '#2e7d32', bg: '#e8f5e9' },
  message: { icon: ChatIcon, color: '#6a1b9a', bg: '#f3e5f5' },
};

function fmtDate(iso) {
  const d = new Date(iso);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return 'Hace un momento';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function NotificationsPanel({ accentColor = '#c62828' }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const token = localStorage.getItem('access_token');

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${API_BASE_URL}/notifications`, {
        params: { limit: 30 },
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
    const iv = setInterval(fetchNotifications, 20000);
    return () => clearInterval(iv);
  }, [fetchNotifications]);

  const markRead = async (id) => {
    try {
      await axios.patch(`${API_BASE_URL}/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    setLoading(true);
    try {
      await axios.patch(`${API_BASE_URL}/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const handleOpen = (e) => {
    setAnchor(e.currentTarget);
    if (unreadCount > 0) setTimeout(markAllRead, 1200);
  };

  return (
    <>
      <IconButton onClick={handleOpen} sx={{ color: 'white' }}>
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <BellIcon />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            width: 360, maxHeight: 500, borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column',
          },
        }}
      >
        {/* Header */}
        <Box sx={{
          p: 2, pb: 1.5, flexShrink: 0,
          background: `linear-gradient(135deg, ${accentColor}dd, ${accentColor})`,
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BellIcon sx={{ fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Notificaciones</Typography>
            {unreadCount > 0 && (
              <Chip label={unreadCount} size="small"
                sx={{ backgroundColor: 'rgba(255,255,255,0.3)', color: 'white', fontWeight: 800, height: 20 }} />
            )}
          </Box>
          {unreadCount > 0 && (
            <Button size="small" onClick={markAllRead} disabled={loading}
              startIcon={loading ? <CircularProgress size={12} sx={{ color: 'white' }} /> : <DoneAllIcon sx={{ fontSize: 14 }} />}
              sx={{ color: 'rgba(255,255,255,0.9)', textTransform: 'none', fontSize: '0.75rem', fontWeight: 600 }}
            >
              Todo leído
            </Button>
          )}
        </Box>

        {/* List */}
        <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
          {notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <BellIcon sx={{ fontSize: 40, color: '#bdbdbd', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">Sin notificaciones</Typography>
            </Box>
          ) : (
            <List dense disablePadding>
              {notifications.map((n, i) => {
                const meta = TYPE_META[n.notification_type] || TYPE_META.system;
                const Icon = meta.icon;
                return (
                  <Box key={n.id}>
                    <ListItem
                      alignItems="flex-start"
                      onClick={() => !n.is_read && markRead(n.id)}
                      sx={{
                        cursor: n.is_read ? 'default' : 'pointer',
                        backgroundColor: n.is_read ? 'transparent' : meta.bg,
                        '&:hover': { backgroundColor: '#f5f5f5' },
                        py: 1.5, px: 2,
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                        <Box sx={{
                          width: 28, height: 28, borderRadius: '50%', backgroundColor: meta.bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Icon sx={{ fontSize: 16, color: meta.color }} />
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: n.is_read ? 500 : 700, color: '#1a1a1a', lineHeight: 1.3 }}>
                              {n.title}
                            </Typography>
                            {!n.is_read && <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: meta.color, flexShrink: 0 }} />}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3, lineHeight: 1.4 }}>
                              {n.content}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#9e9e9e', fontSize: '0.68rem' }}>
                              {fmtDate(n.created_at)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {i < notifications.length - 1 && <Divider component="li" />}
                  </Box>
                );
              })}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
}
