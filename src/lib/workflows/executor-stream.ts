import { useSQLite, sqliteDb, postgresDb } from '@/lib/db';
import {
  workflowsTableSQLite,
  workflowRunsTableSQLite,
  workflowsTablePostgres,
  workflowRunsTablePostgres,
  organizationsTableSQLite,
  organizationsTablePostgres
} from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { randomUUID } from 'crypto';
import { executeStep, normalizeStep, type WorkflowStep } from './control-flow';

/**
 * Progress Event Types
 * Events emitted during workflow execution for real-time UI updates
 */
export type ProgressEvent =
  | { type: 'workflow_started'; workflowId: string; runId: string; totalSteps: number }
  | { type: 'step_started'; stepId: string; stepIndex: number; totalSteps: number; module: string }
  | { type: 'step_completed'; stepId: string; stepIndex: number; duration: number; output?: unknown }
  | { type: 'step_failed'; stepId: string; stepIndex: number; error: string }
  | { type: 'workflow_completed'; runId: string; duration: number; output?: unknown }
  | { type: 'workflow_failed'; runId: string; error: string; errorStep?: string };

export type ProgressCallback = (event: ProgressEvent) => void;

/**
 * Execute a workflow with real-time progress streaming
 * Same as executeWorkflow but emits progress events via callback
 */
