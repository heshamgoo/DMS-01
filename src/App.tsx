import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Templates } from './pages/Templates';
import { TemplateBuilder } from './pages/TemplateBuilder';
import { Documents } from './pages/Documents';
import { DocumentViewer } from './pages/DocumentViewer';
import { DocumentCreator } from './pages/DocumentCreator';
import { Login } from './pages/Login';
import { Settings } from './pages/Settings';
import { Employees } from './pages/Employees';
import { EmployeeManagement } from './pages/EmployeeManagement';
import { Clients } from './pages/Clients';
import { useAuthStore } from './store/authStore';
import { useSettingsStore } from './store/settingsStore';
import { useStore } from './store/useStore';
import { auth } from './firebase';
import { signInAnonymously } from 'firebase/auth';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
}

export default function App() {
  const { init: initAuth, user } = useAuthStore();
  const { init: initSettings } = useSettingsStore();
  const { init: initStore } = useStore();

  useEffect(() => {
    initAuth();
    initSettings();
  }, [initAuth, initSettings]);

  useEffect(() => {
    if (user) {
      const unsub = initStore();
      return () => {
        if (typeof unsub === 'function') unsub();
      };
    }
  }, [user, initStore]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="templates" element={<Templates />} />
          <Route path="templates/new" element={<TemplateBuilder />} />
          <Route path="templates/:id" element={<TemplateBuilder />} />
          <Route path="documents" element={<Documents />} />
          <Route path="documents/new" element={<DocumentCreator />} />
          <Route path="documents/:id" element={<DocumentViewer />} />
          <Route path="clients" element={<Clients />} />
          <Route path="employees" element={<EmployeeManagement />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}
