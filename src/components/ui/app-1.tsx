import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  AlertCircle,
  BarChart3,
  Bell,
  CalendarClock,
  ClipboardList,
  CreditCard,
  FileText,
  IndianRupee,
  LogOut,
  MapPin,
  Moon,
  Search,
  ShieldAlert,
  Sun,
  Users,
  XCircle,
} from "lucide-react";

import { cn } from "../../lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Badge } from "./badge";
import { Button } from "./button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./chart";
import { Input } from "./input";
import { Progress } from "./progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./sheet";
import { Skeleton } from "./skeleton";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "./app-1-utils/sidebar";
import {
  type ActivityFeedItem,
  type AdminRole,
  type AdminSectionKey,
  type AdminUserDisplay,
  type CompetitionOverviewItem,
  type DashboardStatItem,
  type FinancialMetricItem,
  type TrendPoint,
} from "./app-1-utils/app-1-data";
import { App1Sidebar } from "./app-1-utils/app-1-sidebar";

const ADMIN_CHART_CONFIG: ChartConfig = {
  registrations: {
    label: "Registrations submitted",
    theme: {
      light: "hsl(293, 85%, 42%)",
      dark: "hsl(293, 90%, 64%)",
    },
  },
  verified: {
    label: "Payments verified",
    theme: {
      light: "hsl(142, 72%, 32%)",
      dark: "hsl(142, 71%, 48%)",
    },
  },
};

const COORD_CHART_CONFIG: ChartConfig = {
  registrations: {
    label: "Assigned registrations",
    theme: {
      light: "hsl(293, 85%, 42%)",
      dark: "hsl(293, 90%, 64%)",
    },
  },
  verified: {
    label: "Verified passes",
    theme: {
      light: "hsl(142, 72%, 32%)",
      dark: "hsl(142, 71%, 48%)",
    },
  },
};

const STAT_ICON_MAP = {
  registrations: FileText,
  pending: ClipboardList,
  participants: Users,
  rate: BarChart3,
} as const;

export interface App1Props {
  role: AdminRole;
  userDisplay: AdminUserDisplay;
  activeSection: AdminSectionKey;
  onSelectSection: (section: AdminSectionKey) => void;
  stats: DashboardStatItem[];
  financialMetrics: FinancialMetricItem[] | null;
  trends: {
    timezone: string;
    series: TrendPoint[];
    hasRecords: boolean;
  };
  competitionsOverview: CompetitionOverviewItem[];
  recentActivity: ActivityFeedItem[];
  pendingVerificationsCount?: number;
  loading?: boolean;
  errorMsg?: string;
  searchQuery?: string;
  onSearchSubmit?: (query: string) => void;
  onSignOut: () => void;
  children?: React.ReactNode;
}

