import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Badge, Modal } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import TitleJumbotron from '../components/Title_Jumbotron';
import { useAuth } from '../context/AuthContext';
import { callEdgeFunction, supabase, UPI_CONFIG } from '../lib/supabaseClient';
import './Register.scss';

const STATUS_BADGE = {
  PENDING_PAYMENT: 'warning',
  PENDING_VERIFICATION: 'info',
  VERIFIED: 'success',
  REJECTED: 'danger',
};

function sortPaymentsNewestFirst(payments) {
  if (!Array.isArray(payments)) return [];
  return [...payments].sort(
    (a, b) => new Date(b?.submitted_at || 0).getTime() - new Date(a?.submitted_at || 0).getTime(),
  );
}

const Dashboard = () => {
  const navigate = useNavigate();
  const {
    configured,
    loading: authLoading,
    session,
    profile,
    profileLoadError,
    mfaLoadError,
    refreshProfile,
    signOut,
  } = useAuth();

  const [registrations, setRegistrations] = useState([]);
  const [upiConfig, setUpiConfig] = useState({
    configured: false,
    vpa: '',
    payeeName: UPI_CONFIG.payeeName,
  });
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState('');

  // Editable Profile State (non-privileged fields only)
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    roll_number: '',
    phone: '',
    college: '',
    branch: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  // UTR Submission Modal State
  const [activeReg, setActiveReg] = useState(null);
  const [utrInput, setUtrInput] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [utrError, setUtrError] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');

  const mountedRef = useRef(true);
  const loadSeqRef = useRef(0);
  const userId = session?.user?.id || '';

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!authLoading && configured && !userId) {
      navigate('/signin?redirect=/dashboard', { replace: true });
    }
  }, [authLoading, configured, userId, navigate]);

  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        roll_number: profile.roll_number || '',
        phone: profile.phone || '',
        college: profile.college || '',
        branch: profile.branch || '',
      });
    }
  }, [profile]);

  const loadDashboard = useCallback(async () => {
    if (!configured || !userId) return;
    const seq = ++loadSeqRef.current;
    setLoadingData(true);
    setDataError('');
    try {
      const res = await callEdgeFunction('get-my-registrations', { method: 'GET' });
      if (!mountedRef.current || seq !== loadSeqRef.current) return;
      setRegistrations(Array.isArray(res.registrations) ? res.registrations : []);
      setUpiConfig({
        configured: Boolean(res.upi_config?.configured && res.upi_config?.vpa),
        vpa: res.upi_config?.vpa || '',
        payeeName: res.upi_config?.payee_name || UPI_CONFIG.payeeName,
      });
    } catch (err) {
      if (!mountedRef.current || seq !== loadSeqRef.current) return;
      setDataError(err.message || 'Unable to load dashboard.');
    } finally {
      if (mountedRef.current && seq === loadSeqRef.current) {
        setLoadingData(false);
      }
    }
  }, [configured, userId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Generate local offline QR when active registration modal opens and VPA is configured
  useEffect(() => {
    if (!activeReg || !upiConfig.configured || !upiConfig.vpa) {
      setQrDataUrl('');
      return;
    }
    let mounted = true;
    const upiStr = `upi://pay?pa=${encodeURIComponent(upiConfig.vpa)}&pn=${encodeURIComponent(upiConfig.payeeName)}&am=${Number(activeReg.computed_total_inr)}&cu=INR&tn=${encodeURIComponent(activeReg.pass_code)}`;
    QRCode.toDataURL(upiStr, { width: 200, margin: 2 })
      .then((url) => {
        if (mounted) setQrDataUrl(url);
      })
      .catch(() => {
        if (mounted) setQrDataUrl('');
      });
    return () => {
      mounted = false;
    };
  }, [activeReg, upiConfig]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!supabase || !userId) return;
    const cleanPhone = profileForm.phone.replace(/\D/g, '').slice(0, 10);
    if (cleanPhone && cleanPhone.length !== 10) {
      setProfileError('Phone number must be exactly 10 digits.');
      setProfileMsg('');
      return;
    }
    setSavingProfile(true);
    setProfileMsg('');
    setProfileError('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name.trim(),
          roll_number: profileForm.roll_number.trim(),
          phone: cleanPhone,
          college: profileForm.college.trim(),
          branch: profileForm.branch.trim(),
        })
        .eq('id', userId);
      if (error) {
        setProfileError(error.message || 'Unable to save profile.');
        return;
      }
      const updated = await refreshProfile();
      if (mountedRef.current) {
        if (updated) {
          setProfileMsg('Profile saved.');
        } else {
          setProfileError('Profile saved, but could not refresh the latest server view. Reload to verify.');
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        setProfileError(err?.message || 'Unable to update profile right now.');
      }
    } finally {
      if (mountedRef.current) {
        setSavingProfile(false);
      }
    }
  };

  const handleSubmitUtr = async (e) => {
    e.preventDefault();
    setUtrError('');
    if (!activeReg?.id) {
      setUtrError('No active registration selected.');
      return;
    }
    const clean = utrInput.trim();
    if (!/^\d{12}$/.test(clean)) {
      setUtrError('UTR must be exactly 12 numeric digits.');
      return;
    }
    setSubmittingUtr(true);
    try {
      await callEdgeFunction('submit-utr', {
        method: 'POST',
        body: { registration_id: activeReg.id, utr_number: clean },
      });
      if (!mountedRef.current) return;
      setActiveReg(null);
      setUtrInput('');
      await loadDashboard();
    } catch (err) {
      if (mountedRef.current) {
        setUtrError(err.message || 'UTR submission failed.');
      }
    } finally {
      if (mountedRef.current) {
        setSubmittingUtr(false);
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

  const isStaff = profile?.role && ['super_admin', 'admin', 'coordinator'].includes(profile.role);

  return (
    <div className="register-page-wrapper">
      <TitleJumbotron
        bigHeader="DELEGATE"
        bigHeaderCaps="DASHBOARD"
        subtitle="OFFICIAL PASSES, PAYMENT RECONCILIATION & PROFILE • TECHNORITI '26"
      />

      <Container className="py-5">
        {!configured ? (
          <Card className="registration-card p-4 rounded-4 text-center">
            <h4 className="text-white">Backend Not Configured</h4>
            <p className="text-white-50 small mb-0">
              Configure <code>REACT_APP_SUPABASE_URL</code> and <code>REACT_APP_SUPABASE_ANON_KEY</code> in your environment.
            </p>
          </Card>
        ) : (
          <Row className="gy-4">
            {/* Profile Column */}
            <Col lg={4}>
              <Card className="registration-card p-4 rounded-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="text-white fw-bold mb-0">Account Profile</h5>
                  <Badge bg="secondary" className="text-uppercase">
                    {profile?.role || 'participant'}
                  </Badge>
                </div>
                <p className="text-white-50 small mb-3">{profile?.email || session?.user?.email}</p>

                {profileLoadError && (
                  <div role="alert" className="alert alert-danger py-2 px-3 small">
                    Unable to load your profile record from the server. Some fields may be out of sync.
                  </div>
                )}
                {mfaLoadError && (
                  <div role="alert" className="alert alert-warning text-dark py-2 px-3 small">
                    Multi-factor status could not be verified. Sign out and back in if staff actions are restricted.
                  </div>
                )}
                {profileError && <div role="alert" className="alert alert-danger py-2 px-3 small">{profileError}</div>}
                {profileMsg && <div role="status" className="alert alert-info text-dark py-2 px-3 small">{profileMsg}</div>}

                <Form onSubmit={handleSaveProfile}>
                  <Form.Group controlId="dash-full-name" className="mb-2">
                    <Form.Label className="text-white-50 small">Full Name</Form.Label>
                    <Form.Control
                      className="dark-input"
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm((p) => ({ ...p, full_name: e.target.value }))}
                    />
                  </Form.Group>
                  <Form.Group controlId="dash-roll-number" className="mb-2">
                    <Form.Label className="text-white-50 small">Roll Number</Form.Label>
                    <Form.Control
                      className="dark-input"
                      value={profileForm.roll_number}
                      onChange={(e) => setProfileForm((p) => ({ ...p, roll_number: e.target.value }))}
                    />
                  </Form.Group>
                  <Form.Group controlId="dash-phone" className="mb-2">
                    <Form.Label className="text-white-50 small">Phone (10 digits)</Form.Label>
                    <Form.Control
                      className="dark-input"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    />
                  </Form.Group>
                  <Form.Group controlId="dash-college" className="mb-2">
                    <Form.Label className="text-white-50 small">College</Form.Label>
                    <Form.Control
                      className="dark-input"
                      value={profileForm.college}
                      onChange={(e) => setProfileForm((p) => ({ ...p, college: e.target.value }))}
                    />
                  </Form.Group>
                  <Form.Group controlId="dash-branch" className="mb-3">
                    <Form.Label className="text-white-50 small">Branch</Form.Label>
                    <Form.Control
                      className="dark-input"
                      value={profileForm.branch}
                      onChange={(e) => setProfileForm((p) => ({ ...p, branch: e.target.value }))}
                    />
                  </Form.Group>
                  <div className="d-grid gap-2">
                    <Button type="submit" variant="purple" disabled={savingProfile}>
                      {savingProfile ? 'Saving...' : 'Update Profile'}
                    </Button>
                    {isStaff && (
                      <Link to="/admin" className="btn btn-outline-light btn-sm">
                        Open Staff / Admin Desk →
                      </Link>
                    )}
                    <Button type="button" variant="outline-secondary" size="sm" onClick={handleSignOut}>
                      Sign Out
                    </Button>
                  </div>
                </Form>
              </Card>
            </Col>

            {/* Registrations Column */}
            <Col lg={8}>
              <Card className="registration-card p-4 rounded-4">
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                  <div>
                    <h4 className="text-white fw-bold mb-1">My Registrations & Passes</h4>
                    <p className="text-white-50 small mb-0">
                      Authoritative status from institutional verification ledger
                    </p>
                  </div>
                  <Link to="/register" className="btn btn-purple btn-sm px-3">
                    ＋ New Registration
                  </Link>
                </div>

                {dataError && <div className="alert alert-danger small">{dataError}</div>}

                {loadingData ? (
                  <p className="text-white-50 small">Loading your registrations...</p>
                ) : registrations.length === 0 ? (
                  <div className="text-center py-5 border border-secondary rounded-3">
                    <p className="text-white-50 mb-3">You have not registered for any arenas yet.</p>
                    <Link to="/register" className="btn btn-purple btn-sm px-4">
                      Register Now
                    </Link>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {registrations.map((reg) => {
                      const payments = sortPaymentsNewestFirst(reg.payments);
                      const latestPay = payments[0] || null;
                      const canSubmitUtr = reg.status === 'PENDING_PAYMENT' || reg.status === 'REJECTED';

                      return (
                        <div key={reg.id} className="p-3 rounded-3 border border-secondary" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
                          <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                            <div>
                              <span className="badge bg-purple-glow me-2">{reg.pass_code}</span>
                              <span className="text-white fw-bold">
                                {reg.primary_competition?.title || reg.primary_arena_id}
                              </span>
                            </div>
                            <Badge
                              bg={STATUS_BADGE[reg.status] || 'secondary'}
                              className={reg.status === 'PENDING_PAYMENT' || reg.status === 'PENDING_VERIFICATION' ? 'text-dark fw-semibold' : ''}
                            >
                              {(reg.status || 'UNKNOWN').replace(/_/g, ' ')}
                            </Badge>
                          </div>

                          <div className="row g-2 small text-white-50 mb-2">
                            <div className="col-sm-4">Team Size: <strong className="text-white">{reg.team_size}</strong></div>
                            <div className="col-sm-4">Stay: <strong className="text-white text-capitalize">{reg.accommodation_id}</strong></div>
                            <div className="col-sm-4">Total: <strong className="text-purple">₹{reg.computed_total_inr}</strong></div>
                          </div>

                          {latestPay && (
                            <div className="small text-white-50 border-top border-secondary pt-2 mt-2">
                              Latest UTR: <code className="text-white">{latestPay.utr_number}</code> • {latestPay.status}
                              {latestPay.rejection_reason && (
                                <div className="text-danger mt-1">
                                  Rejection Reason: {latestPay.rejection_reason}
                                </div>
                              )}
                            </div>
                          )}

                          {reg.status === 'VERIFIED' && (
                            <div className="alert alert-success py-2 px-3 small mt-3 mb-0 d-flex justify-content-between align-items-center">
                              <span>Official Entry Pass Confirmed — Present Pass Code <strong>{reg.pass_code}</strong> & College ID at Main Gate.</span>
                              <Button size="sm" variant="outline-success" onClick={() => window.print()}>
                                Print Pass
                              </Button>
                            </div>
                          )}

                          {canSubmitUtr && (
                            <div className="mt-3">
                              <Button
                                size="sm"
                                variant="purple"
                                onClick={() => {
                                  setUtrError('');
                                  setUtrInput('');
                                  setActiveReg(reg);
                                }}
                              >
                                {reg.status === 'REJECTED' ? 'Retry with New UTR' : 'Pay via UPI / Submit UTR'}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        )}
      </Container>

      {/* Inline UTR Payment / Retry Modal */}
      <Modal show={Boolean(activeReg)} onHide={() => setActiveReg(null)} centered className="technoriti-payment-modal">
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title className="text-white fs-5 fw-bold">
            Submit UPI UTR • {activeReg?.pass_code}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 text-white">
          {utrError && <div role="alert" className="alert alert-danger small">{utrError}</div>}
          {!upiConfig.configured && (
            <div role="alert" className="alert alert-warning text-dark small mb-3">
              Official institutional UPI VPA is not yet configured on the server. Do not transfer funds until the verified treasury VPA is published.
            </div>
          )}
          <div className="text-center mb-3">
            {qrDataUrl && (
              <div className="p-2 bg-white rounded-3 d-inline-block mb-2">
                <img src={qrDataUrl} alt="UPI Payment QR Code" width="170" height="170" />
              </div>
            )}
            <div className="small text-white-75">
              VPA:{' '}
              {upiConfig.configured ? (
                <code className="text-purple">{upiConfig.vpa}</code>
              ) : (
                <strong className="text-warning">Pending Institutional Configuration</strong>
              )}{' '}
              • Payable: <strong>₹{activeReg?.computed_total_inr}</strong>
            </div>
          </div>
          <Form onSubmit={handleSubmitUtr}>
            <Form.Group controlId="dash-utr-number" className="mb-3">
              <Form.Label className="small text-white">12-Digit Numeric UTR *</Form.Label>
              <Form.Control
                className="dark-input"
                disabled={!upiConfig.configured}
                value={utrInput}
                onChange={(e) => setUtrInput(e.target.value.replace(/\D/g, '').slice(0, 12))}
                maxLength={12}
                pattern="\d{12}"
                required
                placeholder="e.g. 432109876543"
              />
            </Form.Group>
            <Button type="submit" variant="purple" className="w-100" disabled={submittingUtr || !upiConfig.configured}>
              {submittingUtr ? 'Submitting...' : 'Submit UTR for Verification'}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Dashboard;
