import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Nav } from 'react-bootstrap';

// Layout Components
import MainLayout from './components/common/MainLayout';
import ProtectedRoute from './components/common/ProtectedRoute';

// Authentication Components
import Login from './components/authentication/Login';
import Register from './components/authentication/Register';
import ForgotPassword from './components/authentication/ForgotPassword';
import ResetPassword from './components/authentication/ResetPassword';

// Dashboard Components
import Dashboard from './components/dashboard/Dashboard';

// User Management Components
import UserList from './components/users/UserList';
import UserDetails from './components/users/UserDetails';
import UserCreate from './components/users/UserCreate';
import UserEdit from './components/users/UserEdit';
import UserBulkUpload from './components/users/UserBulkUpload';

// Role Management Components
import RoleList from './components/roles/RoleList';
import FeatureToggleList from './components/feature/FeatureToggleList';
import RoleDetails from './components/roles/RoleDetails';
import RoleCreate from './components/roles/RoleCreate';
import RoleEdit from './components/roles/RoleEdit';
import RoleBulkUpload from './components/roles/RoleBulkUpload';

// Permission Management Components
import PermissionList from './components/permissions/PermissionList';
import PermissionDetails from './components/permissions/PermissionDetails';
import PermissionCreate from './components/permissions/PermissionCreate';
import PermissionEdit from './components/permissions/PermissionEdit';

// Logging Components
import ActivityLogs from './components/logging/ActivityLogs';

function App() {
  const { isAuthenticated, isLoading, currentUser, hasRole } = useAuth();
  
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      
      {/* Add other menu items here */}
      {/* Feature Toggles menu item is handled in the sidebar/navbar, not here */}
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        
        {/* User Management Routes */}
        <Route path="users">
          <Route index element={<UserList />} />
          <Route path=":id" element={<UserDetails />} />
          <Route path="create" element={<UserCreate />} />
          <Route path="edit/:id" element={<UserEdit />} />
          <Route path="bulk-upload" element={<UserBulkUpload />} />
        </Route>
        
        {/* Role Management Routes */}
        <Route path="roles">
          <Route index element={<RoleList />} />
          <Route path=":id" element={<RoleDetails />} />
          <Route path="create" element={<RoleCreate />} />
          {hasRole && hasRole(['admin', 'full_access']) && (
            <Route path="feature-toggles" element={<FeatureToggleList />} />
          )}
          <Route path="edit/:id" element={<RoleEdit />} />
          <Route path="bulk-upload" element={<RoleBulkUpload />} />
        </Route>
        
        {/* Permission Management Routes */}
        <Route path="permissions">
          <Route index element={<PermissionList />} />
          <Route path=":id" element={<PermissionDetails />} />
          <Route path="create" element={<PermissionCreate />} />
          <Route path="edit/:id" element={<PermissionEdit />} />
        </Route>
        
        {/* Logging Routes */}
        <Route path="logs" element={<ActivityLogs />} />
      </Route>
      
      {/* Catch All Route */}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
    </Routes>
  );
}

export default App;
