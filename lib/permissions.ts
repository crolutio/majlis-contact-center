import type { UserRole } from "@/contexts/auth-context"

export const rolePermissions: Record<UserRole, string[]> = {
  agent: [
    // Chat agents
    "conversations:respond",
    "handover:request",
    "knowledge-base:view",
    "agent-desktop:view",
    "chat-agent:view",
    "call-agent:view", // allow agent to access call agent page for demo
  ],
  call_agent: [
    // Voice agents
    "conversations:respond",
    "handover:request",
    "knowledge-base:view",
    "agent-desktop:view",
    "call-agent:view",
  ],
  supervisor: [
    "inbox:view",
    "inbox:respond",
    "inbox:team",
    "conversations:view",
    "conversations:respond",
    "conversations:monitor",
    "handover:manage",
    "live-console:view",
    "live-console:whisper",
    "live-console:barge",
    "analytics:view",
    "quality:view",
    "quality:evaluate",
    "coaching:view",
    "coaching:create",
    "escalation:manage",
    "reports:view",
    "knowledge-base:view",
    "knowledge-base:edit",
    "workflows:view",
    "agent-builder:view",
    "integrations:manage",
    // Supervisors do NOT have access to agent desktop views
  ],
  admin: [
    "inbox:view",
    "inbox:respond",
    "inbox:team",
    "conversations:view",
    "conversations:respond",
    "users:manage",
    "roles:manage",
    "channels:manage",
    "ai-config:manage",
    "security:manage",
    "compliance:manage",
    "audit-log:view",
    "settings:all",
    "analytics:view",
    "reports:view",
    "reports:schedule",
    "knowledge-base:view",
    "knowledge-base:edit",
    "knowledge-base:manage",
    "workflows:view",
    "workflows:manage",
    "automation:manage",
    "quality:view",
    "live-console:view",
    "agent-builder:view",
    "integrations:manage",
  ],
  analyst: [
    "analytics:view",
    "analytics:export",
    "reports:view",
    "reports:schedule",
    "quality:view",
    "inbox:view-readonly",
    "knowledge-base:view",
  ],
  back_office: ["back-office:view", "knowledge-base:view"],
}

export function hasPermission(role: UserRole, permission: string): boolean {
  return rolePermissions[role]?.includes(permission) ?? false
}

export function canAccessRoute(role: UserRole, route: string): boolean {
  const routePermissions: Record<string, string[]> = {
    "/inbox": ["inbox:view", "inbox:view-readonly"],
    "/agent-desktop": ["agent-desktop:view"],
    "/chat-agent": ["chat-agent:view"],
    "/call-agent": ["call-agent:view"],
    "/live-console": ["live-console:view"],
    "/analytics": ["analytics:view"],
    "/quality": ["quality:view"],
    "/settings": ["users:manage", "settings:all"],
    "/reports": ["reports:view"],
    "/knowledge": ["knowledge-base:view"],
    "/workflows": ["workflows:view"],
    "/automation": ["automation:manage"],
    "/agent-builder": ["agent-builder:view"],
    "/integrations": ["integrations:manage"],
    "/back-office": ["back-office:view"],
  }

  const requiredPermissions = routePermissions[route]
  if (!requiredPermissions) {
    // Back office should be tightly scoped: deny unknown routes by default.
    if (role === "back_office") return false
    return true
  }

  return requiredPermissions.some((p) => hasPermission(role, p))
}

const roleDefaultRoutes: Record<UserRole, string[]> = {
  agent: ["/chat-agent", "/call-agent", "/knowledge"],
  call_agent: ["/call-agent", "/chat-agent", "/knowledge"],
  supervisor: [
    "/inbox",
    "/live-console",
    "/analytics",
    "/quality",
    "/reports",
    "/knowledge",
    "/workflows",
    "/agent-builder",
    "/integrations",
    "/automation",
    "/settings",
  ],
  admin: [
    "/inbox",
    "/analytics",
    "/reports",
    "/quality",
    "/live-console",
    "/knowledge",
    "/workflows",
    "/agent-builder",
    "/integrations",
    "/automation",
    "/settings",
  ],
  analyst: ["/analytics", "/reports", "/quality", "/inbox", "/knowledge"],
  back_office: ["/back-office", "/knowledge"],
}

export function getDefaultRouteForRole(role: UserRole): string {
  const routes = roleDefaultRoutes[role] ?? ["/inbox"]
  const firstAllowed = routes.find((route) => canAccessRoute(role, route))
  return firstAllowed ?? "/inbox"
}
