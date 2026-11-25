import { competitionsList } from "../../../content/events";

export type AdminRole = "super_admin" | "admin" | "coordinator";

export type AdminSectionKey =
  | "overview"
  | "registrations"
  | "pending-verification"
  | "competitions"
  | "staff"
  | "audit";

export interface DashboardStatItem {
  id: string;
  label: string;
  value: string;
  hint: string;
  iconKey: "registrations" | "pending" | "participants" | "rate";
}

export interface FinancialMetricItem {
  id: string;
  label: string;
  value: string;
  hint: string;
  tone: "verified" | "pending" | "rejected";
}

export interface TrendPoint {
  week_start: string;
  week: string;
  registrations: number;
  verified: number;
}

export interface CompetitionOverviewItem {
  id: string;
  title: string;
  category: string;
  statusLabel: "Open" | "Paused";
  badgeVariant: "default" | "secondary" | "outline";
  registrationCount: number | null;
  verifiedCount: number | null;
  participantCount: number | null;
  verificationRatePct: number | null;
  capacityLimit: number | null;
  eventDate: string;
  venue: string;
}

export interface ActivityFeedItem {
  id: string;
  actorName: string;
  actorInitials: string;
  actorRole: string;
  actionText: string;
  timeText: string;
  exactTimestamp: string;
}

export interface AdminUserDisplay {
  name: string;
  firstName: string;
  initials: string;
  email: string;
  role: string;
  roleLabel: string;
  avatarUrl: string;
}

function getInitials(name: string, fallback: string): string {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return fallback.slice(0, 2).toUpperCase();
}

function formatRoleLabel(role?: string): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "admin":
      return "Admin";
    case "coordinator":
      return "Coordinator";
    default:
      return "Staff";
  }
}

export function buildAdminUserProfile(
  profile: Record<string, any> | null | undefined,
  session: Record<string, any> | null | undefined,
): AdminUserDisplay {
  const email = String(profile?.email || session?.user?.email || "");
  const metaName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    "";
  const rawName = String(profile?.full_name || metaName || "").trim();
  const displayName =
    rawName || (email ? email.split("@")[0] : formatRoleLabel(profile?.role));
  const firstName = displayName.split(/\s+/)[0] || "Admin";
  const avatarUrl = String(
    session?.user?.user_metadata?.avatar_url ||
      session?.user?.user_metadata?.picture ||
      "",
  ).trim();
  const role = String(profile?.role || "");

  return {
    name: displayName,
    firstName,
    initials: getInitials(displayName, role || "AD"),
    email,
    role,
    roleLabel: formatRoleLabel(role),
    avatarUrl,
  };
}

function formatInr(amount: number): string {
  return `₹${Math.max(0, Math.round(amount)).toLocaleString("en-IN")}`;
}

