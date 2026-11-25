import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Container, Card, Form, Button, Badge, Table, Modal, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import Title_Jumbotron from '../components/Title_Jumbotron';
import App1 from '../components/ui/app-1';
import {
  buildAdminUserProfile,
  getCompetitionOverview,
  getDashboardStats,
  getFinancialMetrics,
  getRecentAdminActivity,
  getRegistrationTrends,
} from '../components/ui/app-1-utils/app-1-data';
import { useAuth } from '../context/AuthContext';
import { callEdgeFunction } from '../lib/supabaseClient';
import { competitionsList } from '../content/events';
import './Register.scss';

const ALLOWED_STAFF_ROLES = new Set(['super_admin', 'admin', 'coordinator']);

function sortPaymentsNewestFirst(payments) {
  if (!Array.isArray(payments)) return [];
  return [...payments].sort(
    (a, b) => new Date(b?.submitted_at || 0).getTime() - new Date(a?.submitted_at || 0).getTime(),
  );
}

const Admin = () => {
  const navigate = useNavigate();
  const { configured, loading: authLoading, session, profile, signOut } = useAuth();
  const role = profile?.role;
  const isActiveStaff = Boolean(profile?.is_active && ALLOWED_STAFF_ROLES.has(role));
  const userId = session?.user?.id || '';

  const [activeSection, setActiveSection] = useState('overview');

  // Coordinator view state
  const [coordData, setCoordData] = useState({ assigned_competitions: [], registrations: [], pagination: { page: 1, total_pages: 1, total: 0 } });
  const [coordAnalytics, setCoordAnalytics] = useState(null);
  const [assignedCompetitions, setAssignedCompetitions] = useState([]);
  const [coordCompFilter, setCoordCompFilter] = useState('');
  const [coordPage, setCoordPage] = useState(1);

  // Admin registrations state
  const [adminRegs, setAdminRegs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 1 });
  const [summary, setSummary] = useState({});
  const [adminAnalytics, setAdminAnalytics] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({ status: '', competition_id: '', q: '', page: 1 });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Detail & Payment verification modal
  const [selectedReg, setSelectedReg] = useState(null);
  const [confirmedAmount, setConfirmedAmount] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Super Admin management state
  const [staffData, setStaffData] = useState({ staff: [], assignments: [] });
  const [roleForm, setRoleForm] = useState({ email: '', role: 'admin' });
  const [assignForm, setAssignForm] = useState({ coordinator_id: '', competition_id: competitionsList[0]?.id || 'robowar' });
  const [staffMsg, setStaffMsg] = useState('');
  const [staffError, setStaffError] = useState('');

  // Catalog tariffs state
  const [catalog, setCatalog] = useState({ competitions: [], accommodation_plans: [] });
  const [tariffMsg, setTariffMsg] = useState('');
  const [tariffError, setTariffError] = useState('');

  // Shared concurrency & lifecycle guards
  const [busyAction, setBusyAction] = useState('');
  const mountedRef = useRef(true);
  const adminSeqRef = useRef(0);
  const coordSeqRef = useRef(0);
  const csvUrlTimeoutRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (csvUrlTimeoutRef.current) clearTimeout(csvUrlTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!authLoading && configured && !userId) {
      navigate('/signin?redirect=/admin', { replace: true });
    }
  }, [authLoading, configured, userId, navigate]);

  // Debounce search query so rapid keystrokes do not fire excessive queries
  useEffect(() => {
    const trimmed = searchInput.trim();
    const timer = setTimeout(() => {
      setFilters((f) => (f.q === trimmed ? f : { ...f, q: trimmed, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadAdminRegs = useCallback(async () => {
    if (!configured || !userId || !isActiveStaff || !['admin', 'super_admin'].includes(role)) return;
    const seq = ++adminSeqRef.current;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await callEdgeFunction('get-admin-registrations', {
        method: 'GET',
        query: {
          page: filters.page,
          limit: 20,
          status: filters.status,
          competition_id: filters.competition_id,
          q: filters.q,
        },
      });
      if (!mountedRef.current || seq !== adminSeqRef.current) return;
      setAdminRegs(res.registrations || []);
      setPagination(res.pagination || { page: 1, limit: 20, total: 0, total_pages: 1 });
      setSummary(res.summary || {});
      setAdminAnalytics(res.analytics || null);
      setAuditLogs(res.audit_logs || []);
    } catch (err) {
      if (!mountedRef.current || seq !== adminSeqRef.current) return;
      setErrorMsg(err.message || 'Unable to fetch registrations.');
    } finally {
      if (mountedRef.current && seq === adminSeqRef.current) {
        setLoading(false);
      }
    }
  }, [configured, userId, isActiveStaff, role, filters]);

  const loadCoordinatorRegs = useCallback(async () => {
    if (!configured || !userId || !isActiveStaff || role !== 'coordinator') return;
    const seq = ++coordSeqRef.current;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await callEdgeFunction('get-coordinator-registrations', {
        method: 'GET',
        query: { page: coordPage, limit: 20, competition_id: coordCompFilter },
      });
      if (!mountedRef.current || seq !== coordSeqRef.current) return;
      setCoordData(res);
      setCoordAnalytics(res.analytics || null);
      if (Array.isArray(res.assigned_competitions) && res.assigned_competitions.length > 0 && !coordCompFilter) {
        setAssignedCompetitions(res.assigned_competitions);
      } else if (Array.isArray(res.assigned_competitions) && assignedCompetitions.length === 0) {
        setAssignedCompetitions(res.assigned_competitions);
      }
    } catch (err) {
      if (!mountedRef.current || seq !== coordSeqRef.current) return;
      setErrorMsg(err.message || 'Unable to fetch assigned coordinator registrations.');
    } finally {
      if (mountedRef.current && seq === coordSeqRef.current) {
        setLoading(false);
      }
    }
  }, [configured, userId, isActiveStaff, role, coordPage, coordCompFilter, assignedCompetitions.length]);

  const loadStaff = useCallback(async () => {
    if (!configured || !userId || !isActiveStaff || role !== 'super_admin') return;
    setStaffError('');
    try {
      const res = await callEdgeFunction('manage-admins', { method: 'GET' });
      if (!mountedRef.current) return;
      setStaffData({ staff: res.staff || [], assignments: res.assignments || [] });
    } catch (err) {
      if (mountedRef.current) {
        setStaffError(err.message || 'Unable to load staff directory.');
      }
    }
  }, [configured, userId, isActiveStaff, role]);

  const loadCatalog = useCallback(async () => {
    if (!configured || !userId || !isActiveStaff || !['admin', 'super_admin'].includes(role)) return;
    setTariffError('');
    try {
      const res = await callEdgeFunction('manage-competitions', { method: 'GET' });
      if (!mountedRef.current) return;
      setCatalog({ competitions: res.competitions || [], accommodation_plans: res.accommodation_plans || [] });
    } catch (err) {
      if (mountedRef.current) {
        setTariffError(err.message || 'Unable to load competition tariffs.');
      }
    }
  }, [configured, userId, isActiveStaff, role]);

  useEffect(() => {
    if (!isActiveStaff) return;
    if (role === 'coordinator') {
      loadCoordinatorRegs();
    } else if (role === 'admin' || role === 'super_admin') {
      loadAdminRegs();
    }
  }, [isActiveStaff, role, loadAdminRegs, loadCoordinatorRegs]);

  useEffect(() => {
    if (!isActiveStaff) return;
    if (role === 'admin' || role === 'super_admin') {
      loadCatalog();
      if (role === 'super_admin') {
        loadStaff();
      }
    }
  }, [isActiveStaff, role, loadCatalog, loadStaff]);

  const handleExportCsv = async () => {
    try {
      const csvText = await callEdgeFunction('get-admin-registrations', {
        method: 'GET',
        query: {
          format: 'csv',
          status: filters.status,
          competition_id: filters.competition_id,
          q: searchInput.trim(),
        },
        isCsv: true,
      });
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `technoriti26-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (csvUrlTimeoutRef.current) clearTimeout(csvUrlTimeoutRef.current);
      csvUrlTimeoutRef.current = setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setErrorMsg(err.message || 'CSV export failed.');
    }
  };

  const handleVerifyDecision = async (decision) => {
    setVerifyError('');
    const payments = sortPaymentsNewestFirst(selectedReg?.payments);
    const pendingPayment = payments.find((p) => p.status === 'PENDING_VERIFICATION');
    if (!pendingPayment) {
      setVerifyError('No pending payment submission found on this registration.');
      return;
    }

    const body = { payment_id: pendingPayment.id, decision };
    if (decision === 'VERIFIED') {
      const rawAmt = String(confirmedAmount).trim();
      const amt = /^\d+$/.test(rawAmt) ? Number(rawAmt) : NaN;
      if (!Number.isInteger(amt) || amt <= 0) {
        setVerifyError('Enter the exact whole INR amount verified on your institutional bank/UPI statement.');
        return;
      }
      body.confirmed_amount_inr = amt;
    } else {
      if (rejectionReason.trim().length < 5) {
        setVerifyError('Please enter a clear rejection reason (minimum 5 characters).');
        return;
      }
      body.rejection_reason = rejectionReason.trim();
    }

    setVerifying(true);
    try {
      await callEdgeFunction('verify-payment', { method: 'POST', body });
      if (!mountedRef.current) return;
      setSelectedReg(null);
      setConfirmedAmount('');
      setRejectionReason('');
      await loadAdminRegs();
    } catch (err) {
      if (mountedRef.current) {
        setVerifyError(err.message || 'Verification action failed.');
      }
    } finally {
      if (mountedRef.current) {
        setVerifying(false);
      }
    }
  };

  const handleRoleUpdate = async (e) => {
    e.preventDefault();
    setStaffMsg('');
    setStaffError('');
    setBusyAction('role_update');
    try {
      await callEdgeFunction('manage-admins', {
        method: 'POST',
        body: { action: 'set_role', target_email: roleForm.email.trim().toLowerCase(), role: roleForm.role },
      });
      if (!mountedRef.current) return;
      setRoleForm({ email: '', role: 'admin' });
      setStaffMsg('Staff role updated successfully.');
      await loadStaff();
      await loadAdminRegs();
    } catch (err) {
      if (mountedRef.current) setStaffError(err.message || 'Role update failed.');
    } finally {
      if (mountedRef.current) setBusyAction('');
    }
  };

  const handleToggleActive = async (targetUser) => {
    setStaffMsg('');
    setStaffError('');
    setBusyAction(`toggle_user_${targetUser.id}`);
    try {
      await callEdgeFunction('manage-admins', {
        method: 'POST',
        body: { action: 'set_active', target_user_id: targetUser.id, is_active: !targetUser.is_active },
      });
      await loadStaff();
    } catch (err) {
      if (mountedRef.current) setStaffError(err.message || 'Unable to update staff account status.');
    } finally {
      if (mountedRef.current) setBusyAction('');
    }
  };

  const handleAssignCoordinator = async (e) => {
    e.preventDefault();
    setStaffMsg('');
    setStaffError('');
    setBusyAction('assign_coord');
    try {
      await callEdgeFunction('manage-admins', {
        method: 'POST',
        body: { action: 'assign_coordinator', coordinator_id: assignForm.coordinator_id, competition_id: assignForm.competition_id },
      });
      if (!mountedRef.current) return;
      setStaffMsg('Coordinator assigned.');
      await loadStaff();
    } catch (err) {
      if (mountedRef.current) setStaffError(err.message || 'Coordinator assignment failed.');
    } finally {
      if (mountedRef.current) setBusyAction('');
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    setStaffMsg('');
    setStaffError('');
    setBusyAction(`remove_assign_${assignmentId}`);
    try {
      await callEdgeFunction('manage-admins', {
        method: 'POST',
        body: { action: 'remove_coordinator', assignment_id: assignmentId },
      });
      await loadStaff();
    } catch (err) {
      if (mountedRef.current) setStaffError(err.message || 'Unable to remove assignment.');
    } finally {
      if (mountedRef.current) setBusyAction('');
    }
  };

  const handleToggleCompetition = async (comp) => {
    setTariffMsg('');
    setTariffError('');
    setBusyAction(`toggle_comp_${comp.id}`);
    try {
      await callEdgeFunction('manage-competitions', {
        method: 'PATCH',
        body: { id: comp.id, is_active: !comp.is_active },
      });
      if (!mountedRef.current) return;
      setTariffMsg(`Updated ${comp.title}.`);
      await loadCatalog();
    } catch (err) {
      if (mountedRef.current) setTariffError(err.message || 'Unable to update competition status.');
    } finally {
      if (mountedRef.current) setBusyAction('');
    }
  };

  const handleSelectSection = useCallback(
    (nextSection) => {
      if (role === 'coordinator' && !['overview', 'registrations'].includes(nextSection)) {
        return;
      }
      if (role !== 'super_admin' && nextSection === 'staff') {
        return;
      }
      setActiveSection(nextSection);
      if (nextSection === 'pending-verification') {
        setFilters((f) => ({ ...f, status: 'PENDING_VERIFICATION', page: 1 }));
      } else if (nextSection === 'registrations' && filters.status === 'PENDING_VERIFICATION') {
        setFilters((f) => ({ ...f, status: '', page: 1 }));
      }
    },
    [role, filters.status],
  );

  const handleHeaderSearchSubmit = useCallback((nextQuery) => {
    setSearchInput(nextQuery);
    setFilters((f) => ({ ...f, q: nextQuery, page: 1 }));
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate('/signin', { replace: true });
  }, [signOut, navigate]);

  const userDisplay = useMemo(
    () => buildAdminUserProfile(profile, session),
    [profile, session],
  );

  const activeAnalytics = role === 'coordinator' ? coordAnalytics : adminAnalytics;

  const dashboardStats = useMemo(
    () =>
      isActiveStaff
        ? getDashboardStats({
            role,
            analytics: activeAnalytics,
            summary,
            coordData,
          })
        : [],
    [isActiveStaff, role, activeAnalytics, summary, coordData],
  );

  const financialMetrics = useMemo(
    () =>
      isActiveStaff
        ? getFinancialMetrics({
            role,
            analytics: adminAnalytics,
            summary,
          })
        : null,
    [isActiveStaff, role, adminAnalytics, summary],
  );

  const trendData = useMemo(
    () =>
      isActiveStaff
        ? getRegistrationTrends({
            role,
            analytics: activeAnalytics,
          })
        : { timezone: 'Asia/Kolkata', series: [], hasRecords: false },
    [isActiveStaff, role, activeAnalytics],
  );

  const competitionsOverview = useMemo(
    () =>
      isActiveStaff
        ? getCompetitionOverview({
            role,
            analytics: activeAnalytics,
            catalogCompetitions: catalog.competitions,
            assignedCompetitions,
          })
        : [],
    [isActiveStaff, role, activeAnalytics, catalog.competitions, assignedCompetitions],
  );

  const recentActivity = useMemo(
    () =>
      isActiveStaff
        ? getRecentAdminActivity({
            role,
            auditLogs,
          })
        : [],
    [isActiveStaff, role, auditLogs],
  );

  const pendingVerificationsCount = Number(
    adminAnalytics?.kpis?.pending_verifications_count ?? summary?.pending_verification ?? 0,
  );

  if (!configured) {
    return (
      <div className="register-page-wrapper">
        <Title_Jumbotron bigHeader="BACKEND" bigHeaderCaps="UNCONFIGURED" subtitle="STAFF & ACCOUNTS DESK PORTAL" />
        <Container className="py-5">
          <Card className="registration-card p-5 text-center rounded-4">
            <h4 className="text-white">Backend Not Configured</h4>
            <p className="text-white-50 small mb-0">
              Configure <code>REACT_APP_SUPABASE_URL</code> and <code>REACT_APP_SUPABASE_ANON_KEY</code> to access the staff portal.
            </p>
          </Card>
        </Container>
      </div>
    );
  }

  if (authLoading || !session || (session && !profile)) {
    return (
      <div className="register-page-wrapper">
        <Title_Jumbotron bigHeader="STAFF" bigHeaderCaps="PORTAL" subtitle="VERIFYING ADMINISTRATIVE SESSION" />
        <Container className="py-5">
          <Card className="registration-card p-5 text-center rounded-4">
            <h4 className="text-white">Verifying Access...</h4>
            <p className="text-white-50 small mb-0">Checking authenticated session and administrative privileges.</p>
          </Card>
        </Container>
      </div>
    );
  }

  if (!isActiveStaff) {
    return (
      <div className="register-page-wrapper">
        <Title_Jumbotron bigHeader="RESTRICTED" bigHeaderCaps="ACCESS" subtitle="STAFF & ACCOUNTS DESK PORTAL" />
        <Container className="py-5">
          <Card className="registration-card p-5 text-center rounded-4">
            <h4 className="text-white">Administrator Access Required</h4>
            <p className="text-white-50 small mb-0">
              {profile?.is_active === false
                ? 'Your staff account has been deactivated. Contact the Super Admin.'
                : <>Your account role (<code>{role || 'unknown'}</code>) is not authorized for administrative operations.</>}
            </p>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div className="technoriti-admin-shell">
      <App1
        role={role}
        userDisplay={userDisplay}
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        stats={dashboardStats}
        financialMetrics={financialMetrics}
        trends={trendData}
        competitionsOverview={competitionsOverview}
        recentActivity={recentActivity}
        pendingVerificationsCount={pendingVerificationsCount}
        loading={loading}
        errorMsg={errorMsg}
        searchQuery={role === 'coordinator' ? '' : searchInput}
        onSearchSubmit={role === 'coordinator' ? undefined : handleHeaderSearchSubmit}
        onSignOut={handleSignOut}
      >
        {role === 'coordinator' ? (
          <Card className="registration-card p-4 rounded-4">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <div>
                <h4 className="text-white fw-bold mb-1">Coordinator Arena Roster</h4>
                <p className="text-white-50 small mb-0">
                  Restricted strictly to competitions assigned by Super Admin.
                </p>
              </div>
              <Form.Select
                aria-label="Filter by assigned competition"
                className="dark-input w-auto"
                value={coordCompFilter}
                onChange={(e) => {
                  setCoordCompFilter(e.target.value);
                  setCoordPage(1);
                }}
              >
                <option value="">All Assigned Competitions</option>
                {(assignedCompetitions.length > 0 ? assignedCompetitions : (coordData.assigned_competitions || [])).map((cid) => (
                  <option key={cid} value={cid}>{cid}</option>
                ))}
              </Form.Select>
            </div>

            {loading ? (
              <p className="text-white-50 small">Loading roster...</p>
            ) : (
              <>
                <Table responsive variant="dark" hover className="small align-middle">
                  <thead>
                    <tr>
                      <th>Pass Code</th>
                      <th>Delegate</th>
                      <th>College</th>
                      <th>Phone</th>
                      <th>Primary Arena</th>
                      <th>Team</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(coordData.registrations || []).map((r) => (
                      <tr key={r.id}>
                        <td><code>{r.pass_code}</code></td>
                        <td>{r.full_name}</td>
                        <td>{r.college}</td>
                        <td>{r.phone}</td>
                        <td>{r.primary_competition?.title || r.primary_arena_id}</td>
                        <td>{r.team_size}</td>
                        <td><Badge bg={r.status === 'VERIFIED' ? 'success' : 'secondary'}>{r.status}</Badge></td>
                      </tr>
                    ))}
                    {coordData.registrations?.length === 0 && (
                      <tr><td colSpan={7} className="text-center text-white-50 py-4">No registrations found for your assigned competitions.</td></tr>
                    )}
                  </tbody>
                </Table>

                <div className="d-flex justify-content-between align-items-center mt-3 small text-white-50">
                  <span>
                    Page {coordData.pagination?.page || coordPage} of {coordData.pagination?.total_pages || 1} ({coordData.pagination?.total ?? 0} total)
                  </span>
                  <div className="d-flex gap-2">
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      disabled={(coordData.pagination?.page || coordPage) <= 1}
                      onClick={() => setCoordPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      disabled={(coordData.pagination?.page || coordPage) >= (coordData.pagination?.total_pages || 1)}
                      onClick={() => setCoordPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        ) : (
          <>
            {(activeSection === 'overview' ||
              activeSection === 'registrations' ||
              activeSection === 'pending-verification') && (
              <Card className="registration-card p-4 rounded-4">
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <div>
                    <h4 className="text-white fw-bold mb-1">
                      {activeSection === 'pending-verification'
                        ? 'Payment UTR Verification Queue'
                        : 'Registrations & UTR Verification'}
                    </h4>
                    <p className="text-white-50 small mb-0">
                      Filter delegates, export sanitized CSV rosters, and reconcile 12-digit UTR submissions against bank statements.
                    </p>
                  </div>
                </div>

                <Row className="g-2 mb-3">
                  <Col md={3}>
                    <Form.Select
                      aria-label="Filter by registration status"
                      className="dark-input"
                      value={filters.status}
                      onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
                    >
                      <option value="">All Statuses</option>
                      <option value="PENDING_VERIFICATION">Pending Verification</option>
                      <option value="PENDING_PAYMENT">Pending Payment</option>
                      <option value="VERIFIED">Verified</option>
                      <option value="REJECTED">Rejected</option>
                    </Form.Select>
                  </Col>
                  <Col md={3}>
                    <Form.Select
                      aria-label="Filter by competition"
                      className="dark-input"
                      value={filters.competition_id}
                      onChange={(e) => setFilters((f) => ({ ...f, competition_id: e.target.value, page: 1 }))}
                    >
                      <option value="">All Competitions</option>
                      {competitionsList.map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col md={4}>
                    <Form.Control
                      aria-label="Search registrations"
                      className="dark-input"
                      placeholder="Search name, pass code, phone, college..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                  </Col>
                  <Col md={2} className="d-grid">
                    <Button variant="outline-light" size="sm" onClick={handleExportCsv}>
                      Export CSV
                    </Button>
                  </Col>
                </Row>

                {loading ? (
                  <p className="text-white-50 small">Loading registrations...</p>
                ) : (
                  <>
                    <Table responsive variant="dark" hover className="small align-middle">
                      <thead>
                        <tr>
                          <th>Pass Code</th>
                          <th>Delegate</th>
                          <th>Arena</th>
                          <th>Total</th>
                          <th>UTR</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminRegs.map((reg) => {
                          const payments = sortPaymentsNewestFirst(reg.payments);
                          const latestPay = payments[0] || null;
                          return (
                            <tr key={reg.id}>
                              <td><code>{reg.pass_code}</code></td>
                              <td>
                                <div className="fw-bold">{reg.full_name}</div>
                                <div className="text-white-50">{reg.phone} • {reg.college}</div>
                              </td>
                              <td>{reg.primary_competition?.title || reg.primary_arena_id}</td>
                              <td className="text-purple fw-bold">₹{reg.computed_total_inr}</td>
                              <td><code>{latestPay?.utr_number || '—'}</code></td>
                              <td><Badge bg={reg.status === 'VERIFIED' ? 'success' : reg.status === 'PENDING_VERIFICATION' ? 'info' : reg.status === 'REJECTED' ? 'danger' : 'warning'}>{reg.status}</Badge></td>
                              <td>
                                <Button
                                  size="sm"
                                  variant="purple"
                                  onClick={() => {
                                    setVerifyError('');
                                    setConfirmedAmount(String(reg.computed_total_inr));
                                    setRejectionReason('');
                                    setSelectedReg({ ...reg, payments });
                                  }}
                                >
                                  Inspect
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                        {adminRegs.length === 0 && (
                          <tr><td colSpan={7} className="text-center text-white-50 py-4">No matching registrations.</td></tr>
                        )}
                      </tbody>
                    </Table>

                    <div className="d-flex justify-content-between align-items-center mt-3 small text-white-50">
                      <span>Page {pagination.page} of {pagination.total_pages} ({pagination.total} total)</span>
                      <div className="d-flex gap-2">
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          disabled={pagination.page <= 1}
                          onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                        >
                          Prev
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          disabled={pagination.page >= pagination.total_pages}
                          onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </Card>
            )}

            {activeSection === 'competitions' && (
              <Card className="registration-card p-4 rounded-4">
                <h4 className="text-white fw-bold mb-1">Competitions &amp; Tariffs</h4>
                <p className="text-white-50 small mb-3">
                  Control live registration availability for TECHNORITI &apos;26 arenas and inspect institutional accommodation plans.
                </p>
                {tariffError && <div role="alert" className="alert alert-danger small py-2">{tariffError}</div>}
                {tariffMsg && <div role="status" className="alert alert-info small py-2">{tariffMsg}</div>}
                <Table responsive variant="dark" hover className="small align-middle mb-4">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Title</th>
                      <th>Fee Type</th>
                      <th>Fee</th>
                      <th>Team Limits</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalog.competitions.map((c) => (
                      <tr key={c.id}>
                        <td>{c.num_id}</td>
                        <td>{c.title}</td>
                        <td>{c.fee_type}</td>
                        <td>₹{c.fee_inr}</td>
                        <td>{c.min_team_size}–{c.max_team_size}</td>
                        <td><Badge bg={c.is_active ? 'success' : 'secondary'}>{c.is_active ? 'Active' : 'Paused'}</Badge></td>
                        <td>
                          <Button
                            size="sm"
                            variant="outline-light"
                            disabled={busyAction === `toggle_comp_${c.id}`}
                            onClick={() => handleToggleCompetition(c)}
                          >
                            {busyAction === `toggle_comp_${c.id}` ? 'Updating...' : c.is_active ? 'Disable' : 'Enable'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>

                {catalog.accommodation_plans?.length > 0 && (
                  <>
                    <h6 className="text-white fw-bold mb-2">Accommodation Plans</h6>
                    <Table responsive variant="dark" hover className="small align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Plan ID</th>
                          <th>Name</th>
                          <th>Tariff / Person</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catalog.accommodation_plans.map((plan) => (
                          <tr key={plan.id}>
                            <td><code>{plan.id}</code></td>
                            <td>{plan.name}</td>
                            <td>₹{plan.price_per_person_inr}</td>
                            <td><Badge bg={plan.is_active ? 'success' : 'secondary'}>{plan.is_active ? 'Active' : 'Paused'}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </>
                )}
              </Card>
            )}

            {role === 'super_admin' && activeSection === 'staff' && (
              <Card className="registration-card p-4 rounded-4">
                <h4 className="text-white fw-bold mb-1">Admins &amp; Coordinators</h4>
                <p className="text-white-50 small mb-3">
                  Grant or revoke administrative roles and assign coordinators to specific TECHNORITI &apos;26 arenas.
                </p>
                {staffError && <div role="alert" className="alert alert-danger small py-2">{staffError}</div>}
                {staffMsg && <div role="status" className="alert alert-info small py-2">{staffMsg}</div>}
                <Row className="gy-4 mb-4">
                  <Col md={6}>
                    <Form onSubmit={handleRoleUpdate} className="p-3 border border-secondary rounded-3">
                      <h6 className="text-white fw-bold mb-3">Grant / Change Staff Role</h6>
                      <Form.Control
                        aria-label="Verified user email"
                        className="dark-input mb-2"
                        type="email"
                        required
                        placeholder="Verified user email"
                        value={roleForm.email}
                        onChange={(e) => setRoleForm((f) => ({ ...f, email: e.target.value }))}
                      />
                      <Form.Select
                        aria-label="Target staff role"
                        className="dark-input mb-3"
                        value={roleForm.role}
                        onChange={(e) => setRoleForm((f) => ({ ...f, role: e.target.value }))}
                      >
                        <option value="admin">admin (UTR verification + events)</option>
                        <option value="coordinator">coordinator (assigned competition only)</option>
                        <option value="participant">participant (revoke staff privileges)</option>
                      </Form.Select>
                      <Button type="submit" variant="purple" size="sm" disabled={busyAction === 'role_update'}>
                        {busyAction === 'role_update' ? 'Updating...' : 'Update Role'}
                      </Button>
                    </Form>
                  </Col>

                  <Col md={6}>
                    <Form onSubmit={handleAssignCoordinator} className="p-3 border border-secondary rounded-3">
                      <h6 className="text-white fw-bold mb-3">Assign Coordinator to Competition</h6>
                      <Form.Select
                        aria-label="Select active coordinator"
                        className="dark-input mb-2"
                        required
                        value={assignForm.coordinator_id}
                        onChange={(e) => setAssignForm((f) => ({ ...f, coordinator_id: e.target.value }))}
                      >
                        <option value="">Select active coordinator...</option>
                        {staffData.staff.filter((s) => s.role === 'coordinator' && s.is_active).map((s) => (
                          <option key={s.id} value={s.id}>{s.email} ({s.full_name})</option>
                        ))}
                      </Form.Select>
                      <Form.Select
                        aria-label="Select competition to assign"
                        className="dark-input mb-3"
                        value={assignForm.competition_id}
                        onChange={(e) => setAssignForm((f) => ({ ...f, competition_id: e.target.value }))}
                      >
                        {competitionsList.map((c) => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </Form.Select>
                      <Button type="submit" variant="purple" size="sm" disabled={!assignForm.coordinator_id || busyAction === 'assign_coord'}>
                        {busyAction === 'assign_coord' ? 'Assigning...' : 'Assign Event'}
                      </Button>
                    </Form>
                  </Col>
                </Row>

                <h6 className="text-white fw-bold">Staff Directory</h6>
                <Table responsive variant="dark" className="small align-middle mb-4">
                  <thead>
                    <tr><th>Email</th><th>Name</th><th>Role</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {staffData.staff.map((s) => (
                      <tr key={s.id}>
                        <td>{s.email}</td>
                        <td>{s.full_name}</td>
                        <td><Badge bg="secondary">{s.role}</Badge></td>
                        <td><Badge bg={s.is_active ? 'success' : 'danger'}>{s.is_active ? 'Active' : 'Disabled'}</Badge></td>
                        <td>
                          {s.role !== 'super_admin' && (
                            <Button
                              size="sm"
                              variant="outline-light"
                              disabled={busyAction === `toggle_user_${s.id}`}
                              onClick={() => handleToggleActive(s)}
                            >
                              {s.is_active ? 'Deactivate' : 'Reactivate'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>

                <h6 className="text-white fw-bold">Coordinator Assignments</h6>
                <Table responsive variant="dark" className="small align-middle mb-0">
                  <thead>
                    <tr><th>Coordinator</th><th>Competition</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {staffData.assignments.map((a) => (
                      <tr key={a.id}>
                        <td>{a.coordinator?.email || a.coordinator_id}</td>
                        <td>{a.competition?.title || a.competition_id}</td>
                        <td>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            disabled={busyAction === `remove_assign_${a.id}`}
                            onClick={() => handleRemoveAssignment(a.id)}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            )}

            {activeSection === 'audit' && (
              <Card className="registration-card p-4 rounded-4">
                <h4 className="text-white fw-bold mb-1">Audit History</h4>
                <p className="text-white-50 small mb-3">
                  Immutable administrative, verification, and staff action records from PostgreSQL.
                </p>
                <Table responsive variant="dark" className="small align-middle mb-0">
                  <thead>
                    <tr><th>Timestamp</th><th>Role</th><th>Action</th><th>Target</th><th>Details</th></tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td>{new Date(log.created_at).toLocaleString()}</td>
                        <td><Badge bg="secondary">{log.actor_role}</Badge></td>
                        <td><code>{log.action}</code></td>
                        <td>{log.target_table}</td>
                        <td><code>{JSON.stringify(log.details)}</code></td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr><td colSpan={5} className="text-center text-white-50 py-4">No audit entries recorded yet.</td></tr>
                    )}
                  </tbody>
                </Table>
              </Card>
            )}
          </>
        )}
      </App1>

      {/* Registration & Payment Reconciliation Modal */}
      <Modal show={Boolean(selectedReg)} onHide={() => setSelectedReg(null)} centered className="technoriti-payment-modal">
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title className="text-white fs-5 fw-bold">
            Reconcile Registration • {selectedReg?.pass_code}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 text-white small">
          {verifyError && <div className="alert alert-danger">{verifyError}</div>}
          {selectedReg && (
            <>
              <div className="mb-3">
                <div><strong>Delegate:</strong> {selectedReg.full_name} ({selectedReg.roll_number})</div>
                <div><strong>College:</strong> {selectedReg.college} • {selectedReg.branch}</div>
                <div><strong>Phone:</strong> {selectedReg.phone}</div>
                <div><strong>Expected Server Total:</strong> <span className="text-purple fw-bold">₹{selectedReg.computed_total_inr}</span></div>
              </div>

              {sortPaymentsNewestFirst(selectedReg.payments).length > 0 && (
                <div className="border-top border-secondary pt-3 mb-3">
                  <div className="fw-bold mb-2">Payment Attempts:</div>
                  {sortPaymentsNewestFirst(selectedReg.payments).map((p) => (
                    <div key={p.id} className="p-2 rounded bg-dark mb-2 border border-secondary">
                      <div>UTR: <code className="text-white">{p.utr_number}</code> • ₹{p.amount_inr} • <strong>{p.status}</strong></div>
                      {p.rejection_reason && <div className="text-danger">Reason: {p.rejection_reason}</div>}
                    </div>
                  ))}
                </div>
              )}

              {sortPaymentsNewestFirst(selectedReg.payments).some((p) => p.status === 'PENDING_VERIFICATION') && (
                <div className="border-top border-secondary pt-3">
                  <Form.Group controlId="admin-confirmed-amount" className="mb-2">
                    <Form.Label>Confirmed Bank / UPI Statement Amount (₹)</Form.Label>
                    <Form.Control
                      className="dark-input"
                      type="number"
                      value={confirmedAmount}
                      onChange={(e) => setConfirmedAmount(e.target.value)}
                    />
                  </Form.Group>
                  <Button
                    variant="success"
                    className="w-100 mb-3"
                    disabled={verifying}
                    onClick={() => handleVerifyDecision('VERIFIED')}
                  >
                    Approve & Issue Verified Pass
                  </Button>

                  <Form.Group controlId="admin-rejection-reason" className="mb-2">
                    <Form.Label>Rejection Reason (Required to Reject)</Form.Label>
                    <Form.Control
                      className="dark-input"
                      placeholder="e.g. UTR not found in bank statement / amount mismatch"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                  </Form.Group>
                  <Button
                    variant="danger"
                    className="w-100"
                    disabled={verifying}
                    onClick={() => handleVerifyDecision('REJECTED')}
                  >
                    Reject UTR Submission
                  </Button>
                </div>
              )}
            </>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Admin;
