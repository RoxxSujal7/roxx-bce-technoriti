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

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";
import './tailwind.css';

function AppLayout() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/signin' || location.pathname === '/signup';

  return (
    <>
      {!isAuthPage && <NavigationBar />}
      <Routes>
        <Route exact path="/" element={<App />} />
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
      </Routes>
      {!isAuthPage && <Footer />}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <HashRouter>
      <AppLayout />
    </HashRouter>
  </React.StrictMode>
);

reportWebVitals();
