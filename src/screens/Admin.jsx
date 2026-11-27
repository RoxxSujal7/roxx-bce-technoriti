import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  KeyRound,
  Lock,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import App1 from '../components/ui/app-1';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../components/ui/sheet';
import { Skeleton } from '../components/ui/skeleton';
import {
  buildAdminUserProfile,
  getCompetitionOverview,
  getDashboardStats,
  getFinancialMetrics,
  getRecentAdminActivity,
  getRegistrationTrends,
} from '../components/ui/app-1-utils/app-1-data';
import { useAuth } from '../context/AuthContext';
import { callEdgeFunction, supabase } from '../lib/supabaseClient';
import { competitionsList } from '../content/events';

const ALLOWED_STAFF_ROLES = new Set(['super_admin', 'admin', 'coordinator']);
const TABLE_WRAPPER_CLASS = 'overflow-x-auto rounded-lg border border-border bg-card';
const TABLE_CLASS = 'w-full caption-bottom text-left text-sm text-foreground border-collapse';
const THEAD_CLASS = 'border-b border-border bg-muted/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground';
const TBODY_CLASS = 'divide-y divide-border';
const ROW_HOVER_CLASS = 'transition-colors hover:bg-accent/50';
const TH_CLASS = 'px-4 py-3 font-medium whitespace-nowrap';
const TD_CLASS = 'px-4 py-3 align-middle';

function sortPaymentsNewestFirst(payments) {
  if (!Array.isArray(payments)) return [];
  return [...payments].sort(
    (a, b) => new Date(b?.submitted_at || 0).getTime() - new Date(a?.submitted_at || 0).getTime(),
  );
}

function getStatusBadgeVariant(status) {
  switch (status) {
    case 'VERIFIED':
      return 'success';
    case 'PENDING_VERIFICATION':
      return 'info';
    case 'REJECTED':
      return 'danger';
    case 'PENDING_PAYMENT':
      return 'warning';
    default:
      return 'secondary';
  }
}

function AdminNotice({ variant = 'info', children, roleAttr }) {
  const styles =
    variant === 'error'
      ? 'border-[hsl(var(--status-danger-border))] bg-[hsl(var(--status-danger-bg))] text-[hsl(var(--status-danger-fg))]'
      : variant === 'success'
        ? 'border-[hsl(var(--status-success-border))] bg-[hsl(var(--status-success-bg))] text-[hsl(var(--status-success-fg))]'
        : variant === 'warning'
          ? 'border-[hsl(var(--status-warning-border))] bg-[hsl(var(--status-warning-bg))] text-[hsl(var(--status-warning-fg))]'
          : 'border-[hsl(var(--status-info-border))] bg-[hsl(var(--status-info-bg))] text-[hsl(var(--status-info-fg))]';
  const Icon = variant === 'error' ? AlertCircle : variant === 'success' ? CheckCircle2 : ShieldAlert;

  return (
    <div
      role={roleAttr || (variant === 'error' ? 'alert' : 'status')}
      className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm ${styles}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function TableLoadingSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3" aria-label="Loading records">
      {Array.from({ length: rows }).map((_, idx) => (
        <Skeleton key={idx} className="h-11 w-full rounded-md" />
      ))}
    </div>
  );
}

