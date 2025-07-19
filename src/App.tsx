import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import Dashboard from './pages/Dashboard';
import AgentDetails from './pages/dashboard/AgentDetails';
import KnowledgeBaseDetails from './pages/dashboard/KnowledgeBaseDetails';
import UserManagement from './pages/dashboard/UserManagement';
import { Loader } from './components/Loader';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-light dark:bg-dark-300 transition-colors duration-200">
          <Routes>
            <Route 
              path="/" 
              element={
                <PublicRoute>
                  <LandingPage />
                </PublicRoute>
              } 
            />
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            <Route 
              path="/signup" 
              element={
                <PublicRoute>
                  <Signup />
                </PublicRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/dashboard/agents/:agentId" element={<ProtectedRoute><AgentDetails /></ProtectedRoute>} />
            <Route path="/dashboard/knowledge/:documentId" element={<ProtectedRoute><KnowledgeBaseDetails /></ProtectedRoute>} />
            <Route 
              path="/dashboard/*" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader />;
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader />;
  }

  return user ? <Navigate to="/dashboard" /> : <>{children}</>;
};

export default App;