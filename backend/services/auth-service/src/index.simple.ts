import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'auth-service',
    version: '1.0.0'
  });
});

// Basic auth routes
app.post('/api/auth/register', (req, res) => {
  res.json({ message: 'Registration endpoint - not implemented yet' });
});

app.post('/api/auth/login', (req, res) => {
  res.json({ message: 'Login endpoint - not implemented yet' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});