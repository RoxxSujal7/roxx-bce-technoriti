import * as React from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  ExternalLink,
  History,
  Home,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  ShieldCheck,
  TicketCheck,
  Trophy,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "./sidebar";
import { Badge } from "../badge";
import type { AdminRole, AdminSectionKey, AdminUserDisplay } from "./app-1-data";

interface App1SidebarProps {
  role: AdminRole;
  activeSection: AdminSectionKey;
  onSelectSection: (section: AdminSectionKey) => void;
  pendingVerificationsCount?: number;
  userDisplay: AdminUserDisplay;
  onSignOut: () => void;
}

export function App1Sidebar({
  role,
  activeSection,
  onSelectSection,
  pendingVerificationsCount = 0,
  userDisplay,
  onSignOut,
}: App1SidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();

  const handleNavClick = (section: AdminSectionKey) => {
    onSelectSection(section);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const navItems: Array<{
    key: AdminSectionKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    roles: AdminRole[];
    badge?: number;
  }> = [
    {
      key: "overview",
      label: "Dashboard Overview",
      icon: LayoutDashboard,
      roles: ["super_admin", "admin", "coordinator"],
    },
    {
      key: "registrations",
      label: role === "coordinator" ? "Assigned Roster" : "Registrations",
      icon: ClipboardList,
      roles: ["super_admin", "admin", "coordinator"],
    },
    {
      key: "pending-verification",
      label: "Payment Verification",
      icon: CreditCard,
      roles: ["super_admin", "admin"],
      badge: pendingVerificationsCount > 0 ? pendingVerificationsCount : undefined,
    },
    {
      key: "competitions",
      label: "Competitions & Tariffs",
      icon: Trophy,
      roles: ["super_admin", "admin"],
    },
    {
      key: "staff",
      label: "Admins & Coordinators",
      icon: ShieldCheck,
      roles: ["super_admin"],
    },
    {
      key: "audit",
      label: "Audit Logs",
      icon: History,
      roles: ["super_admin", "admin"],
    },
    {
      key: "security",
      label: "Security & MFA",
      icon: LockKeyhole,
      roles: ["super_admin", "admin"],
    },
  ];

  const visibleNavItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-extrabold tracking-wide text-foreground">
              TECHNORITI <span className="text-primary">'26</span>
            </div>
            <div className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">
              BCE Bhagalpur Desk
            </div>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
            {userDisplay.roleLabel}
          </Badge>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      isActive={activeSection === item.key}
                      onClick={() => handleNavClick(item.key)}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate flex-1">{item.label}</span>
                      {item.badge !== undefined && (
                        <Badge className="ml-auto h-5 px-1.5 text-[10px] tabular-nums">
                          {item.badge}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Festival Portal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link
                  to="/"
                  onClick={() => isMobile && setOpenMobile(false)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-sidebar-foreground no-underline transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                >
                  <Home className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate flex-1">Public Homepage</span>
                  <ExternalLink className="h-3 w-3 opacity-50" aria-hidden="true" />
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link
                  to="/events"
                  onClick={() => isMobile && setOpenMobile(false)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-sidebar-foreground no-underline transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                >
                  <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate flex-1">29 Competitions</span>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link
                  to="/dashboard"
                  onClick={() => isMobile && setOpenMobile(false)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-sidebar-foreground no-underline transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                >
                  <TicketCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate flex-1">My Delegate Passes</span>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="mb-1 min-w-0 px-1">
          <div className="truncate text-xs font-semibold text-foreground">
            {userDisplay.name}
          </div>
          {userDisplay.email && (
            <div className="truncate text-[11px] text-muted-foreground">
              {userDisplay.email}
            </div>
          )}
        </div>
        <SidebarMenuButton
          onClick={onSignOut}
          className="text-red-400 hover:bg-destructive hover:text-destructive-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Sign Out</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}

export default App1Sidebar;
