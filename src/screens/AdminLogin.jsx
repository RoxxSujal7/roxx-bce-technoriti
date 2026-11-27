import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NeuralAccessLogin from '../components/ui/neural-access-login';
import { useAuth } from '../context/AuthContext';

const ALLOWED_ADMIN_ROLES = new Set(['super_admin', 'admin', 'coordinator']);

const AdminLogin = () => {
  const navigate = useNavigate();
  const {
    loading,
    session,
    profile,
    isPasswordRecovery,
    needsMfaChallenge,
  } = useAuth();

  const isActiveStaff = Boolean(
    session &&
    profile &&
    profile.is_active === true &&
    ALLOWED_ADMIN_ROLES.has(profile.role),
  );

  useEffect(() => {
    if (!loading && isActiveStaff && !needsMfaChallenge && !isPasswordRecovery) {
      navigate('/admin', { replace: true });
    }
  }, [loading, isActiveStaff, needsMfaChallenge, isPasswordRecovery, navigate]);

  return (
    <NeuralAccessLogin
      isActiveStaff={isActiveStaff}
      onMfaVerified={(mfaState) => {
        if (mfaState?.currentLevel === 'aal2' && isActiveStaff && !isPasswordRecovery) {
          navigate('/admin', { replace: true });
        }
      }}
      onPasswordUpdated={() => {
        if (isActiveStaff && !needsMfaChallenge) {
          navigate('/admin', { replace: true });
        }
      }}
    />
  );
};

export default AdminLogin;
