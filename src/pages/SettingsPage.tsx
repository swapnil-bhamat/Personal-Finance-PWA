import { Box, Button, Typography, Alert, Snackbar } from '@mui/material';
import { useState } from 'react';
import { resetDatabase } from '../services/db';

export default function SettingsPage() {
  const [isResetting, setIsResetting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset the database? This will remove all your data and restore default values.')) {
      try {
        setIsResetting(true);
        setError(null);
        await resetDatabase();
        setShowSuccess(true);
        // Force page reload after reset
        window.location.reload();
      } catch (err) {
        console.error('Reset failed:', err);
        setError(err instanceof Error ? err.message : 'Reset failed');
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom color="error">
          Danger Zone
        </Typography>
        <Box sx={{ 
          p: 2, 
          border: '1px solid #ff0000', 
          borderRadius: 1,
          backgroundColor: 'rgba(255, 0, 0, 0.05)'
        }}>
          <Typography gutterBottom>
            Reset Database to Default Values
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This will delete all your current data and restore the default values. This action cannot be undone.
          </Typography>
          <Button 
            variant="outlined" 
            color="error"
            onClick={handleReset}
            disabled={isResetting}
          >
            {isResetting ? 'Resetting...' : 'Reset Database'}
          </Button>
        </Box>
      </Box>

      <Snackbar 
        open={showSuccess} 
        autoHideDuration={6000} 
        onClose={() => setShowSuccess(false)}
      >
        <Alert severity="success" onClose={() => setShowSuccess(false)}>
          Database reset successfully
        </Alert>
      </Snackbar>

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
