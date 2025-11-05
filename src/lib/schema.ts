import { sql } from 'drizzle-orm';
import { text, integer, sqliteTable, index as sqliteIndex, uniqueIndex as sqliteUniqueIndex } from 'drizzle-orm/sqlite-core';
import { pgTable, serial, text as pgText, timestamp, varchar, integer as pgInteger, index as pgIndex, uniqueIndex as pgUniqueIndex, jsonb as pgJsonb } from 'drizzle-orm/pg-core';

// Determine which database to use based on environment
const useSQLite = !process.env.DATABASE_URL;

// ============================================
// AUTHENTICATION TABLES
// ============================================

// User authentication tables for SQLite
export const accountsTableSQLite = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  account_name: text('account_name'), // Display name
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (table) => ({
  userIdIdx: sqliteIndex('accounts_user_id_idx').on(table.userId),
  providerIdx: sqliteIndex('accounts_provider_idx').on(table.provider),
  userProviderIdx: sqliteIndex('accounts_user_provider_idx').on(table.userId, table.provider),
  providerAccountIdx: sqliteUniqueIndex('accounts_provider_account_idx').on(table.provider, table.providerAccountId),
}));

// User authentication tables for PostgreSQL
export const accountsTablePostgres = pgTable('accounts', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  type: varchar('type', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  account_name: varchar('account_name', { length: 255 }),
  refresh_token: pgText('refresh_token'),
  access_token: pgText('access_token'),
  expires_at: pgInteger('expires_at'),
  token_type: varchar('token_type', { length: 255 }),
  scope: pgText('scope'),
  id_token: pgText('id_token'),
  session_state: pgText('session_state'),
}, (table) => ({
  userIdIdx: pgIndex('accounts_user_id_idx').on(table.userId),
  providerIdx: pgIndex('accounts_provider_idx').on(table.provider),
  userProviderIdx: pgIndex('accounts_user_provider_idx').on(table.userId, table.provider),
  providerAccountIdx: pgUniqueIndex('accounts_provider_account_idx').on(table.provider, table.providerAccountId),
}));

// OAuth state table for SQLite (temporary storage during OAuth flow)
export const oauthStateTableSQLite = sqliteTable('oauth_state', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  state: text('state').notNull().unique(),
  codeVerifier: text('code_verifier').notNull(),
  userId: text('user_id').notNull(),
  provider: text('provider').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  userIdIdx: sqliteIndex('oauth_state_user_id_idx').on(table.userId),
  createdAtIdx: sqliteIndex('oauth_state_created_at_idx').on(table.createdAt),
}));

// OAuth state table for PostgreSQL
export const oauthStateTablePostgres = pgTable('oauth_state', {
  id: serial('id').primaryKey(),
  state: varchar('state', { length: 255 }).notNull().unique(),
  codeVerifier: pgText('code_verifier').notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: pgIndex('oauth_state_user_id_idx').on(table.userId),
  createdAtIdx: pgIndex('oauth_state_created_at_idx').on(table.createdAt),
}));

// Users table for SQLite (multi-user authentication)
export const usersTableSQLite = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(), // Hashed password
  name: text('name'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  emailIdx: sqliteUniqueIndex('users_email_idx').on(table.email),
}));

// Users table for PostgreSQL
export const usersTablePostgres = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  emailVerified: pgInteger('email_verified').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  emailIdx: pgUniqueIndex('users_email_idx').on(table.email),
}));

// Invitations table for SQLite (email invitations to organizations)
export const invitationsTableSQLite = sqliteTable('invitations', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(),
  email: text('email').notNull(),
  organizationId: text('organization_id').notNull(),
  role: text('role').notNull().default('member'), // owner | admin | member | viewer
  invitedBy: text('invited_by').notNull(), // userId of admin who sent invite
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  acceptedAt: integer('accepted_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  tokenIdx: sqliteUniqueIndex('invitations_token_idx').on(table.token),
  emailIdx: sqliteIndex('invitations_email_idx').on(table.email),
  orgIdx: sqliteIndex('invitations_org_idx').on(table.organizationId),
  expiresAtIdx: sqliteIndex('invitations_expires_at_idx').on(table.expiresAt),
}));