export function getDashboardStats(params: {
  role: AdminRole;
  analytics?: Record<string, any> | null;
  summary?: Record<string, any> | null;
  coordData?: Record<string, any> | null;
}): DashboardStatItem[] {
  const { role, analytics, summary, coordData } = params;

  if (role === "coordinator") {
    const kpis = analytics?.kpis || {};
    const assignedCount =
      typeof kpis.assigned_competitions_count === "number"
        ? kpis.assigned_competitions_count
        : (coordData?.assigned_competitions?.length ?? 0);
    const totalRegs =
      typeof kpis.total_registrations === "number"
        ? kpis.total_registrations
        : (coordData?.pagination?.total ?? 0);
    const confirmedRegs =
      typeof kpis.verified_registrations === "number" ? kpis.verified_registrations : null;
    const confirmedParticipants =
      typeof kpis.confirmed_participants === "number" ? kpis.confirmed_participants : null;

    return [
      {
        id: "coord-total-regs",
        label: "Assigned registrations",
        value: Number(totalRegs).toLocaleString("en-IN"),
        hint: `Across ${assignedCount} assigned competition${assignedCount === 1 ? "" : "s"}`,
        iconKey: "registrations",
      },
      {
        id: "coord-pending",
        label: "Awaiting verification",
        value:
          typeof kpis.pending_registrations === "number"
            ? Number(kpis.pending_registrations).toLocaleString("en-IN")
            : "—",
        hint: "Pending delegate passes in your arenas",
        iconKey: "pending",
      },
      {
        id: "coord-participants",
        label: "Confirmed participants",
        value:
          confirmedParticipants !== null
            ? Number(confirmedParticipants).toLocaleString("en-IN")
            : "—",
        hint:
          confirmedRegs !== null
            ? `${confirmedRegs} verified team/solo passes`
            : "Verified participants in assigned events",
        iconKey: "participants",
      },
      {
        id: "coord-rate",
        label: "Arena confirmation rate",
        value:
          confirmedRegs !== null && Number(totalRegs) > 0
            ? `${Math.round((confirmedRegs / Number(totalRegs)) * 100)}%`
            : "0%",
        hint:
          confirmedRegs !== null
            ? `${confirmedRegs} of ${Number(totalRegs)} passes confirmed`
            : "Assigned registrations confirmed",
        iconKey: "rate",
      },
    ];
  }

  const kpis = analytics?.kpis || {};
  const totalRegs = Number(kpis.total_registrations ?? summary?.total_registrations ?? 0);
  const pendingVerifications = Number(
    kpis.pending_verifications_count ?? summary?.pending_verification ?? 0,
  );
  const verifiedPayments = Number(
    kpis.verified_payments_count ?? summary?.verified ?? 0,
  );
  const rejectedPayments = Number(
    kpis.rejected_payments_count ?? summary?.rejected ?? 0,
  );
  const verifiedRegs = Number(
    kpis.verified_registrations ?? summary?.verified ?? 0,
  );
  const confirmedParticipants =
    typeof kpis.confirmed_participants === "number"
      ? Number(kpis.confirmed_participants)
      : null;

  const submittedUtrs = verifiedPayments + pendingVerifications + rejectedPayments;
  const verificationRate =
    submittedUtrs > 0 ? Math.round((verifiedPayments / submittedUtrs) * 100) : 0;

  const last7Regs =
    typeof kpis.last_7d_registrations === "number" ? Number(kpis.last_7d_registrations) : null;

  return [
    {
      id: "total-registrations",
      label: "Total registrations",
      value: totalRegs.toLocaleString("en-IN"),
      hint:
        last7Regs !== null
          ? `+${last7Regs} submitted in last 7 days`
          : `${Number(kpis.pending_payment ?? summary?.pending_payment ?? 0)} awaiting payment`,
      iconKey: "registrations",
    },
    {
      id: "pending-verifications",
      label: "Pending payment verifications",
      value: pendingVerifications.toLocaleString("en-IN"),
      hint: "Submitted UTRs awaiting bank check",
      iconKey: "pending",
    },
    {
      id: "confirmed-participants",
      label: "Confirmed participants",
      value:
        confirmedParticipants !== null
          ? confirmedParticipants.toLocaleString("en-IN")
          : verifiedRegs.toLocaleString("en-IN"),
      hint:
        confirmedParticipants !== null
          ? `${verifiedRegs} verified pass${verifiedRegs === 1 ? "" : "es"}`
          : "Verified registrations",
      iconKey: "participants",
    },
    {
      id: "verification-rate",
      label: "Payment verification rate",
      value: submittedUtrs > 0 ? `${verificationRate}%` : "0%",
      hint:
        submittedUtrs > 0
          ? `${verifiedPayments} of ${submittedUtrs} submitted UTRs verified`
          : "No UTR submissions recorded yet",
      iconKey: "rate",
    },
  ];
}

