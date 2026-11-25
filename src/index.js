import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { Routes, Route, HashRouter, useLocation } from 'react-router-dom';
import NavigationBar from './components/Navbar';
import Footer from './components/Footer';
import Events from './screens/Events';
import Team from './screens/Team';
import Auth from './screens/Auth';
import About from './screens/About';
import Accommodation from './screens/Accommodation';
import Sponsors from './screens/Sponsors';
import Register from './screens/Register';
import FaqPage from './screens/FaqPage';
import Contact from './screens/Contact';
import Dashboard from './screens/Dashboard';
import Admin from './screens/Admin';
import { AuthProvider, useAuth } from './context/AuthContext';

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";
import './tailwind.css';

const ADMIN_STAFF_ROLES = new Set(['super_admin', 'admin', 'coordinator']);

function AppLayout() {
  const location = useLocation();
  const { configured, loading, session, profile } = useAuth();
  const isAuthPage = location.pathname === '/signin' || location.pathname === '/signup';
  const isStaffPortal =
    location.pathname === '/admin' &&
    configured &&
    !loading &&
    Boolean(session && profile?.is_active && ADMIN_STAFF_ROLES.has(profile?.role));

  return (
    <>
      {!isAuthPage && !isStaffPortal && <NavigationBar />}
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/about" element={<About />} />
        <Route path="/events" element={<Events />} />
        <Route path="/accommodation" element={<Accommodation />} />
        <Route path="/sponsors" element={<Sponsors />} />
        <Route path="/team" element={<Team />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/register" element={<Register />} />
        <Route path="/signin" element={<Auth />} />
        <Route path="/signup" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<App />} />
      </Routes>
      {!isAuthPage && !isStaffPortal && <Footer />}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);

reportWebVitals();