export function App1({
  role,
  userDisplay,
  activeSection,
  onSelectSection,
  stats,
  financialMetrics,
  trends,
  competitionsOverview,
  recentActivity,
  pendingVerificationsCount = 0,
  loading = false,
  errorMsg = "",
  searchQuery = "",
  onSearchSubmit,
  onSignOut,
  children,
}: App1Props) {
  const uniqueId = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gradientId = `app1Verified-${uniqueId}`;

  const [lightTheme, setLightTheme] = React.useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("technoriti_admin_theme") === "light";
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    try {
      window.localStorage.setItem("technoriti_admin_theme", lightTheme ? "light" : "dark");
    } catch {
      // Ignore storage quota / privacy mode failures
    }
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("admin-theme-light", lightTheme);
    }
    return () => {
      if (typeof document !== "undefined") {
        document.documentElement.classList.remove("admin-theme-light");
      }
    };
  }, [lightTheme]);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [draftSearch, setDraftSearch] = React.useState(searchQuery);
  const [showAllCompetitions, setShowAllCompetitions] = React.useState(false);

  React.useEffect(() => {
    setDraftSearch(searchQuery);
  }, [searchQuery]);

  const chartConfig =
    role === "coordinator" ? COORD_CHART_CONFIG : ADMIN_CHART_CONFIG;

  const displayedCompetitions = showAllCompetitions
    ? competitionsOverview
    : competitionsOverview.slice(0, 5);

  const handleHeaderSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSearchSubmit?.(draftSearch.trim());
    setSearchOpen(false);
    if (role === "admin" || role === "super_admin") {
      onSelectSection("registrations");
    } else {
      onSelectSection("registrations");
    }
  };

  return (
    <SidebarProvider className={cn(lightTheme && "admin-theme-light")}>
      <App1Sidebar
        role={role}
        activeSection={activeSection}
        onSelectSection={onSelectSection}
        pendingVerificationsCount={pendingVerificationsCount}
        userDisplay={userDisplay}
        onSignOut={onSignOut}
      />

      {/* min-w-0 prevents wide Recharts SVGs / tables from pushing flex inset past mobile/tablet viewports */}
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 sm:gap-3 border-b border-border bg-background px-3 sm:px-6">
          <SidebarTrigger aria-label="Toggle navigation" />
          <div className="min-w-0 flex-1">
            <h1 className="m-0 truncate text-sm font-semibold sm:text-lg text-foreground">
              Welcome back, {userDisplay.firstName}
            </h1>
            <p className="m-0 hidden truncate text-xs text-muted-foreground sm:block">
              TECHNORITI &apos;26 • {userDisplay.roleLabel} Operations Workspace
            </p>
          </div>

          <div className="ml-auto flex items-center gap-1">
            {onSearchSubmit && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Search registrations"
                className="h-8 w-8 sm:h-9 sm:w-9"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              className="relative h-8 w-8 sm:h-9 sm:w-9"
              onClick={() => setNotificationsOpen(true)}
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              {(role !== "coordinator" && pendingVerificationsCount > 0) && (
                <span
                  aria-hidden="true"
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary"
                />
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={lightTheme ? "Switch to dark theme" : "Switch to light theme"}
              className="h-8 w-8 sm:h-9 sm:w-9"
              onClick={() => setLightTheme((prev) => !prev)}
            >
              {lightTheme ? (
                <Moon className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Sun className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>

            <Avatar className="ml-1 h-8 w-8 border border-border">
              {userDisplay.avatarUrl && (
                <AvatarImage
                  src={userDisplay.avatarUrl}
                  alt={userDisplay.name}
                  className="object-[50%_15%]"
                />
              )}
              <AvatarFallback className="text-xs font-semibold">
                {userDisplay.initials}
              </AvatarFallback>
            </Avatar>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSignOut}
              className="hidden sm:inline-flex gap-1.5 text-xs"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sign Out</span>
            </Button>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-destructive bg-destructive px-4 py-3 text-sm text-destructive-foreground"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeSection === "overview" && (
            <>
              {/* 4 Event KPI Cards */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => {
                  const Icon = STAT_ICON_MAP[stat.iconKey];
                  return (
                    <Card key={stat.id} className="min-w-0">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-foreground">
                          {stat.label}
                        </CardTitle>
                        <Icon
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0 text-muted-foreground"
                        />
                      </CardHeader>
                      <CardContent>
                        {loading && stat.value === "0" ? (
                          <Skeleton className="h-8 w-24 mb-1" />
                        ) : (
                          <p className="m-0 text-2xl font-semibold tabular-nums text-foreground">
                            {stat.value}
                          </p>
                        )}
                        <p className="m-0 mt-1 text-xs text-muted-foreground">
                          {stat.hint}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Financial Verification Summary (Admin & Super Admin ONLY) */}
              {financialMetrics && financialMetrics.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-3">
                  {financialMetrics.map((item) => (
                    <Card key={item.id} className="min-w-0">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-foreground">
                          {item.label}
                        </CardTitle>
                        {item.tone === "verified" ? (
                          <IndianRupee
                            aria-hidden="true"
                            className={cn("h-4 w-4", lightTheme ? "text-emerald-600" : "text-emerald-400")}
                          />
                        ) : item.tone === "pending" ? (
                          <CreditCard
                            aria-hidden="true"
                            className={cn("h-4 w-4", lightTheme ? "text-amber-600" : "text-amber-400")}
                          />
                        ) : (
                          <XCircle
                            aria-hidden="true"
                            className={cn("h-4 w-4", lightTheme ? "text-red-600" : "text-red-400")}
                          />
                        )}
                      </CardHeader>
                      <CardContent>
                        <p className="m-0 text-2xl font-semibold tabular-nums text-foreground">
                          {item.value}
                        </p>
                        <p className="m-0 mt-1 text-xs text-muted-foreground">
                          {item.hint}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Registration & Payment Verification Trends Chart */}
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">
                    Registration and payment verification trends
                  </CardTitle>
                  <CardDescription>
                    {role === "coordinator"
                      ? `Assigned arena registrations vs confirmed passes over the last 8 weeks (${trends.timezone})`
                      : `Registrations submitted vs verified bank reconciliations over the last 8 weeks (${trends.timezone})`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading && !trends.hasRecords && trends.series.length === 0 ? (
                    <div className="space-y-3" aria-label="Loading registration trends">
                      <Skeleton className="h-56 w-full" />
                    </div>
                  ) : errorMsg && trends.series.length === 0 ? (
                    <div
                      role="alert"
                      className="flex h-56 flex-col items-center justify-center rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground"
                    >
                      <AlertCircle className={cn("mb-2 h-6 w-6", lightTheme ? "text-red-600" : "text-red-400")} aria-hidden="true" />
                      <span>Unable to load weekly trend analytics.</span>
                    </div>
                  ) : !trends.hasRecords || trends.series.length === 0 ? (
                    <div className="flex h-56 flex-col items-center justify-center rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                      <BarChart3 className="mb-2 h-6 w-6 opacity-60" aria-hidden="true" />
                      <p className="m-0 font-medium text-foreground">
                        No registration or payment verification records yet
                      </p>
                      <p className="m-0 mt-1 text-xs text-muted-foreground">
                        Weekly submissions and verified reconciliations will chart automatically once live registrations arrive.
                      </p>
                    </div>
                  ) : (
                    <ChartContainer config={chartConfig} className="h-64 w-full">
                      <AreaChart
                        data={trends.series}
                        margin={{ left: 4, right: 8, top: 8 }}
                        accessibilityLayer
                      >
                        <defs>
                          <linearGradient
                            id={gradientId}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="var(--color-verified)"
                              stopOpacity={0.28}
                            />
                            <stop
                              offset="100%"
                              stopColor="var(--color-verified)"
                              stopOpacity={0.02}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                          dataKey="week"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                          width={34}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Area
                          dataKey="registrations"
                          type="monotone"
                          stroke="var(--color-registrations)"
                          strokeDasharray="4 4"
                          fill="none"
                          strokeWidth={2}
                          isAnimationActive={false}
                        />
                        <Area
                          dataKey="verified"
                          type="monotone"
                          stroke="var(--color-verified)"
                          fill={`url(#${gradientId})`}
                          strokeWidth={2}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* Two-Column Overview: Competitions & Admin Activity */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="min-w-0">
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base sm:text-lg">
                        Competitions overview
                      </CardTitle>
                      <CardDescription>
                        {role === "coordinator"
                          ? "Registration status and verification progress in your assigned arenas"
                          : "Live TECHNORITI '26 arenas sorted by registration demand"}
                      </CardDescription>
                    </div>
                    {competitionsOverview.length > 5 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 text-xs"
                        onClick={() => setShowAllCompetitions((prev) => !prev)}
                      >
                        {showAllCompetitions
                          ? "Show Top 5"
                          : `View All (${competitionsOverview.length})`}
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="flex flex-col gap-5">
                    {displayedCompetitions.length === 0 ? (
                      <p className="m-0 text-sm text-muted-foreground">
                        No competitions available for your current scope.
                      </p>
                    ) : (
                      displayedCompetitions.map((comp) => (
                        <div key={comp.id} className="flex flex-col gap-2 min-w-0">
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <h4 className="m-0 truncate text-sm font-medium text-foreground">
                              {comp.title}
                            </h4>
                            <Badge variant={comp.badgeVariant} className="shrink-0">
                              {comp.statusLabel}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>{comp.category}</span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" aria-hidden="true" />
                              {comp.venue}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <CalendarClock className="h-3 w-3" aria-hidden="true" />
                              {comp.eventDate}
                            </span>
                          </div>
                          {comp.verificationRatePct !== null ? (
                            <div className="flex items-center gap-3">
                              <Progress
                                value={comp.verificationRatePct}
                                aria-label={`${comp.title} verification share`}
                              />
                              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                                {comp.verifiedCount}/{comp.registrationCount} verified
                              </span>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              Live registration breakdown loads once analytics RPC is active.
                            </div>
                          )}
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span>
                              {comp.registrationCount !== null
                                ? `${comp.registrationCount} registration${comp.registrationCount === 1 ? "" : "s"} • ${comp.participantCount ?? 0} verified delegate${comp.participantCount === 1 ? "" : "s"}`
                                : "Active catalog entry"}
                            </span>
                            {comp.capacityLimit !== null && (
                              <span className="tabular-nums">
                                Cap: {comp.capacityLimit}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="min-w-0">
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">
                      {role === "coordinator" ? "Coordinator access scope" : "Admin activity"}
                    </CardTitle>
                    <CardDescription>
                      {role === "coordinator"
                        ? "Data visibility restricted to your Super Admin arena assignments"
                        : "Latest security, verification, and staff actions from audit logs"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {role === "coordinator" ? (
                      <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted p-4 text-sm">
                        <div className="flex items-center gap-2 font-medium text-foreground">
                          <ShieldAlert className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                          <span>Financial & Global Admin Data Hidden</span>
                        </div>
                        <p className="m-0 text-xs text-muted-foreground leading-relaxed">
                          Coordinator sessions can view participant rosters, team sizes, and schedule statuses only for competitions explicitly assigned by a Super Admin.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="self-start text-xs"
                          onClick={() => onSelectSection("registrations")}
                        >
                          Open Assigned Roster
                        </Button>
                      </div>
                    ) : recentActivity.length === 0 ? (
                      <div className="flex min-h-[180px] flex-col items-center justify-center rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                        <p className="m-0 font-medium text-foreground">
                          No audit activity recorded yet
                        </p>
                        <p className="m-0 mt-1 text-xs text-muted-foreground">
                          Registrations, UTR submissions, bank approvals, and staff updates appear here in real time.
                        </p>
                      </div>
                    ) : (
                      <ol className="m-0 flex list-none flex-col gap-4 p-0">
                        {recentActivity.slice(0, 8).map((entry) => (
                          <li key={entry.id} className="flex items-start gap-3">
                            <Avatar className="h-8 w-8 shrink-0 border border-border">
                              <AvatarFallback className="text-xs font-medium">
                                {entry.actorInitials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="m-0 text-sm leading-snug text-foreground">
                                <span className="font-medium">{entry.actorName}</span>{" "}
                                <span className="text-muted-foreground">
                                  {entry.actionText}
                                </span>
                              </p>
                              <p
                                className="m-0 mt-0.5 text-xs text-muted-foreground"
                                title={entry.exactTimestamp}
                              >
                                {entry.timeText} • {entry.actorRole}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Preserved Operational Workspace Sections (Registrations, UTR Verification, Competitions, Staff, Audit, Coordinator Roster) */}
          {children}
        </main>
      </SidebarInset>

      {/* Header Search Sheet */}
      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetContent side="top" className="mx-auto max-w-2xl rounded-b-lg">
          <SheetHeader>
            <SheetTitle>Search Registrations &amp; Passes</SheetTitle>
            <SheetDescription>
              Filter delegates by full name, pass code, roll number, college, or 10-digit phone.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleHeaderSearch} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Input
              aria-label="Global search registrations input"
              placeholder="e.g. TR26-, Sujal, BCE Bhagalpur, 9876543210"
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              autoFocus
            />
            <Button type="submit" className="shrink-0">
              Search Roster
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Header Notifications Sheet */}
      <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <SheetContent side="right" className="flex flex-col">
          <SheetHeader>
            <SheetTitle>Operational Notifications</SheetTitle>
            <SheetDescription>
              Live verification queue and recent event ledger activity.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 flex flex-1 flex-col gap-3 overflow-y-auto">
            {role !== "coordinator" && pendingVerificationsCount > 0 && (
              <div className="rounded-lg border border-primary bg-accent p-3 text-sm">
                <div className="font-semibold text-foreground">
                  {pendingVerificationsCount} payment UTR{pendingVerificationsCount === 1 ? "" : "s"} pending review
                </div>
                <p className="m-0 mt-1 text-xs text-muted-foreground">
                  Reconcile submitted 12-digit UTRs against institutional bank credits.
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="mt-2.5"
                  onClick={() => {
                    setNotificationsOpen(false);
                    onSelectSection("pending-verification");
                  }}
                >
                  Review Verification Queue
                </Button>
              </div>
            )}

            {role === "coordinator" ? (
              <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
                You have {stats[0]?.value ?? "0"} registrations across your assigned competitions.
              </div>
            ) : recentActivity.length === 0 && pendingVerificationsCount === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                No pending verifications or recent audit alerts.
              </div>
            ) : (
              recentActivity.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border border-border bg-card p-3 text-xs"
                >
                  <div className="font-medium text-foreground">
                    {item.actorName} {item.actionText}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {item.timeText} • {item.actorRole}
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </SidebarProvider>
  );
}

export default App1;
