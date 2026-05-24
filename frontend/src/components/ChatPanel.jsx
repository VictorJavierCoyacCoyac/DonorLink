import { useState, useEffect, useRef } from 'react';
import {
  Box, Paper, Typography, TextField, IconButton, Avatar,
  CircularProgress, Chip, Divider,
} from '@mui/material';
import { Send as SendIcon, Bloodtype as BloodIcon } from '@mui/icons-material';
import axios from 'axios';

import { API_BASE_URL } from '../config/api';

function ChatPanel({ contactRequest, currentRole, currentProfileId, otherName, otherBloodType }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const token = localStorage.getItem('access_token');

  const fetchMessages = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/chat/${contactRequest.id}/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(res.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [contactRequest.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText('');
    try {
      const res = await axios.post(
        `${API_BASE_URL}/chat/${contactRequest.id}/messages`,
        { content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages((prev) => [...prev, res.data]);
    } catch {
      setText(content);
    } finally {
      setSending(false);
    }
  };

  const isMine = (msg) => msg.sender_type === currentRole;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 420, border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ p: 1.5, background: 'linear-gradient(135deg, #c62828, #e53935)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ width: 36, height: 36, background: 'rgba(255,255,255,0.25)', fontWeight: 700, fontSize: '0.9rem' }}>
          {otherName?.charAt(0)?.toUpperCase() || '?'}
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: 'white', lineHeight: 1.2 }}>{otherName}</Typography>
          {otherBloodType && (
            <Chip
              icon={<BloodIcon sx={{ fontSize: '0.8rem !important', color: 'white !important' }} />}
              label={otherBloodType}
              size="small"
              sx={{ height: 18, backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '0.65rem', '& .MuiChip-label': { px: 0.5 } }}
            />
          )}
        </Box>
        <Chip label="Chat activo" size="small" sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '0.7rem' }} />
      </Box>

      {/* Messages */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, backgroundColor: '#fafafa', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress size={28} /></Box>
        ) : messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 4 }}>
            <Typography variant="body2" color="text.secondary">Sé el primero en escribir 👋</Typography>
          </Box>
        ) : (
          messages.map((msg) => (
            <Box key={msg.id} sx={{ display: 'flex', justifyContent: isMine(msg) ? 'flex-end' : 'flex-start' }}>
              <Box sx={{
                maxWidth: '72%',
                px: 1.5, py: 0.8,
                borderRadius: isMine(msg) ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                backgroundColor: isMine(msg) ? '#c62828' : 'white',
                color: isMine(msg) ? 'white' : '#1a1a1a',
                boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
              }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem', lineHeight: 1.4 }}>{msg.content}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.65rem', display: 'block', textAlign: 'right', mt: 0.3 }}>
                  {new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Box>
            </Box>
          ))
        )}
        <div ref={bottomRef} />
      </Box>

      <Divider />

      {/* Input */}
      <Box sx={{ p: 1.5, display: 'flex', gap: 1, alignItems: 'flex-end', backgroundColor: 'white' }}>
        <TextField
          fullWidth
          multiline
          maxRows={3}
          size="small"
          placeholder="Escribe un mensaje..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
        />
        <IconButton
          onClick={handleSend}
          disabled={!text.trim() || sending}
          sx={{ backgroundColor: '#c62828', color: 'white', '&:hover': { backgroundColor: '#b71c1c' }, '&:disabled': { backgroundColor: '#e0e0e0' } }}
        >
          {sending ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <SendIcon fontSize="small" />}
        </IconButton>
      </Box>
    </Box>
  );
}

export default ChatPanel;
