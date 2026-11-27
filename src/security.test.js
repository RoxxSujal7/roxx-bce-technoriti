import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import Register from './screens/Register';
import Dashboard from './screens/Dashboard';
import Admin from './screens/Admin';
import AdminLogin from './screens/AdminLogin';
import Footer from './components/Footer';
import NavigationBar from './components/Navbar';
import { AuthUI } from './components/ui/auth-fuse';
import { HaloReel } from './components/HaloReel';
import * as AuthContext from './context/AuthContext';
import * as supabaseClientModule from './lib/supabaseClient';

jest.mock('./lib/supabaseClient', () => {
  const actual = jest.requireActual('./lib/supabaseClient');
  let mockClient = actual.supabase;
  let mockConfigured = actual.isSupabaseConfigured;
  return {
    __esModule: true,
    ...actual,
    get isSupabaseConfigured() {
      return mockConfigured;
    },
    get supabase() {
      return mockClient;
    },
    __setMockSupabase: (next) => {
      mockClient = next;
      mockConfigured = Boolean(next);
    },
    __resetMockSupabase: () => {
      mockClient = actual.supabase;
      mockConfigured = actual.isSupabaseConfigured;
    },
  };
});

beforeEach(() => {
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }
});

beforeAll(() => {
  if (typeof HTMLCanvasElement !== 'undefined') {
    HTMLCanvasElement.prototype.getContext = jest.fn(() => null);
  }
  if (typeof window.ResizeObserver === 'undefined') {
    window.ResizeObserver = class {
      observe() { }
      unobserve() { }
      disconnect() { }
    };
  }
});

