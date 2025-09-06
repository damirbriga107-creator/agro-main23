const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = process.env.PORT || 3001;

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// CORS middleware (simple implementation)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Middleware
app.use(express.json());

// Simple in-memory user store for demo
const users = [
  {
    id: 1,
    username: 'farmer1',
    email: 'farmer1@daorsagro.com',
    password: 'password123', // In real app, this would be hashed
    role: 'farmer',
    farmId: 'farm_001',
    profile: {
      firstName: 'John',
      lastName: 'Smith',
      phone: '+1234567890',
      address: '123 Farm Road, Rural County, State 12345'
    }
  },
  {
    id: 2,
    username: 'admin',
    email: 'admin@daorsagro.com',
    password: 'admin123', // In real app, this would be hashed
    role: 'admin',
    farmId: null,
    profile: {
      firstName: 'Admin',
      lastName: 'User',
      phone: '+1234567891',
      address: 'DaorsAgro HQ'
    }
  },
  {
    id: 3,
    username: 'farmer2',
    email: 'farmer2@daorsagro.com',
    password: 'farmer123', // In real app, this would be hashed
    role: 'farmer',
    farmId: 'farm_002',
    profile: {
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '+1234567892',
      address: '456 Agriculture Ave, Farm Town, State 67890'
    }
  }
];

// Helper function to generate JWT token
const generateToken = (user) => {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    farmId: user.farmId
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

// Helper function to verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }

  req.user = decoded;
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Authentication Service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Login endpoint
app.post('/api/v1/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username and password are required'
    });
  }
  
  // Find user by username or email
  const user = users.find(u => 
    u.username === username || u.email === username
  );
  
  if (!user || user.password !== password) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
  
  // Generate JWT token
  const token = generateToken(user);
  
  // Return user data without password
  const { password: _, ...userWithoutPassword } = user;
  
  res.json({
    success: true,
    data: {
      token,
      user: userWithoutPassword
    },
    message: 'Login successful',
    timestamp: new Date().toISOString()
  });
});

// Register endpoint (simplified)
app.post('/api/v1/auth/register', (req, res) => {
  const { username, email, password, role, profile } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username, email, and password are required'
    });
  }
  
  // Check if user already exists
  const existingUser = users.find(u => 
    u.username === username || u.email === email
  );
  
  if (existingUser) {
    return res.status(409).json({
      success: false,
      error: 'User already exists'
    });
  }
  
  // Create new user
  const newUser = {
    id: users.length + 1,
    username,
    email,
    password, // In real app, hash this
    role: role || 'farmer',
    farmId: role === 'farmer' ? `farm_${String(users.length + 1).padStart(3, '0')}` : null,
    profile: profile || {}
  };
  
  users.push(newUser);
  
  // Generate token for new user
  const token = generateToken(newUser);
  
  // Return user data without password
  const { password: _, ...userWithoutPassword } = newUser;
  
  res.status(201).json({
    success: true,
    data: {
      token,
      user: userWithoutPassword
    },
    message: 'Registration successful',
    timestamp: new Date().toISOString()
  });
});

// Get current user profile
app.get('/api/v1/auth/profile', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }
  
  const { password: _, ...userWithoutPassword } = user;
  
  res.json({
    success: true,
    data: userWithoutPassword,
    timestamp: new Date().toISOString()
  });
});

// Update user profile
app.put('/api/v1/auth/profile', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }
  
  const { profile } = req.body;
  
  if (profile) {
    user.profile = { ...user.profile, ...profile };
  }
  
  const { password: _, ...userWithoutPassword } = user;
  
  res.json({
    success: true,
    data: userWithoutPassword,
    message: 'Profile updated successfully',
    timestamp: new Date().toISOString()
  });
});

// Verify token endpoint
app.post('/api/v1/auth/verify', (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'Token is required'
    });
  }
  
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
  
  res.json({
    success: true,
    data: decoded,
    timestamp: new Date().toISOString()
  });
});

// Logout endpoint (in a real app, you'd handle token blacklisting)
app.post('/api/v1/auth/logout', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully',
    timestamp: new Date().toISOString()
  });
});

// Get all users (admin only)
app.get('/api/v1/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  
  const usersWithoutPasswords = users.map(({ password, ...user }) => user);
  
  res.json({
    success: true,
    data: usersWithoutPasswords,
    total: usersWithoutPasswords.length,
    timestamp: new Date().toISOString()
  });
});

// Default route
app.get('/', (req, res) => {
  res.json({
    service: 'DaorsAgro Authentication Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      login: 'POST /api/v1/auth/login',
      register: 'POST /api/v1/auth/register',
      profile: 'GET /api/v1/auth/profile',
      verify: 'POST /api/v1/auth/verify',
      logout: 'POST /api/v1/auth/logout',
      users: 'GET /api/v1/users (admin)',
      health: 'GET /health'
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🔐 DaorsAgro Authentication Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🚪 Login API: http://localhost:${PORT}/api/v1/auth/login`);
  console.log(`👤 Profile API: http://localhost:${PORT}/api/v1/auth/profile`);
  console.log(`✨ Service is ready!`);
  console.log('');
  console.log('Demo users:');
  console.log('- farmer1 / password123 (Farmer)');
  console.log('- farmer2 / farmer123 (Farmer)');
  console.log('- admin / admin123 (Admin)');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});