export function getFinancialMetrics(params: {
  role: AdminRole;
  analytics?: Record<string, any> | null;
  summary?: Record<string, any> | null;
}): FinancialMetricItem[] | null {
  const { role, analytics, summary } = params;
  if (role !== "admin" && role !== "super_admin") {
    return null;
  }

  const kpis = analytics?.kpis || {};
  const verifiedCollections = Number(
    kpis.verified_collections_inr ?? summary?.verified_revenue_inr ?? 0,
  );
  const verifiedPaymentsCount = Number(
    kpis.verified_payments_count ?? summary?.verified ?? 0,
  );
  const pendingVerificationAmt =
    typeof kpis.pending_verification_amount_inr === "number"
      ? Number(kpis.pending_verification_amount_inr)
      : null;
  const pendingVerificationCount = Number(
    kpis.pending_verifications_count ?? summary?.pending_verification ?? 0,
  );
  const unpaidAmt =
    typeof kpis.unpaid_registrations_amount_inr === "number"
      ? Number(kpis.unpaid_registrations_amount_inr)
      : 0;
  const rejectedCount = Number(
    kpis.rejected_payments_count ?? summary?.rejected ?? 0,
  );

  return [
    {
      id: "verified-collections",
      label: "Total verified collections",
      value: formatInr(verifiedCollections),
      hint: `${verifiedPaymentsCount} verified bank reconciliation${verifiedPaymentsCount === 1 ? "" : "s"}`,
      tone: "verified",
    },
    {
      id: "pending-amount",
      label: "Pending payment amount",
      value: pendingVerificationAmt !== null ? formatInr(pendingVerificationAmt) : "—",
      hint:
        pendingVerificationAmt !== null
          ? `${pendingVerificationCount} UTR${pendingVerificationCount === 1 ? "" : "s"} under review • ${formatInr(unpaidAmt)} unpaid`
          : "Requires analytics SQL migration 004",
      tone: "pending",
    },
    {
      id: "rejected-attempts",
      label: "Rejected payment attempts",
      value: rejectedCount.toLocaleString("en-IN"),
      hint: "Flagged mismatches / uncredited UTRs",
      tone: "rejected",
    },
  ];
}

export function getRegistrationTrends(params: {
  role: AdminRole;
  analytics?: Record<string, any> | null;
}): {
  timezone: string;
  series: TrendPoint[];
  hasRecords: boolean;
} {
  const { role, analytics } = params;
  const rawTrends = Array.isArray(analytics?.trends) ? analytics.trends : [];
  const series: TrendPoint[] = rawTrends.map((pt: Record<string, any>) => ({
    week_start: String(pt.week_start || ""),
    week: String(pt.week || pt.week_start || ""),
    registrations: Math.max(0, Number(pt.registrations ?? 0)),
    verified: Math.max(
      0,
      Number(role === "coordinator" ? (pt.verified_passes ?? 0) : (pt.payments_verified ?? 0)),
    ),
  }));

  const hasRecords = series.some((pt) => pt.registrations > 0 || pt.verified > 0);
  return {
    timezone: String(analytics?.timezone || "Asia/Kolkata"),
    series,
    hasRecords,
  };
}

export function getCompetitionOverview(params: {
  role: AdminRole;
  analytics?: Record<string, any> | null;
  catalogCompetitions?: Record<string, any>[];
  assignedCompetitions?: string[];
}): CompetitionOverviewItem[] {
  const { role, analytics, catalogCompetitions = [], assignedCompetitions = [] } = params;
  const rawOverview = Array.isArray(analytics?.competitions_overview)
    ? analytics.competitions_overview
    : [];

  const staticById = new Map(competitionsList.map((c) => [c.id, c]));

  if (rawOverview.length > 0) {
    return rawOverview.map((c: Record<string, any>) => {
      const staticComp = staticById.get(String(c.id));
      const regCount = Number(c.registration_count ?? 0);
      const verCount = Number(c.verified_count ?? 0);
      const partCount = Number(c.participant_count ?? 0);
      const isActive = c.is_active !== false;
      const capacityLimit =
        typeof c.capacity_limit === "number" && c.capacity_limit > 0
          ? Number(c.capacity_limit)
          : null;
      return {
        id: String(c.id),
        title: String(c.title || staticComp?.title || c.id),
        category: String(c.category || staticComp?.category || "Arena"),
        statusLabel: isActive ? "Open" : "Paused",
        badgeVariant: isActive ? "default" : "secondary",
        registrationCount: regCount,
        verifiedCount: verCount,
        participantCount: partCount,
        verificationRatePct: regCount > 0 ? Math.round((verCount / regCount) * 100) : 0,
        capacityLimit,
        eventDate: String(c.event_date || staticComp?.date || "Schedule TBA"),
        venue: String(c.venue || staticComp?.venue || "BCE Campus"),
      };
    });
  }

  const baseList =
    role === "coordinator"
      ? competitionsList.filter((c) => assignedCompetitions.includes(c.id))
      : catalogCompetitions.length > 0
        ? catalogCompetitions
        : competitionsList;

  return baseList.slice(0, 6).map((c: Record<string, any>) => {
    const staticComp = staticById.get(String(c.id));
    const isActive = c.is_active !== false;
    return {
      id: String(c.id),
      title: String(c.title || staticComp?.title || c.id),
      category: String(c.category || staticComp?.category || "Arena"),
      statusLabel: isActive ? "Open" : "Paused",
      badgeVariant: isActive ? "default" : "secondary",
      registrationCount: null,
      verifiedCount: null,
      participantCount: null,
      verificationRatePct: null,
      capacityLimit: null,
      eventDate: String(c.event_date || staticComp?.date || "Schedule TBA"),
      venue: String(c.venue || staticComp?.venue || "BCE Campus"),
    };
  });
}