function AdminPortalGateCard({ title, subtitle, badgeText = 'Staff Desk', children }) {
  return (
    <div className="technoriti-admin-shell flex min-h-screen items-center justify-center bg-background p-4 sm:p-6 text-foreground">
      <Card className="w-full max-w-lg border-border bg-card shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto">
            <Badge variant="outline" className="uppercase tracking-wider text-[11px]">
              {badgeText}
            </Badge>
          </div>
          <h1 className="m-0 text-xl sm:text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

const Admin = () => {
  const navigate = useNavigate();
  const {
    configured,
    loading: authLoading,
    session,
    profile,
    profileLoadError = false,
    mfaLoadError = false,
    aal,
    mfaFactors = [],
    needsMfaChallenge = false,
    refreshMfaStatus,
    signOut,
  } = useAuth();
  const role = profile?.role;
  const isActiveStaff = Boolean(profile?.is_active && ALLOWED_STAFF_ROLES.has(role));
  const userId = session?.user?.id || '';

  const [activeSection, setActiveSection] = useState('overview');

  // Coordinator view state
  const [coordData, setCoordData] = useState({
    assigned_competitions: [],
    registrations: [],
    pagination: { page: 1, total_pages: 1, total: 0 },
  });
  const [coordAnalytics, setCoordAnalytics] = useState(null);
  const [coordCompFilter, setCoordCompFilter] = useState('');
  const [coordPage, setCoordPage] = useState(1);

  // Admin registrations state
  const [adminRegs, setAdminRegs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 1 });
  const [summary, setSummary] = useState({});
  const [adminAnalytics, setAdminAnalytics] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [recentAuditLogs, setRecentAuditLogs] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 30, total: 0, total_pages: 1 });
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({ status: '', competition_id: '', q: '', page: 1 });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Detail & Payment verification drawer
  const [selectedReg, setSelectedReg] = useState(null);
  const [confirmedAmount, setConfirmedAmount] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Super Admin management state
  const [staffData, setStaffData] = useState({ staff: [], assignments: [] });
  const [roleForm, setRoleForm] = useState({ email: '', role: 'admin' });
  const [assignForm, setAssignForm] = useState({
    coordinator_id: '',
    competition_id: competitionsList[0]?.id || 'robowar',
  });
  const [staffMsg, setStaffMsg] = useState('');
  const [staffError, setStaffError] = useState('');

  // Catalog tariffs state
  const [catalog, setCatalog] = useState({ competitions: [], accommodation_plans: [] });
  const [tariffMsg, setTariffMsg] = useState('');
  const [tariffError, setTariffError] = useState('');
  const [editingComp, setEditingComp] = useState(null);
  const [editingAccom, setEditingAccom] = useState(null);
  const [catalogSaveError, setCatalogSaveError] = useState('');

  // MFA Enrollment & Challenge state
  const [selectedMfaFactorId, setSelectedMfaFactorId] = useState('');
  const [mfaGateCode, setMfaGateCode] = useState('');
  const [mfaGateError, setMfaGateError] = useState('');
  const [mfaGateBusy, setMfaGateBusy] = useState(false);

  const [mfaEnrollData, setMfaEnrollData] = useState(null);
  const [mfaEnrollQr, setMfaEnrollQr] = useState('');
  const [mfaEnrollCode, setMfaEnrollCode] = useState('');
  const [mfaMsg, setMfaMsg] = useState('');
  const [mfaErr, setMfaErr] = useState('');
  const [mfaBusy, setMfaBusy] = useState(false);

  // Shared concurrency & lifecycle guards
  const [busyKeys, setBusyKeys] = useState(() => new Set());
  const isBusy = useCallback((key) => busyKeys.has(key), [busyKeys]);
  const startBusy = useCallback((key) => {
    setBusyKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);
  const stopBusy = useCallback((key) => {
    setBusyKeys((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);
  const mountedRef = useRef(true);
  const adminSeqRef = useRef(0);
  const coordSeqRef = useRef(0);
  const csvTimersRef = useRef(new Set());

  useEffect(() => {
    mountedRef.current = true;
    const timers = csvTimersRef.current;
    return () => {
      mountedRef.current = false;
      timers.forEach((id) => clearTimeout(id));
      timers.clear();
    };
  }, []);

  useEffect(() => {
    if (!authLoading && configured && !userId) {
      navigate('/admin-login', { replace: true });
    }
  }, [authLoading, configured, userId, navigate]);

  useEffect(() => {
    const trimmed = searchInput.trim();
    const timer = setTimeout(() => {
      setFilters((f) => (f.q === trimmed ? f : { ...f, q: trimmed, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (Array.isArray(mfaFactors) && mfaFactors.length > 0) {
      setSelectedMfaFactorId((prev) =>
        mfaFactors.some((f) => f.id === prev) ? prev : mfaFactors[0].id,
      );
    } else {
      setSelectedMfaFactorId('');
    }
  }, [mfaFactors]);

  const loadAdminRegs = useCallback(async () => {
    if (!configured || !userId || !isActiveStaff || needsMfaChallenge || !['admin', 'super_admin'].includes(role)) {
      return;
    }
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
          audit_page: auditPage,
          audit_action: auditActionFilter,
        },
      });
      if (!mountedRef.current || seq !== adminSeqRef.current) return;
      setAdminRegs(res.registrations || []);
      setPagination(res.pagination || { page: 1, limit: 20, total: 0, total_pages: 1 });
      setSummary(res.summary || {});
      setAdminAnalytics(res.analytics || null);
      const nextAuditLogs = res.audit_logs || [];
      setAuditLogs(nextAuditLogs);
      if (auditPage === 1 && !auditActionFilter) {
        setRecentAuditLogs(nextAuditLogs);
      }
      setAuditPagination(
        res.audit_pagination || {
          page: auditPage,
          limit: 30,
          total: nextAuditLogs.length,
          total_pages: 1,
        },
      );
    } catch (err) {
      if (!mountedRef.current || seq !== adminSeqRef.current) return;
      setErrorMsg(err.message || 'Unable to fetch registrations.');
    } finally {
      if (mountedRef.current && seq === adminSeqRef.current) {
        setLoading(false);
      }
    }
  }, [configured, userId, isActiveStaff, needsMfaChallenge, role, filters, auditPage, auditActionFilter]);

  const loadCoordinatorRegs = useCallback(async () => {
    if (!configured || !userId || !isActiveStaff || needsMfaChallenge || role !== 'coordinator') return;
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
    } catch (err) {
      if (!mountedRef.current || seq !== coordSeqRef.current) return;
      setErrorMsg(err.message || 'Unable to fetch assigned coordinator registrations.');
    } finally {
      if (mountedRef.current && seq === coordSeqRef.current) {
        setLoading(false);
      }
    }
  }, [configured, userId, isActiveStaff, needsMfaChallenge, role, coordPage, coordCompFilter]);

  const loadStaff = useCallback(async () => {
    if (!configured || !userId || !isActiveStaff || needsMfaChallenge || role !== 'super_admin') return;
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
  }, [configured, userId, isActiveStaff, needsMfaChallenge, role]);

  const loadCatalog = useCallback(async () => {
    if (!configured || !userId || !isActiveStaff || needsMfaChallenge || !['admin', 'super_admin'].includes(role)) {
      return;
    }
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
  }, [configured, userId, isActiveStaff, needsMfaChallenge, role]);

  const currentAal = aal?.currentLevel || '';

  useEffect(() => {
    if (!isActiveStaff || needsMfaChallenge) return;
    if (role === 'coordinator') {
      loadCoordinatorRegs();
    } else if (role === 'admin' || role === 'super_admin') {
      loadAdminRegs();
    }
  }, [isActiveStaff, needsMfaChallenge, currentAal, role, loadAdminRegs, loadCoordinatorRegs]);

  useEffect(() => {
    if (!isActiveStaff || needsMfaChallenge) return;
    if (role === 'admin' || role === 'super_admin') {
      loadCatalog();
      if (role === 'super_admin') {
        loadStaff();
      }
    }
  }, [isActiveStaff, needsMfaChallenge, currentAal, role, loadCatalog, loadStaff]);

  const handleExportCsv = async () => {
    if (isBusy('export_csv')) return;
    startBusy('export_csv');
    let csvTruncatedInfo = null;
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
        onCsvMeta: (meta) => {
          csvTruncatedInfo = meta;
        },
      });
      if (!mountedRef.current) return;
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `technoriti26-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      const tid = setTimeout(() => {
        URL.revokeObjectURL(url);
        csvTimersRef.current.delete(tid);
      }, 1000);
      csvTimersRef.current.add(tid);
      if (csvTruncatedInfo?.truncated) {
        setErrorMsg(`CSV export capped at 2,000 rows out of ${csvTruncatedInfo.totalCount} total matches. Narrow your filters to export the remaining rows.`);
      }
    } catch (err) {
      if (mountedRef.current) setErrorMsg(err.message || 'CSV export failed.');
    } finally {
      if (mountedRef.current) stopBusy('export_csv');
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
    startBusy('role_update');
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
      if (mountedRef.current) stopBusy('role_update');
    }
  };

  const handleToggleActive = async (targetUser) => {
    setStaffMsg('');
    setStaffError('');
    const key = `toggle_user_${targetUser.id}`;
    startBusy(key);
    try {
      await callEdgeFunction('manage-admins', {
        method: 'POST',
        body: { action: 'set_active', target_user_id: targetUser.id, is_active: !targetUser.is_active },
      });
      if (!mountedRef.current) return;
      await loadStaff();
    } catch (err) {
      if (mountedRef.current) setStaffError(err.message || 'Unable to update staff account status.');
    } finally {
      if (mountedRef.current) stopBusy(key);
    }
  };

  const handleAssignCoordinator = async (e) => {
    e.preventDefault();
    setStaffMsg('');
    setStaffError('');
    startBusy('assign_coord');
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
      if (mountedRef.current) stopBusy('assign_coord');
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    setStaffMsg('');
    setStaffError('');
    const key = `remove_assign_${assignmentId}`;
    startBusy(key);
    try {
      await callEdgeFunction('manage-admins', {
        method: 'POST',
        body: { action: 'remove_coordinator', assignment_id: assignmentId },
      });
      if (!mountedRef.current) return;
      await loadStaff();
    } catch (err) {
      if (mountedRef.current) setStaffError(err.message || 'Unable to remove assignment.');
    } finally {
      if (mountedRef.current) stopBusy(key);
    }
  };

  const handleToggleCompetition = async (comp) => {
    setTariffMsg('');
    setTariffError('');
    const key = `toggle_comp_${comp.id}`;
    startBusy(key);
    try {
      await callEdgeFunction('manage-competitions', {
        method: 'PATCH',
        body: { id: comp.id, is_active: !comp.is_active },
      });
      if (!mountedRef.current) return;
      setTariffMsg(`Updated ${comp.title}.`);
      await Promise.all([loadCatalog(), loadAdminRegs()]);
    } catch (err) {
      if (mountedRef.current) setTariffError(err.message || 'Unable to update competition status.');
    } finally {
      if (mountedRef.current) stopBusy(key);
    }
  };

  const handleToggleAccommodation = async (plan) => {
    setTariffMsg('');
    setTariffError('');
    const key = `toggle_accom_${plan.id}`;
    startBusy(key);
    try {
      await callEdgeFunction('manage-competitions', {
        method: 'PATCH',
        body: { target: 'accommodation', id: plan.id, is_active: !plan.is_active },
      });
      if (!mountedRef.current) return;
      setTariffMsg(`Updated ${plan.name}.`);
      await loadCatalog();
    } catch (err) {
      if (mountedRef.current) setTariffError(err.message || 'Unable to update accommodation plan.');
    } finally {
      if (mountedRef.current) stopBusy(key);
    }
  };

  const handleSaveCompetition = async (e) => {
    e.preventDefault();
    if (!editingComp) return;
    setCatalogSaveError('');
    setTariffMsg('');

    const venue = String(editingComp.venue || '').trim();
    const eventDate = String(editingComp.event_date || '').trim();
    const eventTime = String(editingComp.event_time || '').trim();
    if (venue.length < 2 || eventDate.length < 2 || eventTime.length < 2) {
      setCatalogSaveError('Venue, date, and time must each be at least 2 characters.');
      return;
    }

    const body = {
      id: editingComp.id,
      venue,
      event_date: eventDate,
      event_time: eventTime,
    };

    if (role === 'super_admin') {
      const rawFee = String(editingComp.fee_inr ?? '').trim();
      const feeInr = /^\d+$/.test(rawFee) ? Number(rawFee) : NaN;
      if (!Number.isInteger(feeInr) || feeInr < 0 || feeInr > 25000) {
        setCatalogSaveError('Competition fee must be a whole integer between 0 and 25000 INR.');
        return;
      }
      if (editingComp.fee_type !== 'per_member' && editingComp.fee_type !== 'per_team') {
        setCatalogSaveError('Fee type must be per_member or per_team.');
        return;
      }
      body.fee_inr = feeInr;
      body.fee_type = editingComp.fee_type;
    }

    const targetId = editingComp.id;
    const targetTitle = editingComp.title;
    const key = `save_comp_${targetId}`;
    startBusy(key);
    try {
      await callEdgeFunction('manage-competitions', { method: 'PATCH', body });
      await Promise.all([loadCatalog(), loadAdminRegs()]);
      if (!mountedRef.current) return;
      setTariffMsg(`Saved details for ${targetTitle}.`);
      setEditingComp((cur) => (cur?.id === targetId ? null : cur));
    } catch (err) {
      if (mountedRef.current) setCatalogSaveError(err.message || 'Unable to save competition changes.');
    } finally {
      if (mountedRef.current) stopBusy(key);
    }
  };

  const handleSaveAccommodation = async (e) => {
    e.preventDefault();
    if (!editingAccom) return;
    setCatalogSaveError('');
    setTariffMsg('');

    const rawPrice = String(editingAccom.price_per_person_inr ?? '').trim();
    const price = /^\d+$/.test(rawPrice) ? Number(rawPrice) : NaN;
    if (!Number.isInteger(price) || price < 0 || price > 10000) {
      setCatalogSaveError('Tariff must be a whole integer between 0 and 10000 INR.');
      return;
    }

    const targetId = editingAccom.id;
    const targetName = editingAccom.name;
    const key = `save_accom_${targetId}`;
    startBusy(key);
    try {
      await callEdgeFunction('manage-competitions', {
        method: 'PATCH',
        body: {
          target: 'accommodation',
          id: targetId,
          price_per_person_inr: price,
        },
      });
      await loadCatalog();
      if (!mountedRef.current) return;
      setTariffMsg(`Updated tariff for ${targetName}.`);
      setEditingAccom((cur) => (cur?.id === targetId ? null : cur));
    } catch (err) {
      if (mountedRef.current) setCatalogSaveError(err.message || 'Unable to update accommodation tariff.');
    } finally {
      if (mountedRef.current) stopBusy(key);
    }
  };

  const handleMfaGateVerify = async (e) => {
    e.preventDefault();
    if (mfaGateBusy) return;
    setMfaGateError('');
    const cleaned = mfaGateCode.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(cleaned)) {
      setMfaGateError('Enter a valid 6-digit TOTP verification code.');
      return;
    }
    const factor = mfaFactors?.find((f) => f.id === selectedMfaFactorId) || mfaFactors?.[0];
    if (!supabase?.auth?.mfa || !factor?.id) {
      setMfaGateError('No verified TOTP authenticator factor found.');
      return;
    }
    setMfaGateBusy(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code: cleaned,
      });
      if (error) {
        if (mountedRef.current) setMfaGateError('Invalid or expired authenticator code. Try again.');
        return;
      }
      if (!mountedRef.current) return;
      setMfaGateCode('');
      await refreshMfaStatus?.();
    } catch {
      if (mountedRef.current) setMfaGateError('Unable to verify authenticator code right now.');
    } finally {
      if (mountedRef.current) setMfaGateBusy(false);
    }
  };

  const handleStartMfaEnroll = async () => {
    setMfaMsg('');
    setMfaErr('');
    if (!supabase?.auth?.mfa?.enroll) {
      setMfaErr('Supabase MFA SDK unavailable in this environment.');
      return;
    }
    setMfaBusy(true);
    try {
      const suffix = Date.now().toString(36).slice(-4);
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `TECHNORITI Admin (${profile?.email || 'staff'})-${suffix}`,
      });
      if (error || !data?.totp?.uri) {
        if (mountedRef.current) setMfaErr(error?.message || 'Could not initiate TOTP enrollment.');
        return;
      }
      const qrDataUrl = await QRCode.toDataURL(data.totp.uri, { width: 196, margin: 2 });
      if (!mountedRef.current) return;
      setMfaEnrollData(data);
      setMfaEnrollQr(qrDataUrl);
      setMfaEnrollCode('');
    } catch {
      if (mountedRef.current) setMfaErr('Unable to generate TOTP enrollment QR code.');
    } finally {
      if (mountedRef.current) setMfaBusy(false);
    }
  };

  const handleConfirmMfaEnroll = async (e) => {
    e.preventDefault();
    setMfaMsg('');
    setMfaErr('');
    const cleaned = mfaEnrollCode.replace(/\D/g, '');
    if (!/^\d{6}$/.test(cleaned) || !mfaEnrollData?.id || !supabase?.auth?.mfa) {
      setMfaErr('Enter the 6-digit code shown in your authenticator app.');
      return;
    }
    setMfaBusy(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfaEnrollData.id,
        code: cleaned,
      });
      if (error) {
        if (mountedRef.current) setMfaErr('Verification code rejected. Check your device clock and try again.');
        return;
      }
      if (!mountedRef.current) return;
      setMfaEnrollData(null);
      setMfaEnrollQr('');
      setMfaEnrollCode('');
      setMfaMsg('TOTP authenticator enrolled and verified (session elevated to AAL2).');
      await refreshMfaStatus?.();
    } catch {
      if (mountedRef.current) setMfaErr('Unable to verify TOTP enrollment.');
    } finally {
      if (mountedRef.current) setMfaBusy(false);
    }
  };

  const handleRemoveMfaFactor = async (factorId) => {
    setMfaMsg('');
    setMfaErr('');
    if ((role === 'super_admin' || role === 'admin') && mfaFactors.length <= 1) {
      setMfaErr('Enroll a backup authenticator before removing your sole TOTP factor so your privileged account cannot downgrade to AAL1.');
      return;
    }
    if (!supabase?.auth?.mfa?.unenroll) return;
    setMfaBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) {
        if (mountedRef.current) setMfaErr(error.message || 'Unable to remove TOTP factor.');
        return;
      }
      if (typeof supabase.auth.refreshSession === 'function') {
        await supabase.auth.refreshSession().catch(() => { });
      }
      if (!mountedRef.current) return;
      setMfaMsg('Authenticator factor removed and session claims refreshed.');
      await refreshMfaStatus?.();
    } catch {
      if (mountedRef.current) setMfaErr('Failed to remove authenticator factor.');
    } finally {
      if (mountedRef.current) setMfaBusy(false);
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
      } else if (
        (nextSection === 'registrations' || nextSection === 'overview') &&
        filters.status === 'PENDING_VERIFICATION'
      ) {
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
    navigate('/admin-login', { replace: true });
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

  const coordAssignedCompetitions = useMemo(
    () => (Array.isArray(coordData.assigned_competitions) ? coordData.assigned_competitions : []),
    [coordData.assigned_competitions],
  );

  const competitionsOverview = useMemo(
    () =>
      isActiveStaff
        ? getCompetitionOverview({
          role,
          analytics: activeAnalytics,
          catalogCompetitions: catalog.competitions,
          assignedCompetitions: coordAssignedCompetitions,
        })
        : [],
    [isActiveStaff, role, activeAnalytics, catalog.competitions, coordAssignedCompetitions],
  );

  const recentActivity = useMemo(
    () =>
      isActiveStaff
        ? getRecentAdminActivity({
          role,
          auditLogs: recentAuditLogs,
        })
        : [],
    [isActiveStaff, role, recentAuditLogs],
  );

  const pendingVerificationsCount = Number(
    adminAnalytics?.kpis?.pending_verifications_count ?? summary?.pending_verification ?? 0,
  );

  if (!configured) {
    return (
      <AdminPortalGateCard
        badgeText="Staff & Accounts Desk Portal"
        title="Backend Not Configured"
        subtitle="Supabase connection details are required before administrative access is unlocked."
      >
        Configure <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">REACT_APP_SUPABASE_URL</code> and{' '}
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">REACT_APP_SUPABASE_ANON_KEY</code> to access the staff portal.
      </AdminPortalGateCard>
    );
  }

  if ((mfaLoadError && session) || (profileLoadError && session && !profile)) {
    return (
      <AdminPortalGateCard
        badgeText="Profile Verification Error"
        title="Unable to Verify Account Role"
        subtitle="Failed closed while loading your staff profile or MFA verification state."
      >
        <div className="space-y-4">
          <AdminNotice variant="error">
            Could not verify your profile privileges or MFA assurance level from the server. Sign out and try again.
          </AdminNotice>
          <Button type="button" variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </AdminPortalGateCard>
    );
  }

  if (authLoading || !session || (session && !profile)) {
    return (
      <AdminPortalGateCard
        badgeText="Staff Portal"
        title="Verifying Access..."
        subtitle="Checking authenticated session and administrative privileges."
      >
        <div className="space-y-3 pt-2">
          <Skeleton className="h-4 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
        </div>
      </AdminPortalGateCard>
    );
  }

  if (!isActiveStaff) {
    return (
      <AdminPortalGateCard
        badgeText="Restricted Access"
        title="Administrator Access Required"
        subtitle="Staff Desk authorization check failed closed."
      >
        <div className="space-y-4">
          <p className="m-0">
            {profile?.is_active === false
              ? 'Your staff account has been deactivated. Contact the Super Admin.'
              : 'You do not have permission to access the Admin Portal.'}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            {profile?.is_active !== false && (
              <Button type="button" onClick={() => navigate('/dashboard')}>
                Participant Dashboard
              </Button>
            )}
            <Button type="button" variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </AdminPortalGateCard>
    );
  }

  if (needsMfaChallenge) {
    return (
      <AdminPortalGateCard
        badgeText="AAL2 Verification Required"
        title="Two-Factor Verification"
        subtitle="Your privileged account has TOTP MFA enabled. Enter your 6-digit authenticator code to unlock admin operations."
      >
        <form onSubmit={handleMfaGateVerify} className="space-y-4 text-left">
          {mfaGateError && <AdminNotice variant="error">{mfaGateError}</AdminNotice>}
          {Array.isArray(mfaFactors) && mfaFactors.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="admin-mfa-factor-select">Authenticator Device</Label>
              <select
                id="admin-mfa-factor-select"
                className="admin-select"
                value={selectedMfaFactorId || mfaFactors[0]?.id || ''}
                onChange={(e) => setSelectedMfaFactorId(e.target.value)}
              >
                {mfaFactors.map((f, idx) => (
                  <option key={f.id} value={f.id}>
                    {f.friendly_name || `Authenticator ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="admin-mfa-gate-code">Authenticator 6-Digit Code</Label>
            <Input
              id="admin-mfa-gate-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              autoComplete="one-time-code"
              required
              placeholder="123456"
              value={mfaGateCode}
              onChange={(e) => setMfaGateCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={mfaGateBusy} className="flex-1">
              {mfaGateBusy ? 'Verifying...' : 'Verify & Unlock Portal'}
            </Button>
            <Button type="button" variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </form>
      </AdminPortalGateCard>
    );
  }

  const mfaEnrolled = Array.isArray(mfaFactors) && mfaFactors.length > 0;
  const requireRecommendedMfa = role === 'super_admin' || role === 'admin';

  return (
    <div className="technoriti-admin-shell bg-background text-foreground">
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
        <h2 className="sr-only">Admin Operations Workspace</h2>
        {requireRecommendedMfa && !mfaEnrolled && activeSection === 'overview' && (
          <AdminNotice variant="warning">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>
                <strong>Recommended Security Action:</strong> Enroll a TOTP authenticator app for your privileged{' '}
                <code className="rounded bg-background/60 px-1 py-0.5 text-xs">{role}</code> account.
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="self-start sm:self-auto shrink-0"
                onClick={() => handleSelectSection('security')}
              >
                <Lock className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Configure MFA
              </Button>
            </div>
          </AdminNotice>
        )}

        {role === 'coordinator' ? (
          <Card className="min-w-0">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Coordinator Arena Roster</CardTitle>
                <CardDescription>
                  Restricted strictly to competitions assigned by Super Admin.
                </CardDescription>
              </div>
              <div className="w-full sm:w-64">
                <select
                  aria-label="Filter by assigned competition"
                  className="admin-select"
                  value={coordCompFilter}
                  onChange={(e) => {
                    setCoordCompFilter(e.target.value);
                    setCoordPage(1);
                  }}
                >
                  <option value="">All Assigned Competitions</option>
                  {coordAssignedCompetitions.map((cid) => {
                    const comp = competitionsList.find((c) => c.id === cid);
                    return <option key={cid} value={cid}>{comp?.title || cid}</option>;
                  })}
                </select>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {loading ? (
                <TableLoadingSkeleton />
              ) : (
                <div className={TABLE_WRAPPER_CLASS}>
                  <table className={TABLE_CLASS} aria-label="Coordinator assigned arena registrations">
                    <thead className={THEAD_CLASS}>
                      <tr>
                        <th scope="col" className={TH_CLASS}>Pass Code</th>
                        <th scope="col" className={TH_CLASS}>Delegate</th>
                        <th scope="col" className={TH_CLASS}>College</th>
                        <th scope="col" className={TH_CLASS}>Phone</th>
                        <th scope="col" className={TH_CLASS}>Primary Arena</th>
                        <th scope="col" className={TH_CLASS}>Team</th>
                        <th scope="col" className={TH_CLASS}>Status</th>
                      </tr>
                    </thead>
                    <tbody className={TBODY_CLASS}>
                      {(coordData.registrations || []).map((r) => (
                        <tr key={r.id} className={ROW_HOVER_CLASS}>
                          <td className={`${TD_CLASS} font-mono text-xs font-medium`}>{r.pass_code}</td>
                          <td className={`${TD_CLASS} font-medium`}>{r.full_name}</td>
                          <td className={`${TD_CLASS} text-muted-foreground`}>{r.college}</td>
                          <td className={`${TD_CLASS} tabular-nums`}>{r.phone}</td>
                          <td className={TD_CLASS}>{r.primary_competition?.title || r.primary_arena_id}</td>
                          <td className={`${TD_CLASS} tabular-nums`}>{r.team_size}</td>
                          <td className={TD_CLASS}>
                            <Badge variant={getStatusBadgeVariant(r.status)}>{r.status}</Badge>
                          </td>
                        </tr>
                      ))}
                      {coordData.registrations?.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No registrations found for your assigned competitions.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="tabular-nums">
                  Page {coordData.pagination?.page || coordPage} of {coordData.pagination?.total_pages || 1} ({coordData.pagination?.total ?? 0} total)
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={loading || (coordData.pagination?.page || coordPage) <= 1}
                    onClick={() => setCoordPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={loading || (coordData.pagination?.page || coordPage) >= (coordData.pagination?.total_pages || 1)}
                    onClick={() => setCoordPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {(activeSection === 'overview' ||
              activeSection === 'registrations' ||
              activeSection === 'pending-verification') && (
                <Card className="min-w-0">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {activeSection === 'pending-verification'
                        ? 'Payment UTR Verification Queue'
                        : 'Registrations & UTR Verification'}
                    </CardTitle>
                    <CardDescription>
                      Filter delegates, export sanitized CSV rosters, and reconcile 12-digit UTR submissions against bank statements.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-12">
                      <div className="md:col-span-3">
                        <select
                          aria-label="Filter by registration status"
                          className="admin-select"
                          value={filters.status}
                          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
                        >
                          <option value="">All Statuses</option>
                          <option value="PENDING_VERIFICATION">Pending Verification</option>
                          <option value="PENDING_PAYMENT">Pending Payment</option>
                          <option value="VERIFIED">Verified</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
                      </div>
                      <div className="md:col-span-3">
                        <select
                          aria-label="Filter by competition"
                          className="admin-select"
                          value={filters.competition_id}
                          onChange={(e) => setFilters((f) => ({ ...f, competition_id: e.target.value, page: 1 }))}
                        >
                          <option value="">All Competitions</option>
                          {competitionsList.map((c) => (
                            <option key={c.id} value={c.id}>{c.title}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-4">
                        <Input
                          aria-label="Search registrations"
                          placeholder="Search name, pass code, phone, college..."
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-2 flex">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full gap-1.5"
                          disabled={isBusy('export_csv')}
                          onClick={handleExportCsv}
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{isBusy('export_csv') ? 'Exporting...' : 'Export CSV'}</span>
                        </Button>
                      </div>
                    </div>

                    {loading ? (
                      <TableLoadingSkeleton />
                    ) : (
                      <div className={TABLE_WRAPPER_CLASS}>
                        <table className={TABLE_CLASS} aria-label="Delegate registrations and UTR verification queue">
                          <thead className={THEAD_CLASS}>
                            <tr>
                              <th scope="col" className={TH_CLASS}>Pass Code</th>
                              <th scope="col" className={TH_CLASS}>Delegate</th>
                              <th scope="col" className={TH_CLASS}>Arena</th>
                              <th scope="col" className={TH_CLASS}>Total</th>
                              <th scope="col" className={TH_CLASS}>UTR</th>
                              <th scope="col" className={TH_CLASS}>Status</th>
                              <th scope="col" className={TH_CLASS}>Action</th>
                            </tr>
                          </thead>
                          <tbody className={TBODY_CLASS}>
                            {adminRegs.map((reg) => {
                              const payments = sortPaymentsNewestFirst(reg.payments);
                              const latestPay = payments[0] || null;
                              return (
                                <tr key={reg.id} className={ROW_HOVER_CLASS}>
                                  <td className={`${TD_CLASS} font-mono text-xs font-medium`}>{reg.pass_code}</td>
                                  <td className={TD_CLASS}>
                                    <div className="font-semibold text-foreground">{reg.full_name}</div>
                                    <div className="text-xs text-muted-foreground">{reg.phone} • {reg.college}</div>
                                  </td>
                                  <td className={TD_CLASS}>{reg.primary_competition?.title || reg.primary_arena_id}</td>
                                  <td className={`${TD_CLASS} font-semibold tabular-nums text-foreground`}>
                                    ₹{reg.computed_total_inr}
                                  </td>
                                  <td className={`${TD_CLASS} font-mono text-xs`}>
                                    {latestPay?.utr_number || '—'}
                                  </td>
                                  <td className={TD_CLASS}>
                                    <Badge variant={getStatusBadgeVariant(reg.status)}>{reg.status}</Badge>
                                  </td>
                                  <td className={TD_CLASS}>
                                    <Button
                                      type="button"
                                      size="sm"
                                      aria-label={`Inspect ${reg.pass_code}`}
                                      onClick={() => {
                                        setVerifyError('');
                                        setConfirmedAmount(String(reg.computed_total_inr ?? ''));
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
                              <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                                  No matching registrations.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="tabular-nums">
                        Page {pagination.page} of {pagination.total_pages} ({pagination.total} total)
                      </span>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={loading || pagination.page <= 1}
                          onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                        >
                          Prev
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={loading || pagination.page >= pagination.total_pages}
                          onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

            {activeSection === 'competitions' && (
              <div className="space-y-6">
                <Card className="min-w-0">
                  <CardHeader>
                    <CardTitle className="text-lg">Competitions &amp; Tariffs</CardTitle>
                    <CardDescription>
                      Control live registration availability for TECHNORITI &apos;26 arenas and inspect institutional accommodation plans.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {tariffError && <AdminNotice variant="error">{tariffError}</AdminNotice>}
                    {tariffMsg && <AdminNotice variant="success">{tariffMsg}</AdminNotice>}

                    <div className={TABLE_WRAPPER_CLASS}>
                      <table className={TABLE_CLASS} aria-label="Competitions and registration tariffs">
                        <thead className={THEAD_CLASS}>
                          <tr>
                            <th scope="col" className={TH_CLASS}>#</th>
                            <th scope="col" className={TH_CLASS}>Title</th>
                            <th scope="col" className={TH_CLASS}>Fee Type</th>
                            <th scope="col" className={TH_CLASS}>Fee</th>
                            <th scope="col" className={TH_CLASS}>Team Limits</th>
                            <th scope="col" className={TH_CLASS}>Status</th>
                            <th scope="col" className={TH_CLASS}>Action</th>
                          </tr>
                        </thead>
                        <tbody className={TBODY_CLASS}>
                          {catalog.competitions.map((c) => (
                            <tr key={c.id} className={ROW_HOVER_CLASS}>
                              <td className={`${TD_CLASS} tabular-nums text-muted-foreground`}>{c.num_id}</td>
                              <td className={`${TD_CLASS} font-medium`}>{c.title}</td>
                              <td className={`${TD_CLASS} text-muted-foreground`}>{c.fee_type}</td>
                              <td className={`${TD_CLASS} font-medium tabular-nums`}>₹{c.fee_inr}</td>
                              <td className={`${TD_CLASS} tabular-nums`}>{c.min_team_size}–{c.max_team_size}</td>
                              <td className={TD_CLASS}>
                                <Badge variant={c.is_active ? 'success' : 'secondary'}>
                                  {c.is_active ? 'Active' : 'Paused'}
                                </Badge>
                              </td>
                              <td className={TD_CLASS}>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    aria-label={`Edit ${c.title}`}
                                    onClick={() => {
                                      setCatalogSaveError('');
                                      setEditingAccom(null);
                                      setEditingComp({
                                        id: c.id,
                                        title: c.title,
                                        venue: c.venue || '',
                                        event_date: c.event_date || '',
                                        event_time: c.event_time || '',
                                        fee_inr: c.fee_inr ?? 0,
                                        fee_type: c.fee_type || 'per_member',
                                      });
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    aria-label={`${c.is_active ? 'Disable' : 'Enable'} ${c.title}`}
                                    disabled={isBusy(`toggle_comp_${c.id}`)}
                                    onClick={() => handleToggleCompetition(c)}
                                  >
                                    {isBusy(`toggle_comp_${c.id}`) ? 'Updating...' : c.is_active ? 'Disable' : 'Enable'}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {catalog.competitions.length === 0 && (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                                No competition tariff records loaded yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {catalog.accommodation_plans?.length > 0 && (
                  <Card className="min-w-0">
                    <CardHeader>
                      <CardTitle className="text-lg">Accommodation Plans</CardTitle>
                      <CardDescription>
                        Server-enforced institutional lodging and mess pricing plans.
                        {role === 'super_admin' ? ' Super Admin may enable or pause plan availability.' : ''}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className={TABLE_WRAPPER_CLASS}>
                        <table className={TABLE_CLASS} aria-label="Accommodation pricing plans">
                          <thead className={THEAD_CLASS}>
                            <tr>
                              <th scope="col" className={TH_CLASS}>Plan ID</th>
                              <th scope="col" className={TH_CLASS}>Name</th>
                              <th scope="col" className={TH_CLASS}>Tariff / Person</th>
                              <th scope="col" className={TH_CLASS}>Status</th>
                              {role === 'super_admin' && <th scope="col" className={TH_CLASS}>Action</th>}
                            </tr>
                          </thead>
                          <tbody className={TBODY_CLASS}>
                            {catalog.accommodation_plans.map((plan) => (
                              <tr key={plan.id} className={ROW_HOVER_CLASS}>
                                <td className={`${TD_CLASS} font-mono text-xs`}>{plan.id}</td>
                                <td className={`${TD_CLASS} font-medium`}>{plan.name}</td>
                                <td className={`${TD_CLASS} font-semibold tabular-nums text-foreground`}>
                                  ₹{plan.price_per_person_inr}
                                </td>
                                <td className={TD_CLASS}>
                                  <Badge variant={plan.is_active ? 'success' : 'secondary'}>
                                    {plan.is_active ? 'Active' : 'Paused'}
                                  </Badge>
                                </td>
                                {role === 'super_admin' && (
                                  <td className={TD_CLASS}>
                                    <div className="flex flex-wrap gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        aria-label={`Edit ${plan.name}`}
                                        onClick={() => {
                                          setCatalogSaveError('');
                                          setEditingComp(null);
                                          setEditingAccom({
                                            id: plan.id,
                                            name: plan.name,
                                            price_per_person_inr: plan.price_per_person_inr ?? 0,
                                          });
                                        }}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        aria-label={`${plan.is_active ? 'Disable' : 'Enable'} ${plan.name}`}
                                        disabled={isBusy(`toggle_accom_${plan.id}`)}
                                        onClick={() => handleToggleAccommodation(plan)}
                                      >
                                        {isBusy(`toggle_accom_${plan.id}`)
                                          ? 'Updating...'
                                          : plan.is_active
                                            ? 'Disable'
                                            : 'Enable'}
                                      </Button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {role === 'super_admin' && activeSection === 'staff' && (
              <div className="space-y-6">
                <Card className="min-w-0">
                  <CardHeader>
                    <CardTitle className="text-lg">Admins &amp; Coordinators</CardTitle>
                    <CardDescription>
                      Grant or revoke administrative roles and assign coordinators to specific TECHNORITI &apos;26 arenas.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {staffError && <AdminNotice variant="error">{staffError}</AdminNotice>}
                    {staffMsg && <AdminNotice variant="success">{staffMsg}</AdminNotice>}

                    <div className="grid gap-4 md:grid-cols-2">
                      <form onSubmit={handleRoleUpdate} className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                        <h4 className="m-0 text-sm font-semibold text-foreground">Grant / Change Staff Role</h4>
                        <div className="space-y-1.5">
                          <Label htmlFor="staff-role-email">Verified User Email</Label>
                          <Input
                            id="staff-role-email"
                            aria-label="Verified user email"
                            type="email"
                            required
                            placeholder="Verified user email"
                            value={roleForm.email}
                            onChange={(e) => setRoleForm((f) => ({ ...f, email: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="staff-role-select">Target Staff Role</Label>
                          <select
                            id="staff-role-select"
                            aria-label="Target staff role"
                            className="admin-select"
                            value={roleForm.role}
                            onChange={(e) => setRoleForm((f) => ({ ...f, role: e.target.value }))}
                          >
                            <option value="admin">admin (UTR verification + events)</option>
                            <option value="coordinator">coordinator (assigned competition only)</option>
                            <option value="participant">participant (revoke staff privileges)</option>
                          </select>
                        </div>
                        <Button type="submit" size="sm" disabled={isBusy('role_update')}>
                          {isBusy('role_update') ? 'Updating...' : 'Update Role'}
                        </Button>
                      </form>

                      <form onSubmit={handleAssignCoordinator} className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                        <h4 className="m-0 text-sm font-semibold text-foreground">Assign Coordinator to Competition</h4>
                        <div className="space-y-1.5">
                          <Label htmlFor="assign-coord-select">Active Coordinator</Label>
                          <select
                            id="assign-coord-select"
                            aria-label="Select active coordinator"
                            className="admin-select"
                            required
                            value={assignForm.coordinator_id}
                            onChange={(e) => setAssignForm((f) => ({ ...f, coordinator_id: e.target.value }))}
                          >
                            <option value="">Select active coordinator...</option>
                            {staffData.staff.filter((s) => s.role === 'coordinator' && s.is_active).map((s) => (
                              <option key={s.id} value={s.id}>{s.email} ({s.full_name})</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="assign-comp-select">Competition Arena</Label>
                          <select
                            id="assign-comp-select"
                            aria-label="Select competition to assign"
                            className="admin-select"
                            value={assignForm.competition_id}
                            onChange={(e) => setAssignForm((f) => ({ ...f, competition_id: e.target.value }))}
                          >
                            {competitionsList.map((c) => (
                              <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                          </select>
                        </div>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={!assignForm.coordinator_id || isBusy('assign_coord')}
                        >
                          {isBusy('assign_coord') ? 'Assigning...' : 'Assign Event'}
                        </Button>
                      </form>
                    </div>

                    <div className="space-y-2">
                      <h4 className="m-0 text-sm font-semibold text-foreground">Staff Directory</h4>
                      <div className={TABLE_WRAPPER_CLASS}>
                        <table className={TABLE_CLASS} aria-label="Staff accounts directory">
                          <thead className={THEAD_CLASS}>
                            <tr>
                              <th scope="col" className={TH_CLASS}>Email</th>
                              <th scope="col" className={TH_CLASS}>Name</th>
                              <th scope="col" className={TH_CLASS}>Role</th>
                              <th scope="col" className={TH_CLASS}>Status</th>
                              <th scope="col" className={TH_CLASS}>Action</th>
                            </tr>
                          </thead>
                          <tbody className={TBODY_CLASS}>
                            {staffData.staff.map((s) => (
                              <tr key={s.id} className={ROW_HOVER_CLASS}>
                                <td className={TD_CLASS}>{s.email}</td>
                                <td className={`${TD_CLASS} font-medium`}>{s.full_name}</td>
                                <td className={TD_CLASS}><Badge variant="secondary">{s.role}</Badge></td>
                                <td className={TD_CLASS}>
                                  <Badge variant={s.is_active ? 'success' : 'danger'}>
                                    {s.is_active ? 'Active' : 'Disabled'}
                                  </Badge>
                                </td>
                                <td className={TD_CLASS}>
                                  {s.role !== 'super_admin' && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      aria-label={`${s.is_active ? 'Deactivate' : 'Reactivate'} ${s.email}`}
                                      disabled={isBusy(`toggle_user_${s.id}`)}
                                      onClick={() => handleToggleActive(s)}
                                    >
                                      {s.is_active ? 'Deactivate' : 'Reactivate'}
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {staffData.staff.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                                  No staff accounts returned.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="m-0 text-sm font-semibold text-foreground">Coordinator Assignments</h4>
                      <div className={TABLE_WRAPPER_CLASS}>
                        <table className={TABLE_CLASS} aria-label="Coordinator arena assignments">
                          <thead className={THEAD_CLASS}>
                            <tr>
                              <th scope="col" className={TH_CLASS}>Coordinator</th>
                              <th scope="col" className={TH_CLASS}>Competition</th>
                              <th scope="col" className={TH_CLASS}>Action</th>
                            </tr>
                          </thead>
                          <tbody className={TBODY_CLASS}>
                            {staffData.assignments.map((a) => (
                              <tr key={a.id} className={ROW_HOVER_CLASS}>
                                <td className={TD_CLASS}>{a.coordinator?.email || a.coordinator_id}</td>
                                <td className={`${TD_CLASS} font-medium`}>{a.competition?.title || a.competition_id}</td>
                                <td className={TD_CLASS}>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    aria-label={`Remove ${a.coordinator?.email || a.coordinator_id} from ${a.competition?.title || a.competition_id}`}
                                    disabled={isBusy(`remove_assign_${a.id}`)}
                                    onClick={() => handleRemoveAssignment(a.id)}
                                  >
                                    Remove
                                  </Button>
                                </td>
                              </tr>
                            ))}
                            {staffData.assignments.length === 0 && (
                              <tr>
                                <td colSpan={3} className="px-4 py-6 text-center text-sm text-muted-foreground">
                                  No coordinator competition assignments yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSection === 'audit' && (
              <Card className="min-w-0">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">Audit History</CardTitle>
                    <CardDescription>
                      Immutable administrative, verification, and staff action records from PostgreSQL.
                    </CardDescription>
                  </div>
                  <div className="w-full sm:w-64">
                    <select
                      aria-label="Filter audit logs by action"
                      className="admin-select"
                      value={auditActionFilter}
                      onChange={(e) => {
                        setAuditActionFilter(e.target.value);
                        setAuditPage(1);
                      }}
                    >
                      <option value="">All Actions</option>
                      <option value="PAYMENT_VERIFIED">Payment Verified</option>
                      <option value="PAYMENT_REJECTED">Payment Rejected</option>
                      <option value="PAYMENT_UTR_SUBMITTED">Payment UTR Submitted</option>
                      <option value="REGISTRATION_CREATED">Registration Created</option>
                      <option value="COMPETITION_UPDATED">Competition Updated</option>
                      <option value="TARIFF_UPDATED">Tariff Updated</option>
                      <option value="ROLE_UPDATED">Role Updated</option>
                      <option value="STAFF_DEACTIVATED">Staff Deactivated</option>
                      <option value="STAFF_REACTIVATED">Staff Reactivated</option>
                      <option value="COORDINATOR_ASSIGNED">Coordinator Assigned</option>
                      <option value="COORDINATOR_UNASSIGNED">Coordinator Unassigned</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={TABLE_WRAPPER_CLASS}>
                    <table className={TABLE_CLASS} aria-label="Administrative audit history">
                      <thead className={THEAD_CLASS}>
                        <tr>
                          <th scope="col" className={TH_CLASS}>Timestamp</th>
                          <th scope="col" className={TH_CLASS}>Role</th>
                          <th scope="col" className={TH_CLASS}>Action</th>
                          <th scope="col" className={TH_CLASS}>Target</th>
                          <th scope="col" className={TH_CLASS}>Details</th>
                        </tr>
                      </thead>
                      <tbody className={TBODY_CLASS}>
                        {auditLogs.map((log) => (
                          <tr key={log.id} className={ROW_HOVER_CLASS}>
                            <td className={`${TD_CLASS} whitespace-nowrap text-xs text-muted-foreground`}>
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td className={TD_CLASS}><Badge variant="secondary">{log.actor_role}</Badge></td>
                            <td className={`${TD_CLASS} font-mono text-xs`}>{log.action}</td>
                            <td className={TD_CLASS}>{log.target_table}</td>
                            <td className={`${TD_CLASS} font-mono text-xs text-muted-foreground break-all`}>
                              {JSON.stringify(log.details)}
                            </td>
                          </tr>
                        ))}
                        {auditLogs.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                              No audit entries recorded yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="tabular-nums">
                      Page {auditPagination.page} of {auditPagination.total_pages} ({auditPagination.total} total)
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={loading || auditPagination.page <= 1}
                        onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                      >
                        Prev
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={loading || auditPagination.page >= auditPagination.total_pages}
                        onClick={() => setAuditPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === 'security' && (
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle className="text-lg">Security &amp; Multi-Factor Authentication</CardTitle>
                  <CardDescription>
                    Manage official Supabase TOTP two-factor authentication for your privileged account without locking out existing access during staged rollout.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {mfaErr && <AdminNotice variant="error">{mfaErr}</AdminNotice>}
                  {mfaMsg && <AdminNotice variant="success">{mfaMsg}</AdminNotice>}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Session Assurance Level
                        </span>
                        <Badge variant={aal?.currentLevel === 'aal2' ? 'success' : 'warning'}>
                          {(aal?.currentLevel || 'aal1').toUpperCase()}
                        </Badge>
                      </div>
                      <p className="m-0 text-sm font-medium text-foreground">
                        {aal?.currentLevel === 'aal2'
                          ? 'Verified with Password/OAuth + TOTP Authenticator'
                          : 'Single-factor session (Password or Google OAuth)'}
                      </p>
                      <p className="m-0 text-xs text-muted-foreground">
                        When TOTP is enrolled, admin APIs enforce server-side AAL2 verification.
                      </p>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Enrolled TOTP Factors
                        </span>
                        <Badge variant={mfaEnrolled ? 'success' : 'secondary'}>
                          {mfaFactors.length} active
                        </Badge>
                      </div>
                      <p className="m-0 text-sm font-medium text-foreground">
                        {mfaEnrolled
                          ? 'TOTP hardware/app authenticator active'
                          : 'No TOTP authenticator enrolled yet'}
                      </p>
                      <p className="m-0 text-xs text-muted-foreground">
                        Required for super_admin and admin accounts before running strict MFA cutover (enable_strict_mfa.sql / ENFORCE_PRIVILEGED_MFA). GoTrue enforces AAL2 to unenroll factors API-side, and strict mode drops PostgREST &amp; Edge access on AAL1 even if a factor is removed directly.
                      </p>
                    </div>
                  </div>

                  {!mfaEnrollData ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <Button type="button" onClick={handleStartMfaEnroll} disabled={mfaBusy} className="gap-2">
                        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                        <span>{mfaBusy ? 'Preparing QR...' : 'Enroll TOTP Authenticator'}</span>
                      </Button>
                    </div>
                  ) : (
                    <form
                      onSubmit={handleConfirmMfaEnroll}
                      className="rounded-lg border border-border bg-muted/30 p-4 space-y-4 max-w-md"
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
                        <span>Scan QR in Authenticator App</span>
                      </div>
                      {mfaEnrollQr && (
                        <div className="inline-block rounded-lg border border-border bg-white p-2">
                          <img src={mfaEnrollQr} alt="TOTP MFA Enrollment QR Code" className="h-44 w-44 block" />
                        </div>
                      )}
                      {mfaEnrollData.totp?.secret && (
                        <div className="text-xs text-muted-foreground">
                          Manual secret:{' '}
                          <code className="rounded bg-muted px-1.5 py-0.5 text-foreground select-all">
                            {mfaEnrollData.totp.secret}
                          </code>
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <Label htmlFor="enroll-totp-code">Enter 6-Digit Verification Code</Label>
                        <Input
                          id="enroll-totp-code"
                          inputMode="numeric"
                          pattern="[0-9]{6}"
                          autoComplete="one-time-code"
                          required
                          placeholder="123456"
                          value={mfaEnrollCode}
                          onChange={(e) => setMfaEnrollCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={mfaBusy}>
                          {mfaBusy ? 'Verifying...' : 'Confirm & Activate TOTP'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setMfaEnrollData(null);
                            setMfaEnrollQr('');
                            setMfaEnrollCode('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}

                  {mfaEnrolled && (
                    <div className={TABLE_WRAPPER_CLASS}>
                      <table className={TABLE_CLASS} aria-label="Enrolled TOTP MFA factors">
                        <thead className={THEAD_CLASS}>
                          <tr>
                            <th scope="col" className={TH_CLASS}>Factor</th>
                            <th scope="col" className={TH_CLASS}>Type</th>
                            <th scope="col" className={TH_CLASS}>Status</th>
                            <th scope="col" className={TH_CLASS}>Action</th>
                          </tr>
                        </thead>
                        <tbody className={TBODY_CLASS}>
                          {mfaFactors.map((factor) => (
                            <tr key={factor.id} className={ROW_HOVER_CLASS}>
                              <td className={`${TD_CLASS} font-medium`}>{factor.friendly_name || 'Authenticator App'}</td>
                              <td className={`${TD_CLASS} uppercase text-xs`}>{factor.factor_type}</td>
                              <td className={TD_CLASS}><Badge variant="success">{factor.status}</Badge></td>
                              <td className={TD_CLASS}>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  aria-label={`Remove ${factor.friendly_name || 'Authenticator App'}`}
                                  disabled={mfaBusy}
                                  onClick={() => handleRemoveMfaFactor(factor.id)}
                                >
                                  Remove
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </App1>

      {/* Theme-Aware Registration & Payment Reconciliation Drawer */}
      <Sheet open={Boolean(selectedReg)} onOpenChange={(open) => !open && !verifying && setSelectedReg(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Reconcile Registration • {selectedReg?.pass_code}</SheetTitle>
            <SheetDescription>
              Verify delegate details and reconcile submitted 12-digit UTR against bank/UPI credits.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 space-y-5 text-sm">
            {verifyError && <AdminNotice variant="error">{verifyError}</AdminNotice>}

            {selectedReg && (
              <>
                <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-1.5">
                  <div>
                    <span className="text-muted-foreground">Delegate:</span>{' '}
                    <strong className="text-foreground">{selectedReg.full_name}</strong> ({selectedReg.roll_number})
                  </div>
                  <div>
                    <span className="text-muted-foreground">College:</span> {selectedReg.college} • {selectedReg.branch}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>{' '}
                    <span className="tabular-nums">{selectedReg.phone}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expected Server Total:</span>{' '}
                    <strong className="tabular-nums text-foreground">₹{selectedReg.computed_total_inr}</strong>
                  </div>
                </div>

                {sortPaymentsNewestFirst(selectedReg.payments).length > 0 && (
                  <div className="space-y-2.5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Payment Attempts
                    </div>
                    {sortPaymentsNewestFirst(selectedReg.payments).map((p) => (
                      <div key={p.id} className="rounded-lg border border-border bg-card p-3 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span>
                            UTR: <code className="font-mono text-xs font-semibold">{p.utr_number}</code> •{' '}
                            <span className="tabular-nums font-medium">₹{p.amount_inr}</span>
                          </span>
                          <Badge variant={getStatusBadgeVariant(p.status)}>{p.status}</Badge>
                        </div>
                        {p.rejection_reason && (
                          <div className="text-xs text-[hsl(var(--status-danger-fg))]">
                            Reason: {p.rejection_reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {sortPaymentsNewestFirst(selectedReg.payments).some((p) => p.status === 'PENDING_VERIFICATION') && (
                  <div className="border-t border-border pt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin-confirmed-amount">Confirmed Bank / UPI Statement Amount (₹)</Label>
                      <Input
                        id="admin-confirmed-amount"
                        type="number"
                        min={1}
                        step={1}
                        value={confirmedAmount}
                        onChange={(e) => setConfirmedAmount(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      className="w-full"
                      disabled={verifying}
                      onClick={() => handleVerifyDecision('VERIFIED')}
                    >
                      {verifying ? 'Processing...' : 'Approve & Issue Verified Pass'}
                    </Button>

                    <div className="space-y-2 pt-2 border-t border-border">
                      <Label htmlFor="admin-rejection-reason">Rejection Reason (Required to Reject)</Label>
                      <Input
                        id="admin-rejection-reason"
                        placeholder="e.g. UTR not found in bank statement / amount mismatch"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full"
                      disabled={verifying}
                      onClick={() => handleVerifyDecision('REJECTED')}
                    >
                      {verifying ? 'Processing...' : 'Reject UTR Submission'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Competition & Accommodation Tariff Editor Drawer */}
      <Sheet
        open={Boolean(editingComp || editingAccom)}
        onOpenChange={(open) => {
          const savingCatalog =
            (editingComp && isBusy(`save_comp_${editingComp.id}`)) ||
            (editingAccom && isBusy(`save_accom_${editingAccom.id}`));
          if (!open && !savingCatalog) {
            setEditingComp(null);
            setEditingAccom(null);
            setCatalogSaveError('');
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingComp ? `Edit Competition • ${editingComp.title}` : `Edit Plan • ${editingAccom?.name || ''}`}
            </SheetTitle>
            <SheetDescription>
              {editingComp
                ? 'Update venue and event schedule. Fee changes require Super Admin privileges.'
                : 'Update server-enforced institutional accommodation tariff (Super Admin only).'}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 space-y-4 text-sm">
            {catalogSaveError && <AdminNotice variant="error">{catalogSaveError}</AdminNotice>}

            {editingComp && (
              <form onSubmit={handleSaveCompetition} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-comp-venue">Venue</Label>
                  <Input
                    id="edit-comp-venue"
                    required
                    minLength={2}
                    maxLength={160}
                    value={editingComp.venue}
                    onChange={(e) => setEditingComp((c) => ({ ...c, venue: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-comp-date">Event Date</Label>
                  <Input
                    id="edit-comp-date"
                    required
                    minLength={2}
                    maxLength={80}
                    value={editingComp.event_date}
                    onChange={(e) => setEditingComp((c) => ({ ...c, event_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-comp-time">Event Time</Label>
                  <Input
                    id="edit-comp-time"
                    required
                    minLength={2}
                    maxLength={40}
                    value={editingComp.event_time}
                    onChange={(e) => setEditingComp((c) => ({ ...c, event_time: e.target.value }))}
                  />
                </div>

                {role === 'super_admin' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="edit-comp-fee">Fee (INR)</Label>
                      <Input
                        id="edit-comp-fee"
                        type="number"
                        min={0}
                        max={25000}
                        step={1}
                        required
                        value={editingComp.fee_inr}
                        onChange={(e) => setEditingComp((c) => ({ ...c, fee_inr: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-comp-fee-type">Fee Type</Label>
                      <select
                        id="edit-comp-fee-type"
                        className="admin-select"
                        value={editingComp.fee_type}
                        onChange={(e) => setEditingComp((c) => ({ ...c, fee_type: e.target.value }))}
                      >
                        <option value="per_member">per_member</option>
                        <option value="per_team">per_team</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <AdminNotice variant="info">
                    Fee: ₹{editingComp.fee_inr} ({editingComp.fee_type}). Only Super Admin can modify pricing.
                  </AdminNotice>
                )}

                <div className="flex gap-2 pt-2">
                  <Button type="submit" className="flex-1" disabled={isBusy(`save_comp_${editingComp.id}`)}>
                    {isBusy(`save_comp_${editingComp.id}`) ? 'Saving...' : 'Save Competition'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isBusy(`save_comp_${editingComp.id}`)}
                    onClick={() => setEditingComp(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {editingAccom && (
              <form onSubmit={handleSaveAccommodation} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-accom-price">Tariff / Person (INR)</Label>
                  <Input
                    id="edit-accom-price"
                    type="number"
                    min={0}
                    max={10000}
                    step={1}
                    required
                    value={editingAccom.price_per_person_inr}
                    onChange={(e) =>
                      setEditingAccom((a) => ({ ...a, price_per_person_inr: e.target.value }))
                    }
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" className="flex-1" disabled={isBusy(`save_accom_${editingAccom.id}`)}>
                    {isBusy(`save_accom_${editingAccom.id}`) ? 'Saving...' : 'Save Tariff'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isBusy(`save_accom_${editingAccom.id}`)}
                    onClick={() => setEditingAccom(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Admin;