// Invitations table for PostgreSQL
export const invitationsTablePostgres = pgTable('invitations', {
  id: varchar('id', { length: 255 }).primaryKey(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull(),
  organizationId: varchar('organization_id', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('member'),
  invitedBy: varchar('invited_by', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  tokenIdx: pgUniqueIndex('invitations_token_idx').on(table.token),
  emailIdx: pgIndex('invitations_email_idx').on(table.email),
  orgIdx: pgIndex('invitations_org_idx').on(table.organizationId),
  expiresAtIdx: pgIndex('invitations_expires_at_idx').on(table.expiresAt),
}));

// ============================================
// SYSTEM TABLES
// ============================================

// App settings table for SQLite (stores user preferences and configurations)
export const appSettingsTableSQLite = sqliteTable('app_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  keyIdx: sqliteIndex('app_settings_key_idx').on(table.key),
}));

// App settings table for PostgreSQL
export const appSettingsTablePostgres = pgTable('app_settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  value: pgText('value').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  keyIdx: pgIndex('app_settings_key_idx').on(table.key),
}));

// Job logs table for SQLite (tracks job execution history)
export const jobLogsTableSQLite = sqliteTable('job_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobName: text('job_name').notNull(),
  status: text('status').notNull(), // success, error, warning
  message: text('message').notNull(),
  details: text('details'), // JSON string with additional data
  duration: integer('duration'), // Execution time in milliseconds
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  jobNameIdx: sqliteIndex('job_logs_job_name_idx').on(table.jobName),
  statusIdx: sqliteIndex('job_logs_status_idx').on(table.status),
  createdAtIdx: sqliteIndex('job_logs_created_at_idx').on(table.createdAt),
}));

// Job logs table for PostgreSQL
export const jobLogsTablePostgres = pgTable('job_logs', {
  id: serial('id').primaryKey(),
  jobName: varchar('job_name', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  message: pgText('message').notNull(),
  details: pgText('details'),
  duration: pgInteger('duration'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  jobNameIdx: pgIndex('job_logs_job_name_idx').on(table.jobName),
  statusIdx: pgIndex('job_logs_status_idx').on(table.status),
  createdAtIdx: pgIndex('job_logs_created_at_idx').on(table.createdAt),
}));

// ============================================
// MULTI-TENANCY TABLES
// ============================================

// Organizations table for SQLite
export const organizationsTableSQLite = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  ownerId: text('owner_id').notNull(),
  plan: text('plan').notNull().default('free'), // free | pro | enterprise
  status: text('status').notNull().default('active'), // active | inactive
  settings: text('settings', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  ownerIdIdx: sqliteIndex('organizations_owner_id_idx').on(table.ownerId),
  slugIdx: sqliteIndex('organizations_slug_idx').on(table.slug),
}));

// Organizations table for PostgreSQL
export const organizationsTablePostgres = pgTable('organizations', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  ownerId: varchar('owner_id', { length: 255 }).notNull(),
  plan: varchar('plan', { length: 50 }).notNull().default('free'),
  status: varchar('status', { length: 50 }).notNull().default('active'), // active | inactive
  settings: pgText('settings').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  ownerIdIdx: pgIndex('organizations_owner_id_idx').on(table.ownerId),
  slugIdx: pgIndex('organizations_slug_idx').on(table.slug),
}));

// Organization members table for SQLite
export const organizationMembersTableSQLite = sqliteTable('organization_members', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  userId: text('user_id').notNull(),
  role: text('role').notNull().default('member'), // owner | admin | member | viewer
  joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  orgIdIdx: sqliteIndex('organization_members_org_id_idx').on(table.organizationId),
  userIdIdx: sqliteIndex('organization_members_user_id_idx').on(table.userId),
  orgUserIdx: sqliteIndex('organization_members_org_user_idx').on(table.organizationId, table.userId),
}));

// Organization members table for PostgreSQL
export const organizationMembersTablePostgres = pgTable('organization_members', {
  id: varchar('id', { length: 255 }).primaryKey(),
  organizationId: varchar('organization_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('member'),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
}, (table) => ({
  orgIdIdx: pgIndex('organization_members_org_id_idx').on(table.organizationId),
  userIdIdx: pgIndex('organization_members_user_id_idx').on(table.userId),
  orgUserIdx: pgIndex('organization_members_org_user_idx').on(table.organizationId, table.userId),
}));

// ============================================
// WORKFLOW SYSTEM TABLES
// ============================================

// Workflows table for SQLite
export const workflowsTableSQLite = sqliteTable('workflows', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  organizationId: text('organization_id'),
  name: text('name').notNull(),
  description: text('description'),
  prompt: text('prompt').notNull(), // User's original prompt
  config: text('config', { mode: 'json' }).notNull().$type<{
    steps: Array<{
      id: string;
      module: string;
      inputs: Record<string, unknown>;
      outputAs?: string;
    }>;
  }>(),
  trigger: text('trigger', { mode: 'json' }).notNull().$type<{
    type: 'cron' | 'manual' | 'webhook' | 'telegram' | 'discord' | 'chat';
    config: Record<string, unknown>;
  }>(),
  status: text('status').notNull().default('draft'), // draft | active | paused | error
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  lastRun: integer('last_run', { mode: 'timestamp' }),
  lastRunStatus: text('last_run_status'),
  lastRunError: text('last_run_error'),
  lastRunOutput: text('last_run_output', { mode: 'json' }),
  runCount: integer('run_count').notNull().default(0),
}, (table) => ({
  userIdIdx: sqliteIndex('workflows_user_id_idx').on(table.userId),
  organizationIdIdx: sqliteIndex('workflows_organization_id_idx').on(table.organizationId),
  statusIdx: sqliteIndex('workflows_status_idx').on(table.status),
  triggerTypeIdx: sqliteIndex('workflows_trigger_type_idx').on(sql`json_extract(${table.trigger}, '$.type')`),
}));

