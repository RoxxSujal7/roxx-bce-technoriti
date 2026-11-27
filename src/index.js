import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { Routes, Route, HashRouter, useLocation } from 'react-router-dom';
import NavigationBar from './components/Navbar';
import Footer from './components/Footer';
import { AuthProvider, useAuth } from './context/AuthContext';

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";
import './tailwind.css';
import './index.scss';

const Events = lazy(() => import('./screens/Events'));
const Team = lazy(() => import('./screens/Team'));
const Auth = lazy(() => import('./screens/Auth'));
const About = lazy(() => import('./screens/About'));
const Accommodation = lazy(() => import('./screens/Accommodation'));
const Sponsors = lazy(() => import('./screens/Sponsors'));
const Register = lazy(() => import('./screens/Register'));
const FaqPage = lazy(() => import('./screens/FaqPage'));
const Contact = lazy(() => import('./screens/Contact'));
const Dashboard = lazy(() => import('./screens/Dashboard'));
const Admin = lazy(() => import('./screens/Admin'));
const AdminLogin = lazy(() => import('./screens/AdminLogin'));
const Legal = lazy(() => import('./screens/Legal'));

const ADMIN_STAFF_ROLES = new Set(['super_admin', 'admin', 'coordinator']);

function RouteFallback() {
  return (
    <div
      role="status"
      className="d-flex align-items-center justify-content-center"
      style={{ minHeight: '60vh', backgroundColor: '#000000', color: '#ffffff' }}
    >
      <span>Loading...</span>
    </div>
  );
}

function AppLayout() {
  const location = useLocation();
  const { configured, loading, session, profile } = useAuth();
  const isAuthPage =
    location.pathname === '/signin' ||
    location.pathname === '/signup' ||
    location.pathname === '/admin-login';
  const isStaffPortal =
    location.pathname === '/admin' &&
    configured &&
    !loading &&
    Boolean(session && profile?.is_active && ADMIN_STAFF_ROLES.has(profile?.role));

  return (
    <>
      <a
        href="#main-content"
        className="skip-to-content"
        onClick={(e) => {
          e.preventDefault();
          const el = document.getElementById('main-content');
          el?.focus();
          el?.scrollIntoView();
        }}
      >
        Skip to main content
      </a>
      {!isAuthPage && !isStaffPortal && <NavigationBar />}
      <main id="main-content" tabIndex={-1}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/about" element={<About />} />
            <Route path="/events" element={<Events />} />
            <Route path="/accommodation" element={<Accommodation />} />
            <Route path="/sponsors" element={<Sponsors />} />
            <Route path="/team" element={<Team />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/policies" element={<Legal />} />
            <Route path="/register" element={<Register />} />
            <Route path="/signin" element={<Auth />} />
            <Route path="/signup" element={<Auth />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<App />} />
          </Routes>
        </Suspense>
      </main>
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
