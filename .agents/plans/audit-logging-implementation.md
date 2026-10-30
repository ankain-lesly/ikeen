# Implementation Plan: Audit Logging System

## Context
The goal is to implement an audit logging system that tracks MCP usage activities, provides an API to fetch these logs, and creates a gated UI screen in both mobile and web applications for admins to view and filter these logs.

## Critical Files to Modify

### Backend (`apps/api`)
- **`apps/api/src/modules/audit/audit.controller.ts` (NEW)**: Create a new controller for `GET /audit-logs` with filtering (pagination, event type, source, date range).
- **`apps/api/src/modules/audit/audit.service.ts`**: Add a method to fetch paginated/filtered logs.
- **`apps/api/src/modules/audit/audit.module.ts`**: Register the new controller.
- **`apps/api/src/modules/mcp/controllers/mcp.controller.ts`**: Ensure MCP usage is being logged correctly via `AuditService.logAgent` or similar.

### Mobile (`apps/mobile`)
- **`apps/mobile/src/app/(tabs)/profile/audit.tsx` (NEW)**: Create the audit log screen.
- **`apps/mobile/src/app/(tabs)/profile/index.tsx`**: Add the link to the audit log screen, gated by admin role.

### Web (`apps/web`)
- **`apps/web/src/app/profile/audit/page.tsx` (NEW)**: Create the audit log screen.
- **`apps/web/src/components/profile-sidebar.tsx`**: Add the link to the audit log screen, gated by admin role.

## Implementation Steps

1. **Backend API**:
   - Create `AuditController` to fetch logs.
   - Implement `AuditService.getLogs(filters)` using Prisma.
   - Use `AuthGuard` or `AdminGuard` to protect the endpoint.
2. **Mobile UI**:
   - Create a screen for displaying the logs with tabs/filtering capabilities.
   - Fetch logs from the API and display them in a list or table.
   - Gate the screen by user role.
3. **Web UI**:
   - Create a corresponding screen for web.
   - Apply same gating logic.

## Verification
1. **API**: Test `GET /api/v1/audit-logs` with admin and non-admin tokens.
2. **Mobile/Web UI**: Verify that the audit log screen is accessible only to admins, and tabs for filtering logs work correctly.
3. **Audit Log Functionality**: Verify that MCP usage logs appear in the list.