// Workflows table for PostgreSQL
export const workflowsTablePostgres = pgTable('workflows', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  organizationId: varchar('organization_id', { length: 255 }),
  name: varchar('name', { length: 255 }).notNull(),
  description: pgText('description'),
  prompt: pgText('prompt').notNull(),
  config: pgText('config').notNull().$type<{
    steps: Array<{
      id: string;
      module: string;
      inputs: Record<string, unknown>;
      outputAs?: string;
    }>;
  }>(),
  trigger: pgText('trigger').notNull().$type<{
    type: 'cron' | 'manual' | 'webhook' | 'telegram' | 'discord' | 'chat';
    config: Record<string, unknown>;
  }>(),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastRun: timestamp('last_run'),
  lastRunStatus: varchar('last_run_status', { length: 50 }),
  lastRunError: pgText('last_run_error'),
  lastRunOutput: pgJsonb('last_run_output'),
  runCount: pgInteger('run_count').notNull().default(0),
}, (table) => ({
  userIdIdx: pgIndex('workflows_user_id_idx').on(table.userId),
  organizationIdIdx: pgIndex('workflows_organization_id_idx').on(table.organizationId),
  statusIdx: pgIndex('workflows_status_idx').on(table.status),
}));

// Workflow run history table for SQLite
export const workflowRunsTableSQLite = sqliteTable('workflow_runs', {
  id: text('id').primaryKey(),
  workflowId: text('workflow_id').notNull(),
  userId: text('user_id').notNull(),
  organizationId: text('organization_id'),
  status: text('status').notNull(), // running | success | error
  triggerType: text('trigger_type').notNull(),
  triggerData: text('trigger_data', { mode: 'json' }),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  duration: integer('duration'), // milliseconds
  output: text('output', { mode: 'json' }),
  error: text('error'),
  errorStep: text('error_step'),
}, (table) => ({
  workflowIdIdx: sqliteIndex('workflow_runs_workflow_id_idx').on(table.workflowId),
  userIdIdx: sqliteIndex('workflow_runs_user_id_idx').on(table.userId),
  organizationIdIdx: sqliteIndex('workflow_runs_organization_id_idx').on(table.organizationId),
  statusIdx: sqliteIndex('workflow_runs_status_idx').on(table.status),
  startedAtIdx: sqliteIndex('workflow_runs_started_at_idx').on(table.startedAt),
}));

// Workflow run history table for PostgreSQL
export const workflowRunsTablePostgres = pgTable('workflow_runs', {
  id: varchar('id', { length: 255 }).primaryKey(),
  workflowId: varchar('workflow_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  organizationId: varchar('organization_id', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull(),
  triggerType: varchar('trigger_type', { length: 50 }).notNull(),
  triggerData: pgText('trigger_data'),
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  duration: pgInteger('duration'),
  output: pgText('output'),
  error: pgText('error'),
  errorStep: varchar('error_step', { length: 255 }),
}, (table) => ({
  workflowIdIdx: pgIndex('workflow_runs_workflow_id_idx').on(table.workflowId),
  userIdIdx: pgIndex('workflow_runs_user_id_idx').on(table.userId),
  organizationIdIdx: pgIndex('workflow_runs_organization_id_idx').on(table.organizationId),
  statusIdx: pgIndex('workflow_runs_status_idx').on(table.status),
  startedAtIdx: pgIndex('workflow_runs_started_at_idx').on(table.startedAt),
}));

// User credentials table for SQLite (encrypted API keys, tokens, secrets)
export const userCredentialsTableSQLite = sqliteTable('user_credentials', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  organizationId: text('organization_id'),
  platform: text('platform').notNull(), // openai, anthropic, stripe, custom
  name: text('name').notNull(), // User-friendly name
  encryptedValue: text('encrypted_value').notNull(), // AES-256 encrypted
  type: text('type').notNull(), // api_key, token, secret, connection_string
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  lastUsed: integer('last_used', { mode: 'timestamp' }),
}, (table) => ({
  userIdIdx: sqliteIndex('user_credentials_user_id_idx').on(table.userId),
  organizationIdIdx: sqliteIndex('user_credentials_organization_id_idx').on(table.organizationId),
  platformIdx: sqliteIndex('user_credentials_platform_idx').on(table.platform),
  userPlatformIdx: sqliteIndex('user_credentials_user_platform_idx').on(table.userId, table.platform),
}));