export async function executeWorkflowWithProgress(
  workflowId: string,
  userId: string,
  triggerType: string,
  triggerData?: Record<string, unknown>,
  onProgress?: ProgressCallback
): Promise<{ success: boolean; output?: unknown; error?: string; errorStep?: string }> {
  logger.info({ workflowId, userId, triggerType }, 'Starting workflow execution with progress streaming');

  const runId = randomUUID();
  const startedAt = new Date();

  try {
    // Get workflow configuration
    let workflow;
    if (useSQLite) {
      if (!sqliteDb) throw new Error('SQLite database not initialized');
      const workflows = await sqliteDb
        .select()
        .from(workflowsTableSQLite)
        .where(eq(workflowsTableSQLite.id, workflowId))
        .limit(1);

      if (workflows.length === 0) {
        throw new Error(`Workflow ${workflowId} not found`);
      }
      workflow = workflows[0];
    } else {
      if (!postgresDb) throw new Error('PostgreSQL database not initialized');
      const workflows = await postgresDb
        .select()
        .from(workflowsTablePostgres)
        .where(eq(workflowsTablePostgres.id, workflowId))
        .limit(1);

      if (workflows.length === 0) {
        throw new Error(`Workflow ${workflowId} not found`);
      }
      workflow = workflows[0];
    }

    // Check organization status
    if (workflow.organizationId) {
      let organization;
      if (useSQLite) {
        if (!sqliteDb) throw new Error('SQLite database not initialized');
        const orgs = await sqliteDb
          .select()
          .from(organizationsTableSQLite)
          .where(eq(organizationsTableSQLite.id, workflow.organizationId))
          .limit(1);
        organization = orgs[0];
      } else {
        if (!postgresDb) throw new Error('PostgreSQL database not initialized');
        const orgs = await postgresDb
          .select()
          .from(organizationsTablePostgres)
          .where(eq(organizationsTablePostgres.id, workflow.organizationId))
          .limit(1);
        organization = orgs[0];
      }

      if (organization && organization.status === 'inactive') {
        throw new Error('Cannot execute workflow: client organization is inactive');
      }
    }

    // Create workflow run record
    if (useSQLite) {
      if (!sqliteDb) throw new Error('SQLite database not initialized');
      await sqliteDb.insert(workflowRunsTableSQLite).values({
        id: runId,
        workflowId,
        userId,
        status: 'running',
        triggerType,
        triggerData: triggerData ? JSON.stringify(triggerData) : null,
        startedAt,
      });
    } else {
      if (!postgresDb) throw new Error('PostgreSQL database not initialized');
      await postgresDb.insert(workflowRunsTablePostgres).values({
        id: runId,
        workflowId,
        userId,
        organizationId: workflow.organizationId ? workflow.organizationId : null,
        status: 'running',
        triggerType,
        triggerData: triggerData ? JSON.stringify(triggerData) : null,
        startedAt,
      });
    }

    // Parse config
    const config = (typeof workflow.config === 'string'
      ? JSON.parse(workflow.config)
      : workflow.config) as {
      steps: Array<{
        id: string;
        module: string;
        inputs: Record<string, unknown>;
        outputAs?: string;
      }>;
    };

    logger.info({ workflowId, stepCount: config.steps.length }, 'Executing workflow steps');

    // Emit workflow started event
    onProgress?.({
      type: 'workflow_started',
      workflowId,
      runId,
      totalSteps: config.steps.length,
    });

    // Load user credentials
    const userCredentials = await loadUserCredentials(userId);

    // Initialize execution context
    const context = {
      variables: {
        user: {
          id: userId,
          ...userCredentials,
        },
        trigger: triggerData || {},
        ...userCredentials,
      },
      workflowId,
      runId,
      userId,
    };

    let lastOutput: unknown = null;

    // Execute steps sequentially with progress tracking
    for (let i = 0; i < config.steps.length; i++) {
      const step = config.steps[i];
      const normalizedStep = normalizeStep(step) as WorkflowStep;
      const stepStartTime = Date.now();

      logger.info({ workflowId, runId, stepId: normalizedStep.id, stepIndex: i }, 'Executing step');

      // Emit step started event
      const modulePath = 'module' in normalizedStep ? (normalizedStep.module as string) : 'unknown';
      onProgress?.({
        type: 'step_started',
        stepId: normalizedStep.id,
        stepIndex: i,
        totalSteps: config.steps.length,
        module: modulePath,
      });

      try {
        // Execute step (supports actions, conditions, loops)
        lastOutput = await executeStep(
          normalizedStep,
          context,
          executeModuleFunction,
          resolveVariables
        );

        const stepDuration = Date.now() - stepStartTime;

        // Emit step completed event
        onProgress?.({
          type: 'step_completed',
          stepId: normalizedStep.id,
          stepIndex: i,
          duration: stepDuration,
          output: lastOutput,
        });
      } catch (error) {
        logger.error({ error, workflowId, runId, stepId: normalizedStep.id }, 'Step execution failed');

        // Emit step failed event
        onProgress?.({
          type: 'step_failed',
          stepId: normalizedStep.id,
          stepIndex: i,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Update workflow run with error
        const completedAt = new Date();
        if (useSQLite && sqliteDb) {
          await sqliteDb
            .update(workflowRunsTableSQLite)
            .set({
              status: 'error',
              completedAt,
              duration: completedAt.getTime() - startedAt.getTime(),
              error: error instanceof Error ? error.message : 'Unknown error',
              errorStep: step.id,
            })
            .where(eq(workflowRunsTableSQLite.id, runId));

          await sqliteDb
            .update(workflowsTableSQLite)
            .set({
              lastRun: completedAt,
              lastRunStatus: 'error',
              lastRunError: error instanceof Error ? error.message : 'Unknown error',
              runCount: workflow.runCount + 1,
            })
            .where(eq(workflowsTableSQLite.id, workflowId));
        } else if (postgresDb) {
          await postgresDb
            .update(workflowRunsTablePostgres)
            .set({
              status: 'error',
              completedAt,
              duration: completedAt.getTime() - startedAt.getTime(),
              error: error instanceof Error ? error.message : 'Unknown error',
              errorStep: step.id,
            })
            .where(eq(workflowRunsTablePostgres.id, runId));

          await postgresDb
            .update(workflowsTablePostgres)
            .set({
              lastRun: completedAt,
              lastRunStatus: 'error',
              lastRunError: error instanceof Error ? error.message : 'Unknown error',
              runCount: workflow.runCount + 1,
            })
            .where(eq(workflowsTablePostgres.id, workflowId));
        }

        // Emit workflow failed event
        onProgress?.({
          type: 'workflow_failed',
          runId,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorStep: normalizedStep.id,
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorStep: normalizedStep.id,
        };
      }
    }

    // Update workflow run with success
    const completedAt = new Date();
    const totalDuration = completedAt.getTime() - startedAt.getTime();

    if (useSQLite && sqliteDb) {
      await sqliteDb
        .update(workflowRunsTableSQLite)
        .set({
          status: 'success',
          completedAt,
          duration: totalDuration,
          output: lastOutput ? JSON.stringify(lastOutput) : null,
        })
        .where(eq(workflowRunsTableSQLite.id, runId));

      await sqliteDb
        .update(workflowsTableSQLite)
        .set({
          lastRun: completedAt,
          lastRunStatus: 'success',
          lastRunError: null,
          runCount: workflow.runCount + 1,
        })
        .where(eq(workflowsTableSQLite.id, workflowId));
    } else if (postgresDb) {
      await postgresDb
        .update(workflowRunsTablePostgres)
        .set({
          status: 'success',
          completedAt,
          duration: totalDuration,
          output: lastOutput ? JSON.stringify(lastOutput) : null,
        })
        .where(eq(workflowRunsTablePostgres.id, runId));

      await postgresDb
        .update(workflowsTablePostgres)
        .set({
          lastRun: completedAt,
          lastRunStatus: 'success',
          lastRunError: null,
          runCount: workflow.runCount + 1,
        })
        .where(eq(workflowsTablePostgres.id, workflowId));
    }

    logger.info({ workflowId, runId, duration: totalDuration }, 'Workflow execution completed');

    // Emit workflow completed event
    onProgress?.({
      type: 'workflow_completed',
      runId,
      duration: totalDuration,
      output: lastOutput,
    });

    return { success: true, output: lastOutput };
  } catch (error) {
    logger.error({ error, workflowId, userId }, 'Workflow execution failed');

    // Update workflow run with error if it exists
    try {
      const completedAt = new Date();
      if (useSQLite && sqliteDb) {
        await sqliteDb
          .update(workflowRunsTableSQLite)
          .set({
            status: 'error',
            completedAt,
            duration: completedAt.getTime() - startedAt.getTime(),
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          .where(eq(workflowRunsTableSQLite.id, runId));
      } else if (postgresDb) {
        await postgresDb
          .update(workflowRunsTablePostgres)
          .set({
            status: 'error',
            completedAt,
            duration: completedAt.getTime() - startedAt.getTime(),
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          .where(eq(workflowRunsTablePostgres.id, runId));
      }
    } catch (updateError) {
      logger.error({ updateError }, 'Failed to update workflow run status');
    }

    // Emit workflow failed event
    onProgress?.({
      type: 'workflow_failed',
      runId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Helper functions (copied from executor.ts to avoid circular dependency)

function resolveVariables(
  inputs: Record<string, unknown>,
  variables: Record<string, unknown>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(inputs)) {
    resolved[key] = resolveValue(value, variables);
  }

  return resolved;
}

function resolveValue(value: unknown, variables: Record<string, unknown>): unknown {
  if (typeof value === 'string') {
    const match = value.match(/^{{(.+)}}$/);
    if (match) {
      const path = match[1];
      return getNestedValue(variables, path);
    }

    return value.replace(/{{(.+?)}}/g, (_, path) => {
      const resolved = getNestedValue(variables, path);
      return String(resolved ?? '');
    });
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, variables));
  }

  if (value && typeof value === 'object') {
    const resolved: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      resolved[k] = resolveValue(v, variables);
    }
    return resolved;
  }

  return value;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(/\.|\[|\]/).filter(Boolean);
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return current;
}

const CATEGORY_FOLDER_MAP: Record<string, string> = {
  'communication': 'communication',
  'social media': 'social',
  'ai': 'ai',
  'data': 'data',
  'utilities': 'utilities',
  'payments': 'payments',
  'productivity': 'productivity',
  'business': 'business',
  'content': 'content',
  'data processing': 'dataprocessing',
  'developer tools': 'devtools',
  'dev tools': 'devtools',
  'e-commerce': 'ecommerce',
  'ecommerce': 'ecommerce',
  'lead generation': 'leads',
  'leads': 'leads',
  'video automation': 'video',
  'video': 'video',
  'external apis': 'external-apis',
  'external-apis': 'external-apis',
};

async function executeModuleFunction(
  modulePath: string,
  inputs: Record<string, unknown>
): Promise<unknown> {
  logger.info({ modulePath, inputs }, 'Executing module function');

  const parts = modulePath.split('.');

  let categoryName: string | undefined;
  let moduleName: string | undefined;
  let functionName: string | undefined;

  if (parts.length >= 3) {
    if (parts.length >= 4) {
      const twoWordCategory = `${parts[0]} ${parts[1]}`.toLowerCase();
      if (CATEGORY_FOLDER_MAP[twoWordCategory]) {
        categoryName = CATEGORY_FOLDER_MAP[twoWordCategory];
        moduleName = parts[2];
        functionName = parts[3];
      }
    }

    if (!categoryName) {
      const oneWordCategory = parts[0].toLowerCase();
      if (CATEGORY_FOLDER_MAP[oneWordCategory]) {
        categoryName = CATEGORY_FOLDER_MAP[oneWordCategory];
        moduleName = parts[1];
        functionName = parts[2];
      }
    }
  }

  if (!categoryName || !moduleName || !functionName) {
    throw new Error(`Invalid module path: ${modulePath}. Expected format: category.module.function`);
  }

  try {
    const moduleFile = await import(`@/modules/${categoryName}/${moduleName}`);

    if (!moduleFile[functionName]) {
      throw new Error(`Function ${functionName} not found in module ${categoryName}/${moduleName}`);
    }

    const func = moduleFile[functionName];

    if (modulePath.includes('youtube') || modulePath.includes('searchVideos')) {
      logger.info({
        modulePath,
        functionName,
        inputKeys: Object.keys(inputs),
        hasApiKey: 'apiKey' in inputs,
        apiKeyValue: inputs.apiKey ? `${String(inputs.apiKey).substring(0, 10)}...` : 'MISSING'
      }, 'Executing YouTube function with inputs');
    }

    const func_str = func.toString();
    const paramMatch = func_str.match(/\(([^)]*)\)/);
    const params = paramMatch?.[1]?.trim() || '';

    const hasObjectParam = params.startsWith('{') || (params.includes(':') && !params.includes(','));

    const inputKeys = Object.keys(inputs);

    if (inputKeys.length === 0) {
      return await func();
    } else if (inputKeys.length === 1 && !hasObjectParam) {
      return await func(Object.values(inputs)[0]);
    } else if (hasObjectParam) {
      return await func(inputs);
    } else {
      const paramNames = params
        .split(',')
        .map((p: string) => {
          return p.split(':')[0].split('=')[0].trim().replace(/[{}]/g, '');
        })
        .filter(Boolean);

      logger.debug({
        functionParams: paramNames,
        inputKeys: Object.keys(inputs),
        msg: 'Parameter mapping analysis'
      });

      const paramAliases: Record<string, string[]> = {
        'days': ['amount', 'value', 'number'],
        'hours': ['amount', 'value', 'number'],
        'minutes': ['amount', 'value', 'number'],
        'limit': ['maxResults', 'max', 'count'],
        'query': ['search', 'q', 'term'],
        'text': ['message', 'content', 'body'],
      };

      const orderedValues: unknown[] = [];
      const mappingLog: string[] = [];
      let hasAllParams = true;

      for (const paramName of paramNames) {
        let value: unknown = undefined;
        let matchedKey: string | undefined;

        if (paramName in inputs) {
          value = inputs[paramName];
          matchedKey = paramName;
        } else {
          const aliases = paramAliases[paramName] || [];
          for (const alias of aliases) {
            if (alias in inputs) {
              value = inputs[alias];
              matchedKey = alias;
              break;
            }
          }
        }

        if (matchedKey !== undefined) {
          orderedValues.push(value);
          mappingLog.push(`${paramName}=${JSON.stringify(value)} (from ${matchedKey})`);
        } else {
          hasAllParams = false;
          break;
        }
      }

      if (hasAllParams && orderedValues.length === paramNames.length) {
        logger.debug({
          msg: 'Mapped parameters to function signature order (with aliases)',
          mapping: mappingLog
        });
        return await func(...orderedValues);
      }

      if (inputKeys.length === paramNames.length) {
        const positionalValues = Object.values(inputs);
        logger.warn({
          msg: 'Using positional parameter matching (input names do not match function signature)',
          expectedParams: paramNames,
          providedInputs: Object.keys(inputs),
          modulePath
        });
        return await func(...positionalValues);
      }

      const errorMsg = `Parameter mismatch for ${modulePath}: Function expects [${paramNames.join(', ')}] but workflow provided [${Object.keys(inputs).join(', ')}]`;
      logger.error({
        modulePath,
        expectedParams: paramNames,
        providedInputs: Object.keys(inputs),
        msg: errorMsg
      });
      throw new Error(errorMsg);
    }
  } catch (error) {
    logger.error({
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: error.cause
      } : error,
      modulePath,
      inputs,
      msg: 'Module function execution failed'
    });
    throw new Error(
      `Failed to execute ${modulePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function loadUserCredentials(userId: string): Promise<Record<string, string>> {
  try {
    const credentialMap: Record<string, string> = {};

    if (useSQLite) {
      if (!sqliteDb) throw new Error('SQLite database not initialized');

      const { accountsTableSQLite, userCredentialsTableSQLite } = await import('@/lib/schema');
      const accounts = await sqliteDb
        .select()
        .from(accountsTableSQLite)
        .where(eq(accountsTableSQLite.userId, userId));

      for (const account of accounts) {
        if (account.access_token) {
          const { decrypt } = await import('@/lib/encryption');
          const decryptedToken = await decrypt(account.access_token);
          credentialMap[account.provider] = decryptedToken;
        }
      }

      const credentials = await sqliteDb
        .select()
        .from(userCredentialsTableSQLite)
        .where(eq(userCredentialsTableSQLite.userId, userId));

      for (const cred of credentials) {
        if (cred.encryptedValue) {
          const { decrypt } = await import('@/lib/encryption');
          const decryptedValue = await decrypt(cred.encryptedValue);
          credentialMap[cred.platform] = decryptedValue;
        }
      }
    } else {
      if (!postgresDb) throw new Error('PostgreSQL database not initialized');

      const { accountsTablePostgres } = await import('@/lib/schema');
      const accounts = await postgresDb
        .select()
        .from(accountsTablePostgres)
        .where(eq(accountsTablePostgres.userId, userId));

      for (const account of accounts) {
        if (account.access_token) {
          const { decrypt } = await import('@/lib/encryption');
          const decryptedToken = await decrypt(account.access_token);
          credentialMap[account.provider] = decryptedToken;
        }
      }

      const { userCredentialsTablePostgres } = await import('@/lib/schema');
      const credentials = await postgresDb
        .select()
        .from(userCredentialsTablePostgres)
        .where(eq(userCredentialsTablePostgres.userId, userId));

      for (const cred of credentials) {
        if (cred.encryptedValue) {
          const { decrypt } = await import('@/lib/encryption');
          const decryptedValue = await decrypt(cred.encryptedValue);
          credentialMap[cred.platform] = decryptedValue;
        }
      }
    }

    const platformAliases: Record<string, string[]> = {
      'youtube': ['youtube_apikey', 'youtube'],
      'twitter': ['twitter_oauth2', 'twitter'],
      'github': ['github_oauth', 'github'],
      'google-sheets': ['googlesheets', 'googlesheets_oauth'],
      'googlesheets': ['googlesheets', 'googlesheets_oauth'],
      'google-calendar': ['googlecalendar', 'googlecalendar_serviceaccount'],
      'googlecalendar': ['googlecalendar', 'googlecalendar_serviceaccount'],
      'notion': ['notion_oauth', 'notion'],
      'airtable': ['airtable_oauth', 'airtable'],
      'hubspot': ['hubspot_oauth', 'hubspot'],
      'salesforce': ['salesforce_jwt', 'salesforce'],
      'slack': ['slack_oauth', 'slack'],
      'discord': ['discord_oauth', 'discord'],
      'stripe': ['stripe_connect', 'stripe'],
    };

    for (const [platformName, credentialIds] of Object.entries(platformAliases)) {
      const existingCred = credentialIds.find(id => credentialMap[id]);

      if (existingCred) {
        for (const aliasName of [platformName, ...credentialIds]) {
          if (!credentialMap[aliasName]) {
            credentialMap[aliasName] = credentialMap[existingCred];
          }
        }
      }
    }

    logger.info(
      {
        userId,
        credentialCount: Object.keys(credentialMap).length,
        platforms: Object.keys(credentialMap),
        credentialDetails: Object.keys(credentialMap).map(key => ({
          platform: key,
          hasValue: !!credentialMap[key],
          valueLength: credentialMap[key]?.length || 0
        }))
      },
      'User credentials loaded (OAuth + API keys + aliases)'
    );

    return credentialMap;
  } catch (error) {
    logger.error({ error, userId }, 'Failed to load user credentials');
    return {};
  }
}