function formatRelativeTime(isoDate: string): string {
  const ts = new Date(isoDate).getTime();
  if (!Number.isFinite(ts)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function getRecentAdminActivity(params: {
  role: AdminRole;
  auditLogs?: Record<string, any>[];
}): ActivityFeedItem[] {
  const { role, auditLogs = [] } = params;
  if (role !== "admin" && role !== "super_admin") {
    return [];
  }

  return auditLogs.map((log) => {
    const details = (log.details && typeof log.details === "object" ? log.details : {}) as Record<string, any>;
    const actorRoleLabel = formatRoleLabel(log.actor_role);
    const actorName =
      typeof log.actor_name === "string" && log.actor_name.trim()
        ? log.actor_name.trim()
        : log.action === "REGISTRATION_CREATED" || log.action === "PAYMENT_UTR_SUBMITTED"
          ? "Delegate"
          : actorRoleLabel;

    let actionText = String(log.action || "ACTIVITY").toLowerCase().replace(/_/g, " ");
    switch (log.action) {
      case "REGISTRATION_CREATED":
        actionText = `submitted registration ${details.pass_code || ""}`.trim();
        break;
      case "PAYMENT_UTR_SUBMITTED":
        actionText = `submitted UTR${details.utr_last4 ? ` (••${details.utr_last4})` : ""} for verification`;
        break;
      case "PAYMENT_VERIFIED":
        actionText = `verified payment (${details.pass_code || "Pass"}${details.amount_inr != null ? `, ₹${details.amount_inr}` : ""})`;
        break;
      case "PAYMENT_REJECTED":
        actionText = `rejected payment (${details.pass_code || "Pass"})`;
        break;
      case "COMPETITION_UPDATED":
        actionText = `updated competition "${log.target_id}"`;
        break;
      case "TARIFF_UPDATED":
        actionText = `updated accommodation tariff "${log.target_id}"`;
        break;
      case "ROLE_UPDATED":
        actionText = `updated staff role to ${details.new_role || "staff"}`;
        break;
      case "STAFF_DEACTIVATED":
        actionText = "deactivated a staff account";
        break;
      case "STAFF_REACTIVATED":
        actionText = "reactivated a staff account";
        break;
      case "COORDINATOR_ASSIGNED":
        actionText = `assigned coordinator to ${details.competition_id || "arena"}`;
        break;
      case "COORDINATOR_REMOVED":
        actionText = `removed coordinator from ${details.competition_id || "arena"}`;
        break;
      default:
        break;
    }

    const createdAt = String(log.created_at || "");
    return {
      id: String(log.id),
      actorName,
      actorInitials: getInitials(actorName, log.actor_role || "AD"),
      actorRole: actorRoleLabel,
      actionText,
      timeText: formatRelativeTime(createdAt),
      exactTimestamp: createdAt ? new Date(createdAt).toLocaleString("en-IN") : "",
    };
  });
}