// User credentials table for PostgreSQL
export const userCredentialsTablePostgres = pgTable('user_credentials', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  organizationId: varchar('organization_id', { length: 255 }),
  platform: varchar('platform', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  encryptedValue: pgText('encrypted_value').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  metadata: pgText('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastUsed: timestamp('last_used'),
}, (table) => ({
  userIdIdx: pgIndex('user_credentials_user_id_idx').on(table.userId),
  organizationIdIdx: pgIndex('user_credentials_organization_id_idx').on(table.organizationId),
  platformIdx: pgIndex('user_credentials_platform_idx').on(table.platform),
  userPlatformIdx: pgIndex('user_credentials_user_platform_idx').on(table.userId, table.platform),
}));

// ============================================
// EXPORTS
// ============================================

// Auth tables
export const accountsTable = useSQLite ? accountsTableSQLite : accountsTablePostgres;
export const oauthStateTable = useSQLite ? oauthStateTableSQLite : oauthStateTablePostgres;
export const usersTable = useSQLite ? usersTableSQLite : usersTablePostgres;
export const invitationsTable = useSQLite ? invitationsTableSQLite : invitationsTablePostgres;

// System tables
export const appSettingsTable = useSQLite ? appSettingsTableSQLite : appSettingsTablePostgres;
export const jobLogsTable = useSQLite ? jobLogsTableSQLite : jobLogsTablePostgres;

// Multi-tenancy tables
export const organizationsTable = useSQLite ? organizationsTableSQLite : organizationsTablePostgres;
export const organizationMembersTable = useSQLite ? organizationMembersTableSQLite : organizationMembersTablePostgres;

// Workflow tables
export const workflowsTable = useSQLite ? workflowsTableSQLite : workflowsTablePostgres;
export const workflowRunsTable = useSQLite ? workflowRunsTableSQLite : workflowRunsTablePostgres;
export const userCredentialsTable = useSQLite ? userCredentialsTableSQLite : userCredentialsTablePostgres;

// ============================================
// TYPE EXPORTS
// ============================================

export type Account = typeof accountsTableSQLite.$inferSelect;
export type NewAccount = typeof accountsTableSQLite.$inferInsert;
export type OAuthState = typeof oauthStateTableSQLite.$inferSelect;
export type NewOAuthState = typeof oauthStateTableSQLite.$inferInsert;
export type User = typeof usersTableSQLite.$inferSelect;
export type NewUser = typeof usersTableSQLite.$inferInsert;
export type Invitation = typeof invitationsTableSQLite.$inferSelect;
export type NewInvitation = typeof invitationsTableSQLite.$inferInsert;
export type AppSetting = typeof appSettingsTableSQLite.$inferSelect;
export type NewAppSetting = typeof appSettingsTableSQLite.$inferInsert;
export type JobLog = typeof jobLogsTableSQLite.$inferSelect;
export type NewJobLog = typeof jobLogsTableSQLite.$inferInsert;
export type Organization = typeof organizationsTableSQLite.$inferSelect;
export type NewOrganization = typeof organizationsTableSQLite.$inferInsert;
export type OrganizationMember = typeof organizationMembersTableSQLite.$inferSelect;
export type NewOrganizationMember = typeof organizationMembersTableSQLite.$inferInsert;
export type Workflow = typeof workflowsTableSQLite.$inferSelect;
export type NewWorkflow = typeof workflowsTableSQLite.$inferInsert;
export type WorkflowRun = typeof workflowRunsTableSQLite.$inferSelect;
export type NewWorkflowRun = typeof workflowRunsTableSQLite.$inferInsert;
export type UserCredential = typeof userCredentialsTableSQLite.$inferSelect;
export type NewUserCredential = typeof userCredentialsTableSQLite.$inferInsert;
