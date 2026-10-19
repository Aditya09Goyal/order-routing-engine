import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, Alert, Link } from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import api from '../api/axios';

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (username.length < 3) {
      return setError('Username must be at least 3 characters long');
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters long');
    }
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    try {
      const res = await api.post('/auth/register', { username, password });
      if (res.data.success) {
        setSuccess('Registration successful! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error registering account');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'background.default' }}>
      <Card sx={{ maxWidth: 400, width: '100%', p: 2, backgroundColor: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <CardContent>
          <Typography variant="h4" color="primary" gutterBottom align="center" fontWeight="bold">
            Routing Engine
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Create a new account
          </Typography>
          
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

          <form onSubmit={handleRegister}>
            <Alert severity="info" sx={{ mb: 2 }}>
              New accounts get the <b>Manager</b> role. Admin accounts are created by the system owner.
            </Alert>

            <TextField
              fullWidth
              label="Username"
              variant="outlined"
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              variant="outlined"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <TextField
              fullWidth
              label="Confirm Password"
              type="password"
              variant="outlined"
              margin="normal"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <Button 
              type="submit" 
              fullWidth 
              variant="contained" 
              color="primary" 
              size="large" 
              sx={{ mt: 3, mb: 2 }}
              disabled={!!success}
            >
              Register
            </Button>

            <Box textAlign="center">
              <Link component={RouterLink} to="/login" variant="body2" color="text.secondary">
                Already have an account? Login
              </Link>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Register;