import type { components, paths } from "./schema";

export type UserResponse = components["schemas"]["UserResponse"];
export type UserListResponse = components["schemas"]["UserListResponse"];
export type UserCreate = components["schemas"]["UserCreate"];
export type UserUpdate = components["schemas"]["UserUpdate"];
export type UserStatus = components["schemas"]["UserStatus"];
export type RoleResponse = components["schemas"]["RoleResponse"];
export type RoleCreate = components["schemas"]["RoleCreate"];
export type RoleRename = components["schemas"]["RoleRename"];
export type ModuleResponse = components["schemas"]["ModuleResponse"];
export type ModuleGroup = components["schemas"]["ModuleGroup"];
export type ProjectResponse = components["schemas"]["ProjectListItem"];
export type ProjectAccessInput = components["schemas"]["ProjectAccessInput"];
export type ProjectAccessResponse = components["schemas"]["ProjectAccessResponse"];
export type PermissionCell = components["schemas"]["PermissionCell"];
export type PermissionUpdate = components["schemas"]["PermissionUpdate"];
export type PasswordReset = components["schemas"]["PasswordReset"];
export type AccessLevel = components["schemas"]["AccessLevel"];
export type Scope = components["schemas"]["Scope"];
export type CompanyRead = components["schemas"]["CompanyRead"];
export type CompanyUpdate = components["schemas"]["CompanyUpdate"];
export type PreferencesRead = components["schemas"]["PreferencesRead"];
export type PreferencesUpdate = components["schemas"]["PreferencesUpdate"];
export type NotificationPrefItem = components["schemas"]["NotificationPrefItem"];
export type NotificationPrefsUpdate = components["schemas"]["NotificationPrefsUpdate"];
export type AuditAction = components["schemas"]["AuditAction"];
export type AuditActorRead = components["schemas"]["AuditActorRead"];
export type AuditItem = components["schemas"]["AuditItem"];
export type AuditListResponse = components["schemas"]["AuditListResponse"];

/** `/audit-log` sorgu parametreleri (limit/offset dahil). */
export type AuditLogQuery = NonNullable<paths["/audit-log"]["get"]["parameters"]["query"]>;
/** Excel dışa aktarımının sorgu parametreleri (limit/offset YOK). */
export type AuditExportQuery = NonNullable<paths["/audit-log/export.xlsx"]["get"]["parameters"]["query"]>;
