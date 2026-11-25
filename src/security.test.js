import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import Register from './screens/Register';
import Dashboard from './screens/Dashboard';
import Admin from './screens/Admin';
import { AuthUI } from './components/ui/auth-fuse';
import * as AuthContext from './context/AuthContext';
import * as supabaseClientModule from './lib/supabaseClient';

beforeEach(() => {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
  if (typeof window.ResizeObserver === 'undefined') {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

describe('ROXX TECHNORITI Security & Backend Integration Regression Suite', () => {
  afterEach(() => {
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

  test('Admin route fails closed while session lacks profile or when account is deactivated', () => {
    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      configured: true,
      loading: false,
      session: { access_token: 'fake-jwt', user: { id: 'u1', email: 'u1@example.com' } },
      user: { id: 'u1', email: 'u1@example.com' },
      profile: null,
      isPasswordRecovery: false,
      clearPasswordRecovery: jest.fn(),
      refreshProfile: jest.fn(),
      signOut: jest.fn(),
    });

    const { rerender } = render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    );

    expect(screen.getByText(/Verifying Access/i)).toBeInTheDocument();
    expect(screen.queryByText(/CONTROL DESK/i)).not.toBeInTheDocument();

    AuthContext.useAuth.mockReturnValue({
      configured: true,
      loading: false,
      session: { access_token: 'fake-jwt', user: { id: 'u2', email: 'u2@example.com' } },
      user: { id: 'u2', email: 'u2@example.com' },
      profile: { id: 'u2', role: 'admin', email: 'u2@example.com', is_active: false },
      isPasswordRecovery: false,
      clearPasswordRecovery: jest.fn(),
      refreshProfile: jest.fn(),
      signOut: jest.fn(),
    });

    rerender(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    );

    expect(screen.getByText(/deactivated/i)).toBeInTheDocument();
    expect(screen.queryByText(/CONTROL DESK/i)).not.toBeInTheDocument();
  });

  test('Admin route displays API error state cleanly and switches App-1 sidebar sections by role', async () => {
    const callEdgeSpy = jest.spyOn(supabaseClientModule, 'callEdgeFunction').mockImplementation(async (fnName) => {
      if (fnName === 'get-admin-registrations') {
        throw new Error('Upstream analytics timeout');
      }
      if (fnName === 'manage-competitions') {
        return { competitions: [], accommodation_plans: [] };
      }
      if (fnName === 'manage-admins') {
        return { staff: [], assignments: [] };
      }
      return {};
    });

    jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
      configured: true,
      loading: false,
      session: { access_token: 'fake-jwt', user: { id: 'sa-1', email: 'sa@example.com' } },
      user: { id: 'sa-1', email: 'sa@example.com' },
      profile: { id: 'sa-1', role: 'super_admin', email: 'sa@example.com', full_name: 'Super User', is_active: true },
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

    await waitFor(() => {
      expect(screen.getByText(/Upstream analytics timeout/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Unable to load weekly trend analytics/i)).toBeInTheDocument();
    const staffNavBtn = screen.getByRole('button', { name: /Admins & Coordinators/i });
    fireEvent.click(staffNavBtn);
    await waitFor(() => {
      expect(screen.getByText(/Grant \/ Change Staff Role/i)).toBeInTheDocument();
    });
    expect(callEdgeSpy).toHaveBeenCalledWith('manage-admins', expect.any(Object));
  });

  test('sanitizeInternalRedirect blocks open redirects and preserves safe routes', () => {
    expect(AuthContext.sanitizeInternalRedirect('/\\evil.com')).toBe('/dashboard');
    expect(AuthContext.sanitizeInternalRedirect('//evil.com')).toBe('/dashboard');
    expect(AuthContext.sanitizeInternalRedirect('https://evil.com')).toBe('/dashboard');
    expect(AuthContext.sanitizeInternalRedirect('/unknown-route')).toBe('/dashboard');
    expect(AuthContext.sanitizeInternalRedirect('/register?step=1')).toBe('/register?step=1');
  });
});
