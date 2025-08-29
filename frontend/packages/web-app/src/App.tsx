import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Financial from './pages/Financial';
import Subsidies from './pages/Subsidies';
import Insurance from './pages/Insurance';
import Analytics from './pages/Analytics';
import Documents from './pages/Documents';
import Login from './pages/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';

import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/financial/*" element={<Financial />} />
                      <Route path="/subsidies/*" element={<Subsidies />} />
                      <Route path="/insurance/*" element={<Insurance />} />
                      <Route path="/analytics/*" element={<Analytics />} />
                      <Route path="/documents/*" element={<Documents />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;