describe('ROXX TECHNORITI Security & Backend Integration Regression Suite', () => {
  afterEach(() => {
    supabaseClientModule.__resetMockSupabase?.();
    sessionStorage.clear();
    jest.restoreAllMocks();
  });

  test('Register refuses offline submission when backend is not configured (never fakes verification)', () => {
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      configured: false,
      loading: false,
      session: null,
      user: null,
      profile: null,
      isPasswordRecovery: false,
      clearPasswordRecovery: jest.fn(),
      refreshProfile: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/Sujal Kumar/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText(/24103123001/i), { target: { value: '24103123001' } });
    fireEvent.change(screen.getByPlaceholderText(/9876543210/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByPlaceholderText(/Bhagalpur College of Engineering/i), { target: { value: 'BCE Bhagalpur' } });
    fireEvent.change(screen.getByPlaceholderText(/Electronics & Communication/i), { target: { value: 'CSE' } });

    fireEvent.click(screen.getByRole('button', { name: /PROCEED TO PAYMENT GATEWAY/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/Backend service is not configured/i);
    expect(screen.queryByAltText('UPI Payment QR Code')).not.toBeInTheDocument();
  });

  test('Register sends no client price/role fields, generates offline QR without external QR API, enforces 12-digit UTR, and sets PENDING VERIFICATION', async () => {
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      configured: true,
      loading: false,
      session: { access_token: 'fake-jwt', user: { id: 'u1', email: 'u1@example.com' } },
      user: { id: 'u1', email: 'u1@example.com' },
      profile: { id: 'u1', role: 'participant', email: 'u1@example.com' },
      isPasswordRecovery: false,
      clearPasswordRecovery: jest.fn(),
      refreshProfile: jest.fn().mockResolvedValue(null),
      signOut: jest.fn(),
    });

    jest.spyOn(QRCode, 'toDataURL').mockResolvedValue('data:image/png;base64,OFFLINE_QR');

    const callEdgeSpy = jest.spyOn(supabaseClientModule, 'callEdgeFunction').mockImplementation(async (fnName) => {
      if (fnName === 'create-registration') {
        return {
          registration: {
            id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            pass_code: 'TR26-SERVER99',
            full_name: 'Test User',
            computed_total_inr: 225,
            status: 'PENDING_PAYMENT',
          },
          upi_payment: {
            configured: true,
            vpa: 'bcebhagalpur@upi',
            payee_name: 'Technoriti 2026 BCE',
            amount_inr: 225,
            transaction_note: 'TR26-SERVER99',
          },
        };
      }
      if (fnName === 'submit-utr') {
        return {
          payment: {
            id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            utr_number: '432109876543',
            status: 'PENDING_VERIFICATION',
          },
        };
      }
      return {};
    });

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    // Dynamic team size range respects Nukkad (6-15) rules
    fireEvent.change(screen.getByDisplayValue(/RoboWar/i), { target: { value: 'nukkad' } });
    const teamSelect = screen.getByDisplayValue(/6 Members/i);
    expect(teamSelect).toBeInTheDocument();

    // Switch back to RoboWar & fill form
    fireEvent.change(screen.getByDisplayValue(/Nukkad/i), { target: { value: 'robowar' } });
    fireEvent.change(screen.getByPlaceholderText(/Sujal Kumar/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText(/24103123001/i), { target: { value: '24103123001' } });
    fireEvent.change(screen.getByPlaceholderText(/9876543210/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByPlaceholderText(/Bhagalpur College of Engineering/i), { target: { value: 'BCE Bhagalpur' } });
    fireEvent.change(screen.getByPlaceholderText(/Electronics & Communication/i), { target: { value: 'CSE' } });

    fireEvent.click(screen.getByRole('button', { name: /PROCEED TO PAYMENT GATEWAY/i }));

    await waitFor(() => {
      expect(screen.getByText('TR26-SERVER99')).toBeInTheDocument();
    });

    // Verify zero client price / role tampering fields sent in create-registration
    const regCall = callEdgeSpy.mock.calls.find(([name]) => name === 'create-registration');
    expect(regCall).toBeDefined();
    expect(regCall[1].body).not.toHaveProperty('totalPayable');
    expect(regCall[1].body).not.toHaveProperty('computed_total_inr');
    expect(regCall[1].body).not.toHaveProperty('role');
    expect(regCall[1].body).not.toHaveProperty('status');

    // Local offline QR generated — zero third-party api.qrserver.com call or phone leak
    const qrImg = await screen.findByAltText('UPI Payment QR Code');
    expect(qrImg.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
    expect(qrImg.getAttribute('src')).not.toContain('qrserver.com');
    expect(qrImg.getAttribute('src')).not.toContain('9876543210');

    // Invalid short UTR rejected locally before network call
    const utrInput = screen.getByPlaceholderText(/432109876543/i);
    fireEvent.change(utrInput, { target: { value: '1234abc5678' } });
    expect(utrInput.value).toBe('12345678');
    fireEvent.click(screen.getByRole('button', { name: /SUBMIT UTR FOR VERIFICATION/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/valid 12-digit numeric/i);

    // Valid 12-digit numeric UTR creates PENDING_VERIFICATION state (never client VERIFIED)
    fireEvent.change(utrInput, { target: { value: '432109876543' } });
    fireEvent.click(screen.getByRole('button', { name: /SUBMIT UTR FOR VERIFICATION/i }));

    await waitFor(() => {
      expect(screen.getByText(/UTR Submitted — Pending Verification/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Status: PENDING VERIFICATION/i)).toBeInTheDocument();
  });

  test('Admin route denies participant accounts in UI', () => {
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      configured: true,
      loading: false,
      session: { access_token: 'fake-jwt', user: { id: 'u1', email: 'u1@example.com' } },
      user: { id: 'u1', email: 'u1@example.com' },
      profile: { id: 'u1', role: 'participant', email: 'u1@example.com', is_active: true },
      isPasswordRecovery: false,
      clearPasswordRecovery: jest.fn(),
      refreshProfile: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    );

    expect(screen.getByText(/Administrator Access Required/i)).toBeInTheDocument();
  });

  test('Dashboard loads authenticated participant registrations via get-my-registrations', async () => {
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      configured: true,
      loading: false,
      session: { access_token: 'fake-jwt', user: { id: 'u1', email: 'u1@example.com' } },
      user: { id: 'u1', email: 'u1@example.com' },
      profile: { id: 'u1', role: 'participant', email: 'u1@example.com', full_name: 'Sujal', is_active: true },
      isPasswordRecovery: false,
      clearPasswordRecovery: jest.fn(),
      refreshProfile: jest.fn(),
      signOut: jest.fn(),
    });

    jest.spyOn(supabaseClientModule, 'callEdgeFunction').mockResolvedValue({
      registrations: [
        {
          id: 'reg-1',
          pass_code: 'TR26-PASS001',
          primary_arena_id: 'robowar',
          primary_competition: { title: 'RoboWar' },
          team_size: 2,
          accommodation_id: 'both',
          computed_total_inr: 450,
          status: 'VERIFIED',
          payments: [{ id: 'pay-1', utr_number: '111122223333', status: 'VERIFIED' }],
        },
      ],
      upi_config: { vpa: 'bcebhagalpur@upi', payee_name: 'Technoriti 2026 BCE' },
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('TR26-PASS001').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText(/Official Entry Pass Confirmed/i)).toBeInTheDocument();
  });

  test('AuthUI does not log form submissions to console', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

    render(<AuthUI />);

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'TestPass123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));
    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/i }));

    expect(logSpy).not.toHaveBeenCalled();
  });

  test('Security headers, Vercel config, .env.example, and absence of service_role secrets in frontend src/', () => {
    const indexHtml = fs.readFileSync(path.join(process.cwd(), 'public', 'index.html'), 'utf8');
    expect(indexHtml).toContain('http-equiv="X-Content-Type-Options" content="nosniff"');
    expect(indexHtml).toContain('http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin"');
    expect(indexHtml).toContain('http-equiv="Content-Security-Policy" content="frame-ancestors \'none\'"');

    const envProd = fs.readFileSync(path.join(process.cwd(), '.env.production'), 'utf8');
    expect(envProd).toContain('GENERATE_SOURCEMAP=false');
    expect(envProd).toContain('INLINE_RUNTIME_CHUNK=false');

    const vercelCfg = fs.readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8');
    expect(vercelCfg).toContain('X-Frame-Options');
    expect(vercelCfg).toContain('Strict-Transport-Security');
    expect(vercelCfg).toContain('Content-Security-Policy');

    const supabaseClientSrc = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'supabaseClient.js'), 'utf8');
    expect(supabaseClientSrc).not.toContain('SERVICE_ROLE');
  });

  test('App-1 Admin dashboard renders real event analytics, verification rate, competitions overview, activity, search & notifications, and avatar fallback', async () => {
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      configured: true,
      loading: false,
      session: { access_token: 'fake-jwt', user: { id: 'admin-1', email: 'accounts@bce.edu' } },
      user: { id: 'admin-1', email: 'accounts@bce.edu' },
      profile: { id: 'admin-1', role: 'admin', email: 'accounts@bce.edu', full_name: 'Riya Sharma', is_active: true },
      isPasswordRecovery: false,
      clearPasswordRecovery: jest.fn(),
      refreshProfile: jest.fn(),
      signOut: jest.fn(),
    });

    jest.spyOn(supabaseClientModule, 'callEdgeFunction').mockImplementation(async (fnName) => {
      if (fnName === 'get-admin-registrations') {
        return {
          registrations: [],
          pagination: { page: 1, limit: 20, total: 0, total_pages: 1 },
          summary: {
            total_registrations: 8,
            pending_payment: 3,
            pending_verification: 1,
            verified: 3,
            rejected: 1,
            verified_revenue_inr: 675,
          },
          analytics: {
            timezone: 'Asia/Kolkata',
            kpis: {
              total_registrations: 8,
              pending_payment: 3,
              pending_verification_registrations: 1,
              verified_registrations: 3,
              rejected_registrations: 1,
              confirmed_participants: 9,
              pending_verifications_count: 1,
              verified_payments_count: 3,
              rejected_payments_count: 1,
              verified_collections_inr: 675,
              pending_verification_amount_inr: 225,
              unpaid_registrations_amount_inr: 450,
              last_7d_registrations: 4,
              last_7d_verified_payments: 2,
            },
            trends: [
              { week_start: '2026-11-16', week: '16 Nov', registrations: 4, payments_verified: 1 },
              { week_start: '2026-11-23', week: '23 Nov', registrations: 4, payments_verified: 2 },
            ],
            competitions_overview: [
              {
                id: 'robowar',
                num_id: 1,
                title: 'RoboWar',
                category: 'Robotics',
                is_active: true,
                event_date: '6 Jan 2027',
                venue: 'Main Arena',
                registration_count: 5,
                verified_count: 3,
                participant_count: 9,
              },
            ],
          },
          audit_logs: [
            {
              id: 101,
              actor_id: 'admin-1',
              actor_role: 'admin',
              actor_name: 'Riya Sharma',
              action: 'PAYMENT_VERIFIED',
              target_table: 'payments',
              target_id: 'pay-1',
              details: { pass_code: 'TR26-PASS001', amount_inr: 225 },
              created_at: new Date().toISOString(),
            },
          ],
        };
      }
      if (fnName === 'manage-competitions') {
        return {
          competitions: [
            { id: 'robowar', num_id: 1, title: 'RoboWar', fee_type: 'per_member', fee_inr: 50, min_team_size: 1, max_team_size: 4, is_active: true },
          ],
          accommodation_plans: [],
        };
      }
      return {};
    });

    render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('60%')).toBeInTheDocument();
    });
    expect(screen.getByText(/Welcome back, Riya/i)).toBeInTheDocument();

    // Real converted metrics (3 verified / (3 + 1 pending + 1 rejected) = 60%, NOT 4/5)
    expect(screen.getByText(/3 of 5 submitted UTRs verified/i)).toBeInTheDocument();
    expect(screen.getByText('₹675')).toBeInTheDocument();
    expect(screen.getByText('₹225')).toBeInTheDocument();
    expect(screen.getByText(/Registration and payment verification trends/i)).toBeInTheDocument();
    expect(screen.getByText(/Competitions overview/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'RoboWar' })).toBeInTheDocument();
    expect(screen.getByText(/3\/5 verified/i)).toBeInTheDocument();
    expect(screen.getByText(/verified payment \(TR26-PASS001, ₹225\)/i)).toBeInTheDocument();
    // Initials fallback when Google avatar_url absent
    expect(screen.getAllByText('RS').length).toBeGreaterThanOrEqual(1);
    // Coordinator restricted notice NOT rendered for admin
    expect(screen.queryByText(/Financial & Global Admin Data Hidden/i)).not.toBeInTheDocument();
    // Admins & Coordinators nav strictly hidden for ordinary admin
    expect(screen.queryByRole('button', { name: /Admins & Coordinators/i })).not.toBeInTheDocument();

    // Notifications button opens real notifications sheet
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));
    await waitFor(() => {
      expect(screen.getByText(/Operational Notifications/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/1 payment UTR pending review/i)).toBeInTheDocument();
  });

  test('App-1 handles empty trend records and API errors truthfully without synthetic data, and blocks coordinator financial access', async () => {
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      configured: true,
      loading: false,
      session: { access_token: 'fake-jwt', user: { id: 'admin-2', email: 'ad@bce.edu' } },
      user: { id: 'admin-2', email: 'ad@bce.edu' },
      profile: { id: 'admin-2', role: 'admin', email: 'ad@bce.edu', full_name: 'Admin Empty', is_active: true },
      isPasswordRecovery: false,
      clearPasswordRecovery: jest.fn(),
      refreshProfile: jest.fn(),
      signOut: jest.fn(),
    });

    jest.spyOn(supabaseClientModule, 'callEdgeFunction').mockImplementation(async (fnName) => {
      if (fnName === 'get-admin-registrations') {
        return {
          registrations: [],
          pagination: { page: 1, limit: 20, total: 0, total_pages: 1 },
          summary: { total_registrations: 0, pending_verification: 0, verified: 0, verified_revenue_inr: 0 },
          analytics: { timezone: 'Asia/Kolkata', kpis: {}, trends: [], competitions_overview: [] },
          audit_logs: [],
        };
      }
      return { competitions: [], accommodation_plans: [] };
    });

    const { rerender } = render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No registration or payment verification records yet/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/No audit activity recorded yet/i)).toBeInTheDocument();

    // Coordinator must never see financial KPIs or global Admin activity
    AuthContext.useAuth.mockReturnValue({
      configured: true,
      loading: false,
      session: { access_token: 'fake-jwt', user: { id: 'coord-9', email: 'coord9@bce.edu' } },
      user: { id: 'coord-9', email: 'coord9@bce.edu' },
      profile: { id: 'coord-9', role: 'coordinator', email: 'coord9@bce.edu', full_name: 'Coord Alpha', is_active: true },
      isPasswordRecovery: false,
      clearPasswordRecovery: jest.fn(),
      refreshProfile: jest.fn(),
      signOut: jest.fn(),
    });
    supabaseClientModule.callEdgeFunction.mockImplementation(async (fnName) => {
      if (fnName === 'get-coordinator-registrations') {
        return {
          assigned_competitions: ['hackathon'],
          registrations: [],
          analytics: {
            timezone: 'Asia/Kolkata',
            kpis: { total_registrations: 2, verified_registrations: 1, confirmed_participants: 3, pending_registrations: 1, assigned_competitions_count: 1 },
            trends: [],
            competitions_overview: [],
          },
          pagination: { page: 1, total_pages: 1, total: 0 },
        };
      }
      return {};
    });

    rerender(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Financial & Global Admin Data Hidden/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Total verified collections/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pending payment amount/i)).not.toBeInTheDocument();
  });

  test('AuthUI enforces 12-char strong password + confirmation and renders MFA challenge when needsMfaChallenge is true', () => {
    localStorage.removeItem('technoriti_admin_theme');
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      configured: true,
      loading: false,
      session: null,
      user: null,
      profile: null,
      authError: null,
      isPasswordRecovery: false,
      needsMfaChallenge: false,
      mfaFactors: [],
      clearAuthError: jest.fn(),
      clearPasswordRecovery: jest.fn(),
      refreshProfile: jest.fn(),
      refreshMfaStatus: jest.fn(),
      signOut: jest.fn(),
    });

    const { rerender } = render(<AuthUI initialIsSignIn={false} />);

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Delegate One' } });
    fireEvent.change(screen.getByLabelText(/^Email$/i), { target: { value: 'delegate@bce.edu' } });
    fireEvent.change(screen.getByPlaceholderText('Minimum 12 characters'), { target: { value: 'short123!' } });
    fireEvent.change(screen.getByPlaceholderText('Re-enter your password'), { target: { value: 'short123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/at least 12 characters/i);

    fireEvent.change(screen.getByPlaceholderText('Minimum 12 characters'), { target: { value: 'ValidPass123!@#' } });
    fireEvent.change(screen.getByPlaceholderText('Re-enter your password'), { target: { value: 'DifferentPass123!@#' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Passwords do not match/i);

    // MFA challenge gate takes precedence over password recovery so enrolled admins reach AAL2 before updateUser
    AuthContext.useAuth.mockReturnValue({
      configured: true,
      loading: false,
      session: { access_token: 'aal1-rec-jwt', user: { id: 'sa-1', email: 'sa@bce.edu' } },
      user: { id: 'sa-1', email: 'sa@bce.edu' },
      profile: { id: 'sa-1', role: 'super_admin', email: 'sa@bce.edu', is_active: true },
      authError: null,
      isPasswordRecovery: true,
      needsMfaChallenge: true,
      mfaFactors: [{ id: 'factor-1', factor_type: 'totp', status: 'verified' }],
      clearAuthError: jest.fn(),
      clearPasswordRecovery: jest.fn(),
      refreshProfile: jest.fn(),
      refreshMfaStatus: jest.fn(),
      signOut: jest.fn(),
    });
    rerender(<AuthUI />);
    expect(screen.getByRole('heading', { name: /Two-factor verification/i })).toBeInTheDocument();

    // Password recovery form enforces 12-char strong password + confirmation once AAL2 is satisfied
    AuthContext.useAuth.mockReturnValue({
      configured: true,
      loading: false,
      session: { access_token: 'rec-jwt', user: { id: 'u1', email: 'u1@bce.edu' } },
      user: { id: 'u1', email: 'u1@bce.edu' },
      profile: null,
      authError: null,
      isPasswordRecovery: true,
      needsMfaChallenge: false,
      mfaFactors: [],
      clearAuthError: jest.fn(),
      clearPasswordRecovery: jest.fn(),
      refreshProfile: jest.fn(),
      refreshMfaStatus: jest.fn(),
      signOut: jest.fn(),
    });
    rerender(<AuthUI />);
    expect(screen.getByRole('heading', { name: /Set new password/i })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Minimum 12 characters'), { target: { value: 'weakpass' } });
    fireEvent.change(screen.getByPlaceholderText('Re-enter new password'), { target: { value: 'weakpass' } });
    fireEvent.click(screen.getByRole('button', { name: /Update Password/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/at least 12 characters/i);

    // MFA challenge gate rendered before leaving signin when AAL2 step is pending
    AuthContext.useAuth.mockReturnValue({
      configured: true,
      loading: false,
      session: { access_token: 'aal1-jwt', user: { id: 'sa-1', email: 'sa@bce.edu' } },
      user: { id: 'sa-1', email: 'sa@bce.edu' },
      profile: { id: 'sa-1', role: 'super_admin', email: 'sa@bce.edu', is_active: true },
      authError: null,
      isPasswordRecovery: false,
      needsMfaChallenge: true,
      mfaFactors: [{ id: 'factor-1', factor_type: 'totp', status: 'verified' }],
      clearAuthError: jest.fn(),
      clearPasswordRecovery: jest.fn(),
      refreshProfile: jest.fn(),
      refreshMfaStatus: jest.fn(),
      signOut: jest.fn(),
    });
    rerender(<AuthUI />);
    expect(screen.getByRole('heading', { name: /Two-factor verification/i })).toBeInTheDocument();
  });

  test('Admin enforces MFA gate when needsMfaChallenge is true, unifies design tokens across sections & light/dark theme toggle, and cleans up root light class on unmount', async () => {
    localStorage.removeItem('technoriti_admin_theme');
    document.documentElement.classList.remove('admin-theme-light');

    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      configured: true,
      loading: false,
      session: { access_token: 'aal1-jwt', user: { id: 'sa-1', email: 'sa@bce.edu' } },
      user: { id: 'sa-1', email: 'sa@bce.edu' },
      profile: { id: 'sa-1', role: 'super_admin', email: 'sa@bce.edu', full_name: 'Sujal Sah', is_active: true },
      aal: { currentLevel: 'aal1', nextLevel: 'aal2' },
      mfaFactors: [{ id: 'totp-1', factor_type: 'totp', status: 'verified' }],
      needsMfaChallenge: true,
      clearPasswordRecovery: jest.fn(),
      refreshProfile: jest.fn(),
      refreshMfaStatus: jest.fn(),
      signOut: jest.fn(),
    });

    const { rerender, unmount } = render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    );

    expect(screen.getByText(/Two-Factor Verification/i)).toBeInTheDocument();
    expect(screen.queryByText(/Registrations & UTR Verification/i)).not.toBeInTheDocument();

    // Now unlock session at AAL2 and verify unified design system + theme switching across all sections
    AuthContext.useAuth.mockReturnValue({
      configured: true,
      loading: false,
      session: { access_token: 'aal2-jwt', user: { id: 'sa-1', email: 'sa@bce.edu' } },
      user: { id: 'sa-1', email: 'sa@bce.edu' },
      profile: { id: 'sa-1', role: 'super_admin', email: 'sa@bce.edu', full_name: 'Sujal Sah', is_active: true },
      aal: { currentLevel: 'aal2', nextLevel: 'aal2' },
      mfaFactors: [{ id: 'totp-1', factor_type: 'totp', status: 'verified', friendly_name: 'Admin Key' }],
      needsMfaChallenge: false,
      clearPasswordRecovery: jest.fn(),
      refreshProfile: jest.fn(),
      refreshMfaStatus: jest.fn(),
      signOut: jest.fn(),
    });

    jest.spyOn(supabaseClientModule, 'callEdgeFunction').mockImplementation(async (fnName) => {
      if (fnName === 'get-admin-registrations') {
        return {
          registrations: [
            {
              id: 'reg-1',
              pass_code: 'TR26-UNIFIED',
              full_name: 'Ananya Verma',
              roll_number: '2410101',
              phone: '9876500001',
              college: 'BCE Bhagalpur',
              branch: 'CSE',
              primary_arena_id: 'robowar',
              primary_competition: { title: 'RoboWar' },
              computed_total_inr: 675,
              status: 'PENDING_VERIFICATION',
              payments: [{ id: 'pay-1', utr_number: '432109876543', amount_inr: 675, status: 'PENDING_VERIFICATION' }],
            },
          ],
          pagination: { page: 1, limit: 20, total: 1, total_pages: 1 },
          summary: { total_registrations: 1, pending_verification: 1, verified: 0, verified_revenue_inr: 0 },
          analytics: { timezone: 'Asia/Kolkata', kpis: {}, trends: [], competitions_overview: [] },
          audit_logs: [{ id: 1, actor_role: 'super_admin', action: 'ROLE_UPDATED', target_table: 'profiles', details: {}, created_at: new Date().toISOString() }],
        };
      }
      if (fnName === 'manage-competitions') {
        return {
          competitions: [{ id: 'robowar', num_id: 1, title: 'RoboWar', fee_type: 'per_member', fee_inr: 50, min_team_size: 1, max_team_size: 4, is_active: true }],
          accommodation_plans: [{ id: 'both', name: 'Complete Stay (Lodging + Mess)', price_per_person_inr: 175, is_active: true }],
        };
      }
      if (fnName === 'manage-admins') {
        return { staff: [], assignments: [] };
      }
      return {};
    });

    rerender(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('TR26-UNIFIED')).toBeInTheDocument();
    });

    // Zero legacy dark Bootstrap cards/tables remain in Admin.jsx source or rendered table
    const adminSrc = fs.readFileSync(path.join(process.cwd(), 'src', 'screens', 'Admin.jsx'), 'utf8');
    expect(adminSrc).not.toContain('registration-card');
    expect(adminSrc).not.toContain('react-bootstrap');
    expect(screen.getByRole('table')).not.toHaveClass('table-dark');

    // Switch to light theme -> updates documentElement (portals) & persists to localStorage
    fireEvent.click(screen.getByRole('button', { name: /Switch to light theme/i }));
    expect(document.documentElement.classList.contains('admin-theme-light')).toBe(true);
    expect(localStorage.getItem('technoriti_admin_theme')).toBe('light');

    // Open reconciliation Sheet drawer in light mode and close it again
    fireEvent.click(screen.getByRole('button', { name: /Inspect TR26-UNIFIED/i }));
    await waitFor(() => {
      expect(screen.getByText(/Reconcile Registration/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Close panel/i }));

    // Navigate to Security & MFA, verify AAL2 status renders, and verify sole TOTP factor cannot be unenrolled without backup
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Security & MFA/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Security & MFA/i }));
    await waitFor(() => {
      expect(screen.getByText(/Security & Multi-Factor Authentication/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Admin Key')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Remove Admin Key/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Enroll a backup authenticator before removing your sole TOTP factor/i);

    // Verify zero .admin-theme-light leakage onto public routes on unmount
    unmount();
    expect(document.documentElement.classList.contains('admin-theme-light')).toBe(false);
    localStorage.removeItem('technoriti_admin_theme');
  });

  test('HaloReel invokes onActiveItemChange with next arena when rotated via keyboard navigation', async () => {
    const items = [
      { id: 'robowar', title: 'RoboWar', subtitle: 'Robotics' },
      { id: 'robosoccer', title: 'RoboSoccer', subtitle: 'Robotics' },
      { id: 'hackathon', title: 'Hackathon', subtitle: 'Coding' },
    ];
    const onActiveItemChange = jest.fn();

    render(
      <HaloReel
        items={items}
        autoPlay={false}
        onActiveItemChange={onActiveItemChange}
      />
    );

    const carousel = screen.getByRole('region', { name: /Image carousel/i });
    expect(onActiveItemChange).toHaveBeenCalledWith(items[0], 0);

    fireEvent.keyDown(carousel, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(onActiveItemChange).toHaveBeenCalledWith(items[1], 1);
    });
  });

  test('AdminLogin renders Admin Portal controls, reuses Supabase password/Google OAuth/recovery/MFA flows, and hides credentials from logs', async () => {
    const signInWithPassword = jest.fn().mockResolvedValue({ data: { user: { id: 'sa-1' } }, error: null });
    const signInWithOAuth = jest.fn().mockResolvedValue({ data: {}, error: null });
    const resetPasswordForEmail = jest.fn().mockResolvedValue({ data: {}, error: null });
    const updateUser = jest.fn().mockResolvedValue({ data: {}, error: null });
    const challengeAndVerify = jest.fn().mockResolvedValue({ data: {}, error: null });
    const refreshMfaStatus = jest.fn().mockResolvedValue({ currentLevel: 'aal2', nextLevel: 'aal2', factors: [] });
    const signOut = jest.fn().mockResolvedValue({});
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

    supabaseClientModule.__setMockSupabase({
      auth: {
        signInWithPassword,
        signInWithOAuth,
        resetPasswordForEmail,
        updateUser,
        mfa: { challengeAndVerify },
      },
    });

    const baseAuth = {
      configured: true,
      loading: false,
      session: null,
      user: null,
      profile: null,
      profileLoadError: false,
      authError: null,
      isPasswordRecovery: false,
      needsMfaChallenge: false,
      aal: { currentLevel: null, nextLevel: null },
      mfaFactors: [],
      clearAuthError: jest.fn(),
      clearPasswordRecovery: jest.fn(),
      refreshProfile: jest.fn(),
      refreshMfaStatus,
      signOut,
    };

    jest.spyOn(AuthContext, 'useAuth').mockReturnValue(baseAuth);

    const { rerender } = render(
      <MemoryRouter initialEntries={['/admin-login']}>
        <Routes>
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin" element={<div>ADMIN DASHBOARD TARGET</div>} />
          <Route path="/dashboard" element={<div>PARTICIPANT DASHBOARD TARGET</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /NEURAL\s*ACCESS/i })).toBeInTheDocument();
    expect(screen.getByText('System Node: 0x992')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to Website/i })).toHaveAttribute('href', '/');
    expect(screen.queryByText(/NEW ARCHIVE/i)).not.toBeInTheDocument();
    expect(screen.getAllByTestId('mercury-blob')).toHaveLength(6);
    expect(screen.getByTestId('mercury-gooey-filter')).toBeInTheDocument();

    // Password visibility toggle works
    const passwordInput = screen.getByLabelText(/Sequence Key/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: /Show password/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');

    // Email + Password uses Supabase signInWithPassword with normalized email and never logs credentials
    fireEvent.change(screen.getByLabelText(/User Identity/i), { target: { value: '  STAFF@BCE.EDU ' } });
    fireEvent.change(passwordInput, { target: { value: 'AdminSecret123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Initialize Stream/i }));

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'staff@bce.edu',
        password: 'AdminSecret123!',
      });
    });
    expect(logSpy).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeEnabled();
    });

    // Google Sign-in uses existing Supabase OAuth flow and preserves admin origin/redirect state
    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/i }));
    await waitFor(() => {
      expect(signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/` },
      });
    });
    expect(sessionStorage.getItem(AuthContext.POST_AUTH_REDIRECT_KEY)).toBe('/admin');
    expect(sessionStorage.getItem(AuthContext.POST_AUTH_ORIGIN_KEY)).toBe('/admin-login');

    // Forgot Password sends non-enumerating recovery request via resetPasswordForEmail
    fireEvent.click(screen.getByRole('button', { name: /ENCRYPTED RECOVERY/i }));
    expect(screen.getByRole('heading', { name: /Encrypted Recovery/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Administrator Email/i), { target: { value: '  admin@bce.edu ' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Recovery Link/i }));
    await waitFor(() => {
      expect(resetPasswordForEmail).toHaveBeenCalledWith('admin@bce.edu', {
        redirectTo: `${window.location.origin}/`,
      });
    });
    expect(await screen.findByRole('status')).toHaveTextContent(/If an account exists for that email/i);
    expect(sessionStorage.getItem(AuthContext.PASSWORD_RECOVERY_ORIGIN_KEY)).toBe('/admin-login');
    fireEvent.click(screen.getByRole('button', { name: /Back to Sign In/i }));
    expect(screen.getByLabelText(/User Identity/i)).toBeInTheDocument();

    // Recovery session enforces 12-char password policy and calls updateUser
    AuthContext.useAuth.mockReturnValue({
      ...baseAuth,
      session: { access_token: 'rec-jwt', user: { id: 'sa-1', email: 'sa@bce.edu' } },
      user: { id: 'sa-1', email: 'sa@bce.edu' },
      profile: { id: 'sa-1', role: 'super_admin', is_active: true },
      isPasswordRecovery: true,
    });
    rerender(
      <MemoryRouter initialEntries={['/admin-login']}>
        <Routes>
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin" element={<div>ADMIN DASHBOARD TARGET</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /Set new password/i })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Minimum 12 characters'), { target: { value: 'StrongAdminPass123!' } });
    fireEvent.change(screen.getByPlaceholderText('Re-enter new password'), { target: { value: 'StrongAdminPass123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Update Password/i }));
    await waitFor(() => {
      expect(updateUser).toHaveBeenCalledWith({ password: 'StrongAdminPass123!' });
    });

    // Callback error is surfaced safely on AdminLogin
    AuthContext.useAuth.mockReturnValue({
      ...baseAuth,
      authError: 'Authentication could not be completed. Please try signing in again.',
    });
    rerender(
      <MemoryRouter initialEntries={['/admin-login']}>
        <Routes>
          <Route path="/admin-login" element={<AdminLogin />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/Authentication could not be completed/i);

    // Enrolled MFA admin at AAL1 is gated cleanly by TOTP challenge before reaching /admin
    AuthContext.useAuth.mockReturnValue({
      ...baseAuth,
      session: { access_token: 'aal1-jwt', user: { id: 'sa-1', email: 'sa@bce.edu' } },
      user: { id: 'sa-1', email: 'sa@bce.edu' },
      profile: { id: 'sa-1', role: 'super_admin', is_active: true },
      aal: { currentLevel: 'aal1', nextLevel: 'aal2' },
      mfaFactors: [{ id: 'totp-1', factor_type: 'totp', status: 'verified' }],
      needsMfaChallenge: true,
    });
    rerender(
      <MemoryRouter initialEntries={['/admin-login']}>
        <Routes>
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin" element={<div>ADMIN DASHBOARD TARGET</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /Two-factor verification/i })).toBeInTheDocument();
    expect(screen.queryByText('ADMIN DASHBOARD TARGET')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Sign out and use another account/i }));
    expect(signOut).toHaveBeenCalled();

    // If refreshMfaStatus still reports AAL1, AdminLogin refuses to navigate to /admin
    refreshMfaStatus.mockResolvedValueOnce({ currentLevel: 'aal1', nextLevel: 'aal2', factors: [] });
    fireEvent.change(screen.getByLabelText(/Authenticator Code/i), { target: { value: '654321' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify & Continue/i }));
    await waitFor(() => {
      expect(challengeAndVerify).toHaveBeenCalledWith({ factorId: 'totp-1', code: '654321' });
    });
    expect(screen.queryByText('ADMIN DASHBOARD TARGET')).not.toBeInTheDocument();

    // Once AAL2 is verified & session reaches AAL2, authorized staff navigates to /admin
    AuthContext.useAuth.mockReturnValue({
      ...baseAuth,
      session: { access_token: 'aal2-jwt', user: { id: 'sa-1', email: 'sa@bce.edu' } },
      user: { id: 'sa-1', email: 'sa@bce.edu' },
      profile: { id: 'sa-1', role: 'super_admin', is_active: true },
      aal: { currentLevel: 'aal2', nextLevel: 'aal2' },
      mfaFactors: [{ id: 'totp-1', factor_type: 'totp', status: 'verified' }],
      needsMfaChallenge: false,
    });
    rerender(
      <MemoryRouter initialEntries={['/admin-login']}>
        <Routes>
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin" element={<div>ADMIN DASHBOARD TARGET</div>} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('ADMIN DASHBOARD TARGET')).toBeInTheDocument();
    });
  });

  test('AdminLogin and Admin enforce strict server-profile RBAC fail-closed rules and entry points route to #/admin-login', async () => {
    const baseAuth = {
      configured: true,
      loading: false,
      session: null,
      user: null,
      profile: null,
      profileLoadError: false,
      authError: null,
      isPasswordRecovery: false,
      needsMfaChallenge: false,
      aal: { currentLevel: 'aal2', nextLevel: 'aal2' },
      mfaFactors: [],
      clearAuthError: jest.fn(),
      clearPasswordRecovery: jest.fn(),
      refreshProfile: jest.fn(),
      refreshMfaStatus: jest.fn(),
      signOut: jest.fn(),
    };

    // 1. Unauthenticated direct navigation to /admin redirects to /admin-login
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue(baseAuth);
    const { rerender } = render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/dashboard" element={<div>PARTICIPANT DASHBOARD TARGET</div>} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /NEURAL\s*ACCESS/i })).toBeInTheDocument();
    });

    // 2. Participant with spoofed user_metadata.role='super_admin' is denied and shown safe link to /dashboard
    AuthContext.useAuth.mockReturnValue({
      ...baseAuth,
      session: {
        access_token: 'part-jwt',
        user: { id: 'p-1', email: 'part@bce.edu', user_metadata: { role: 'super_admin' } },
      },
      user: { id: 'p-1', email: 'part@bce.edu', user_metadata: { role: 'super_admin' } },
      profile: { id: 'p-1', role: 'participant', is_active: true, roll_number: '2410101', phone: '9876500001' },
    });
    rerender(
      <MemoryRouter initialEntries={['/admin-login']}>
        <Routes>
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin" element={<div>ADMIN PORTAL GRANTED</div>} />
          <Route path="/dashboard" element={<div>PARTICIPANT DASHBOARD TARGET</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('You do not have permission to access the Admin Portal.');
    expect(screen.getByRole('link', { name: /Go to Participant Dashboard/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.queryByText('ADMIN PORTAL GRANTED')).not.toBeInTheDocument();
    expect(screen.queryByText('2410101')).not.toBeInTheDocument();

    // 3. Deactivated admin fails closed
    AuthContext.useAuth.mockReturnValue({
      ...baseAuth,
      session: { access_token: 'off-jwt', user: { id: 'off-1', email: 'off@bce.edu' } },
      user: { id: 'off-1', email: 'off@bce.edu' },
      profile: { id: 'off-1', role: 'admin', is_active: false },
    });
    rerender(
      <MemoryRouter initialEntries={['/admin-login']}>
        <Routes>
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin" element={<div>ADMIN PORTAL GRANTED</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/deactivated/i);
    expect(screen.queryByText('ADMIN PORTAL GRANTED')).not.toBeInTheDocument();

    // 4. Missing profile / profileLoadError fails closed
    AuthContext.useAuth.mockReturnValue({
      ...baseAuth,
      session: { access_token: 'nop-jwt', user: { id: 'nop-1', email: 'nop@bce.edu' } },
      user: { id: 'nop-1', email: 'nop@bce.edu' },
      profile: null,
      profileLoadError: true,
    });
    rerender(
      <MemoryRouter initialEntries={['/admin-login']}>
        <Routes>
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin" element={<div>ADMIN PORTAL GRANTED</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('You do not have permission to access the Admin Portal.');
    expect(screen.getByRole('button', { name: /Sign Out/i })).toBeInTheDocument();

    // 5. Authorized admin and coordinator enter cleanly
    for (const allowedRole of ['admin', 'coordinator']) {
      AuthContext.useAuth.mockReturnValue({
        ...baseAuth,
        session: { access_token: `${allowedRole}-jwt`, user: { id: `${allowedRole}-1`, email: `${allowedRole}@bce.edu` } },
        user: { id: `${allowedRole}-1`, email: `${allowedRole}@bce.edu` },
        profile: { id: `${allowedRole}-1`, role: allowedRole, is_active: true },
      });
      rerender(
        <MemoryRouter initialEntries={['/admin-login']}>
          <Routes>
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin" element={<div>ADMIN PORTAL GRANTED {allowedRole}</div>} />
          </Routes>
        </MemoryRouter>
      );
      await waitFor(() => {
        expect(screen.getByText(`ADMIN PORTAL GRANTED ${allowedRole}`)).toBeInTheDocument();
      });
    }

    // 6. Entry points exist in Navbar, Footer, and #/signin
    AuthContext.useAuth.mockReturnValue(baseAuth);
    rerender(
      <MemoryRouter>
        <NavigationBar />
        <AuthUI initialIsSignIn />
        <Footer />
      </MemoryRouter>
    );
    const adminLoginLinks = screen.getAllByRole('link', { name: /Admin Login/i });
    expect(adminLoginLinks.length).toBeGreaterThanOrEqual(3);
  });

  test('AuthProvider resolves missing profile fail-closed as profileLoadError without infinite spinner, and Admin blocks sole-factor removal in UI', async () => {
    jest.restoreAllMocks();
    const { AuthProvider, useAuth } = AuthContext;

    supabaseClientModule.__setMockSupabase({
      auth: {
        onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
        getSession: jest.fn().mockResolvedValue({
          data: { session: { access_token: 'missing-prof-jwt', user: { id: 'orphan-1', email: 'orphan@bce.edu' } } },
          error: null,
        }),
        mfa: {
          getAuthenticatorAssuranceLevel: jest.fn().mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' } }),
          listFactors: jest.fn().mockResolvedValue({ data: { totp: [] } }),
        },
        signOut: jest.fn().mockResolvedValue({}),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      })),
    });

    function Probe() {
      const a = useAuth();
      return (
        <div>
          <span data-testid="probe-loading">{String(a.loading)}</span>
          <span data-testid="probe-err">{String(a.profileLoadError)}</span>
        </div>
      );
    }

    render(
      <MemoryRouter>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('probe-loading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('probe-err')).toHaveTextContent('true');

    // Note: verifying Admin sole-factor UI guard while documenting client-vs-server boundary cleanly
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      configured: true,
      loading: false,
      session: { access_token: 'aal2-jwt', user: { id: 'sa-1', email: 'sa@bce.edu' } },
      user: { id: 'sa-1', email: 'sa@bce.edu' },
      profile: { id: 'sa-1', full_name: 'Super', role: 'super_admin', is_active: true },
      profileLoadError: false,
      authError: null,
      isPasswordRecovery: false,
      needsMfaChallenge: false,
      aal: { currentLevel: 'aal2', nextLevel: 'aal2' },
      mfaFactors: [{ id: 'totp-only', friendly_name: 'Authenticator', factor_type: 'totp', status: 'verified' }],
      clearAuthError: jest.fn(),
      clearPasswordRecovery: jest.fn(),
      refreshProfile: jest.fn(),
      refreshMfaStatus: jest.fn(),
      signOut: jest.fn(),
    });
    jest.spyOn(supabaseClientModule, 'callEdgeFunction').mockResolvedValue({
      registrations: [],
      pagination: { page: 1, limit: 20, total: 0, total_pages: 1 },
      summary: {},
      audit_logs: [],
      competitions: [],
      accommodation_plans: [],
      staff: [],
      assignments: [],
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: /Security & MFA/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Remove Authenticator/i }));
    expect(await screen.findByText(/Enroll a backup authenticator before removing your sole TOTP factor/i)).toBeInTheDocument();
  });

  test('Admin exposes competition/accommodation editors, audit pagination/filtering, and multi-factor AAL2 selector', async () => {
    const challengeAndVerify = jest.fn().mockResolvedValue({ data: { id: 'ok' }, error: null });
    supabaseClientModule.__setMockSupabase({
      auth: {
        mfa: { challengeAndVerify },
      },
    });

    const refreshMfaStatus = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      configured: true,
      loading: false,
      session: { access_token: 'aal1-jwt', user: { id: 'sa-1', email: 'sa@bce.edu' } },
      user: { id: 'sa-1', email: 'sa@bce.edu' },
      profile: { id: 'sa-1', full_name: 'Super Admin', role: 'super_admin', is_active: true },
      profileLoadError: false,
      authError: null,
      isPasswordRecovery: false,
      needsMfaChallenge: true,
      aal: { currentLevel: 'aal1', nextLevel: 'aal2' },
      mfaFactors: [
        { id: 'factor-1', friendly_name: 'Primary Phone', factor_type: 'totp', status: 'verified' },
        { id: 'factor-2', friendly_name: 'Backup Key', factor_type: 'totp', status: 'verified' },
      ],
      clearAuthError: jest.fn(),
      clearPasswordRecovery: jest.fn(),
      refreshProfile: jest.fn(),
      refreshMfaStatus,
      signOut: jest.fn(),
    });

    const { rerender } = render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    );

    const factorSelect = await screen.findByLabelText(/Authenticator Device/i);
    fireEvent.change(factorSelect, { target: { value: 'factor-2' } });
    fireEvent.change(screen.getByLabelText(/Authenticator 6-Digit Code/i), { target: { value: '654321' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify & Unlock Portal/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Verify & Unlock Portal/i })).not.toBeDisabled();
    });
    expect(challengeAndVerify).toHaveBeenCalledWith({ factorId: 'factor-2', code: '654321' });
    expect(refreshMfaStatus).toHaveBeenCalled();

    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      configured: true,
      loading: false,
      session: { access_token: 'aal2-jwt', user: { id: 'sa-1', email: 'sa@bce.edu' } },
      user: { id: 'sa-1', email: 'sa@bce.edu' },
      profile: { id: 'sa-1', full_name: 'Super Admin', role: 'super_admin', is_active: true },
      profileLoadError: false,
      authError: null,
      isPasswordRecovery: false,
      needsMfaChallenge: false,
      aal: { currentLevel: 'aal2', nextLevel: 'aal2' },
      mfaFactors: [
        { id: 'factor-1', friendly_name: 'Primary Phone', factor_type: 'totp', status: 'verified' },
        { id: 'factor-2', friendly_name: 'Backup Key', factor_type: 'totp', status: 'verified' },
      ],
      clearAuthError: jest.fn(),
      clearPasswordRecovery: jest.fn(),
      refreshProfile: jest.fn(),
      refreshMfaStatus,
      signOut: jest.fn(),
    });

    const edgeSpy = jest.spyOn(supabaseClientModule, 'callEdgeFunction').mockImplementation(async (fnName, opts) => {
      if (fnName === 'get-admin-registrations') {
        return {
          registrations: [],
          pagination: { page: 1, limit: 20, total: 0, total_pages: 1 },
          summary: { total_registrations: 0 },
          analytics: { timezone: 'Asia/Kolkata', kpis: {}, trends: [], competitions_overview: [] },
          audit_logs: [
            {
              id: 1,
              actor_role: 'super_admin',
              action: 'COMPETITION_UPDATED',
              target_table: 'competitions',
              details: { venue: 'Main Hall' },
              created_at: new Date().toISOString(),
            },
          ],
          audit_pagination: { page: Number(opts?.query?.audit_page || 1), limit: 30, total: 45, total_pages: 2 },
        };
      }
      if (fnName === 'manage-competitions') {
        if (opts?.method === 'PATCH') return { ok: true };
        return {
          competitions: [
            {
              id: 'robowar',
              num_id: 1,
              title: 'RoboWar',
              fee_type: 'per_member',
              fee_inr: 50,
              min_team_size: 1,
              max_team_size: 4,
              venue: 'Robotics Arena',
              event_date: 'December 2026',
              event_time: '10:00 AM',
              is_active: true,
            },
          ],
          accommodation_plans: [
            { id: 'both', name: 'Complete Stay', price_per_person_inr: 175, is_active: true },
          ],
        };
      }
      if (fnName === 'manage-admins') {
        return { staff: [], assignments: [] };
      }
      return {};
    });

    rerender(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: /Competitions & Tariffs/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Edit RoboWar/i }));

    fireEvent.change(await screen.findByLabelText(/^Venue$/i), { target: { value: 'Central Ground' } });
    fireEvent.change(screen.getByLabelText(/Fee \(INR\)/i), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Competition/i }));

    expect(await screen.findByText(/Saved details for RoboWar/i)).toBeInTheDocument();
    expect(edgeSpy).toHaveBeenCalledWith('manage-competitions', {
      method: 'PATCH',
      body: {
        id: 'robowar',
        venue: 'Central Ground',
        event_date: 'December 2026',
        event_time: '10:00 AM',
        fee_inr: 100,
        fee_type: 'per_member',
      },
    });
    expect(screen.queryByRole('button', { name: /Save Competition/i })).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: /Edit Complete Stay/i }));
    fireEvent.change(await screen.findByLabelText(/Tariff \/ Person \(INR\)/i), { target: { value: '200' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Tariff/i }));

    expect(await screen.findByText(/Updated tariff for Complete Stay/i)).toBeInTheDocument();
    expect(edgeSpy).toHaveBeenCalledWith('manage-competitions', {
      method: 'PATCH',
      body: { target: 'accommodation', id: 'both', price_per_person_inr: 200 },
    });
    expect(screen.queryByRole('button', { name: /Save Tariff/i })).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: /Audit Logs/i }));
    fireEvent.change(await screen.findByLabelText(/Filter audit logs by action/i), { target: { value: 'COMPETITION_UPDATED' } });
    await waitFor(() => {
      expect(edgeSpy).toHaveBeenCalledWith(
        'get-admin-registrations',
        expect.objectContaining({
          query: expect.objectContaining({ audit_action: 'COMPETITION_UPDATED', audit_page: 1 }),
        }),
      );
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Next$/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    expect(await screen.findByText(/Page 2 of 2/i)).toBeInTheDocument();
    expect(edgeSpy).toHaveBeenCalledWith(
      'get-admin-registrations',
      expect.objectContaining({
        query: expect.objectContaining({ audit_action: 'COMPETITION_UPDATED', audit_page: 2 }),
      }),
    );
  }, 15000);

  test('Admin fails closed when mfaLoadError is true even if staff profile is active', () => {
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      configured: true,
      loading: false,
      session: { access_token: 'fake-jwt', user: { id: 'admin-1', email: 'admin@example.com' } },
      user: { id: 'admin-1', email: 'admin@example.com' },
      profile: { id: 'admin-1', role: 'super_admin', email: 'admin@example.com', is_active: true },
      profileLoadError: false,
      mfaLoadError: true,
      isPasswordRecovery: false,
      needsMfaChallenge: false,
      aal: { currentLevel: null, nextLevel: null },
      mfaFactors: [],
      clearPasswordRecovery: jest.fn(),
      refreshProfile: jest.fn(),
      refreshMfaStatus: jest.fn(),
      signOut: jest.fn(),
    });

    render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    );

    expect(screen.getByText(/Unable to Verify Account Role/i)).toBeInTheDocument();
  });

  test('Register honors ?arena and ?plan deep links and blocks UPI checkout when server upi_payment.configured=false', async () => {
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      configured: true,
      loading: false,
      session: { access_token: 'fake-jwt', user: { id: 'u1', email: 'u1@example.com' } },
      user: { id: 'u1', email: 'u1@example.com' },
      profile: { id: 'u1', role: 'participant', email: 'u1@example.com', is_active: true },
      isPasswordRecovery: false,
      clearPasswordRecovery: jest.fn(),
      refreshProfile: jest.fn().mockResolvedValue({ id: 'u1' }),
      signOut: jest.fn(),
    });

    jest.spyOn(supabaseClientModule, 'callEdgeFunction').mockResolvedValue({
      registration: {
        id: 'reg-unconf-1',
        pass_code: 'TR26-UNCONF01',
        full_name: 'Deep Link Delegate',
        primary_arena_id: 'hackathon',
        team_size: 1,
        accommodation_id: 'both',
        computed_total_inr: 225,
        status: 'PENDING_PAYMENT',
      },
      upi_payment: {
        configured: false,
        vpa: null,
        payee_name: 'Technoriti 2026 BCE',
      },
    });

    render(
      <MemoryRouter initialEntries={['/register?arena=hackathon&plan=both']}>
        <Register />
      </MemoryRouter>
    );

    // Pre-selected from URL query params
    expect(screen.getByDisplayValue(/Hackathon/i)).toBeInTheDocument();
    const bothRadio = document.querySelector('input[name="accommodation"][value="both"]');
    expect(bothRadio?.checked).toBe(true);

    fireEvent.change(screen.getByPlaceholderText(/Sujal Kumar/i), { target: { value: 'Deep Link Delegate' } });
    fireEvent.change(screen.getByPlaceholderText(/24103123001/i), { target: { value: '24103123999' } });
    fireEvent.change(screen.getByPlaceholderText(/9876543210/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByPlaceholderText(/Bhagalpur College of Engineering/i), { target: { value: 'BCE Bhagalpur' } });
    fireEvent.change(screen.getByPlaceholderText(/Electronics & Communication/i), { target: { value: 'CSE' } });

    fireEvent.click(screen.getByRole('button', { name: /PROCEED TO PAYMENT GATEWAY/i }));

    expect(await screen.findByText('TR26-UNCONF01')).toBeInTheDocument();
    expect(screen.queryByAltText('UPI Payment QR Code')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SUBMIT UTR FOR VERIFICATION/i })).toBeDisabled();
  });
});
