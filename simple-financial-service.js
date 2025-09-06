const express = require('express');
const app = express();
const PORT = process.env.PORT || 3003;

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

// Simple in-memory data store for demo
let transactions = [
  {
    id: 1,
    type: 'income',
    category: 'crop_sale',
    amount: 25000,
    description: 'Wheat harvest sale',
    date: '2024-01-15',
    farmId: 'farm_001'
  },
  {
    id: 2,
    type: 'expense',
    category: 'seeds',
    amount: 5000,
    description: 'Seeds for next season',
    date: '2024-01-20',
    farmId: 'farm_001'
  },
  {
    id: 3,
    type: 'expense',
    category: 'equipment',
    amount: 15000,
    description: 'Tractor maintenance',
    date: '2024-01-25',
    farmId: 'farm_001'
  }
];

let budgets = [
  {
    id: 1,
    farmId: 'farm_001',
    category: 'seeds',
    allocated: 20000,
    spent: 5000,
    remaining: 15000,
    period: '2024-Q1'
  },
  {
    id: 2,
    farmId: 'farm_001',
    category: 'equipment',
    allocated: 50000,
    spent: 15000,
    remaining: 35000,
    period: '2024-Q1'
  }
];

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Financial Service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Get all transactions
app.get('/api/v1/transactions', (req, res) => {
  const { farmId, type, category } = req.query;
  let filteredTransactions = [...transactions];
  
  if (farmId) {
    filteredTransactions = filteredTransactions.filter(t => t.farmId === farmId);
  }
  if (type) {
    filteredTransactions = filteredTransactions.filter(t => t.type === type);
  }
  if (category) {
    filteredTransactions = filteredTransactions.filter(t => t.category === category);
  }
  
  res.json({
    success: true,
    data: filteredTransactions,
    total: filteredTransactions.length,
    timestamp: new Date().toISOString()
  });
});

// Get transaction by ID
app.get('/api/v1/transactions/:id', (req, res) => {
  const transaction = transactions.find(t => t.id === parseInt(req.params.id));
  
  if (!transaction) {
    return res.status(404).json({
      success: false,
      error: 'Transaction not found'
    });
  }
  
  res.json({
    success: true,
    data: transaction,
    timestamp: new Date().toISOString()
  });
});

// Create new transaction
app.post('/api/v1/transactions', (req, res) => {
  const { type, category, amount, description, farmId, date } = req.body;
  
  if (!type || !category || !amount || !description || !farmId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: type, category, amount, description, farmId'
    });
  }
  
  const newTransaction = {
    id: transactions.length + 1,
    type,
    category,
    amount: parseFloat(amount),
    description,
    farmId,
    date: date || new Date().toISOString().split('T')[0]
  };
  
  transactions.push(newTransaction);
  
  res.status(201).json({
    success: true,
    data: newTransaction,
    message: 'Transaction created successfully',
    timestamp: new Date().toISOString()
  });
});

// Get all budgets
app.get('/api/v1/budgets', (req, res) => {
  const { farmId, period } = req.query;
  let filteredBudgets = [...budgets];
  
  if (farmId) {
    filteredBudgets = filteredBudgets.filter(b => b.farmId === farmId);
  }
  if (period) {
    filteredBudgets = filteredBudgets.filter(b => b.period === period);
  }
  
  res.json({
    success: true,
    data: filteredBudgets,
    total: filteredBudgets.length,
    timestamp: new Date().toISOString()
  });
});

// Get budget by ID
app.get('/api/v1/budgets/:id', (req, res) => {
  const budget = budgets.find(b => b.id === parseInt(req.params.id));
  
  if (!budget) {
    return res.status(404).json({
      success: false,
      error: 'Budget not found'
    });
  }
  
  res.json({
    success: true,
    data: budget,
    timestamp: new Date().toISOString()
  });
});

// Create new budget
app.post('/api/v1/budgets', (req, res) => {
  const { farmId, category, allocated, period } = req.body;
  
  if (!farmId || !category || !allocated || !period) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: farmId, category, allocated, period'
    });
  }
  
  const newBudget = {
    id: budgets.length + 1,
    farmId,
    category,
    allocated: parseFloat(allocated),
    spent: 0,
    remaining: parseFloat(allocated),
    period
  };
  
  budgets.push(newBudget);
  
  res.status(201).json({
    success: true,
    data: newBudget,
    message: 'Budget created successfully',
    timestamp: new Date().toISOString()
  });
});

// Get financial summary
app.get('/api/v1/summary', (req, res) => {
  const { farmId } = req.query;
  let filteredTransactions = farmId ? 
    transactions.filter(t => t.farmId === farmId) : 
    transactions;
  
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const netProfit = totalIncome - totalExpenses;
  
  res.json({
    success: true,
    data: {
      totalIncome,
      totalExpenses,
      netProfit,
      transactionCount: filteredTransactions.length,
      period: 'Current Period'
    },
    timestamp: new Date().toISOString()
  });
});

// Default route
app.get('/', (req, res) => {
  res.json({
    service: 'DaorsAgro Financial Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      transactions: '/api/v1/transactions',
      budgets: '/api/v1/budgets',
      summary: '/api/v1/summary',
      health: '/health'
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
  console.log(`🏦 DaorsAgro Financial Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`💰 Transactions API: http://localhost:${PORT}/api/v1/transactions`);
  console.log(`📋 Budgets API: http://localhost:${PORT}/api/v1/budgets`);
  console.log(`📈 Summary API: http://localhost:${PORT}/api/v1/summary`);
  console.log(`✨ Service is ready!`);
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