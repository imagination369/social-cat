#!/usr/bin/env tsx
/**
 * Export Workflow Script
 *
 * Exports a workflow to JSON file format.
 *
 * Usage:
 *   npx tsx scripts/export-workflow.ts <workflow-id> [output-file]
 *   npx tsx scripts/export-workflow.ts abc123
 *   npx tsx scripts/export-workflow.ts abc123 my-workflow.json
 */

import { db } from '../src/lib/db';
import { workflowsTable } from '../src/lib/schema';
import { eq } from 'drizzle-orm';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

async function exportWorkflow(workflowId: string, outputFile?: string): Promise<void> {
  try {
    // Fetch workflow
    const workflows = await db
      .select()
      .from(workflowsTable)
      .where(eq(workflowsTable.id, workflowId))
      .limit(1);

    if (workflows.length === 0) {
      console.error(`❌ Workflow not found: ${workflowId}`);
      process.exit(1);
    }

    const workflow = workflows[0];
    console.log(`📦 Exporting workflow: ${workflow.name}`);

    // Parse JSON fields
    const config = typeof workflow.config === 'string' 
      ? JSON.parse(workflow.config) 
      : workflow.config;
    
    const trigger = typeof workflow.trigger === 'string'
      ? JSON.parse(workflow.trigger)
      : workflow.trigger;

    // Build export format
    const exported = {
      version: '1.0',
      name: workflow.name,
      description: workflow.description || '',
      trigger,
      config,
      metadata: {
        author: 'Exported from b0t',
        tags: [],
        category: 'utilities',
        requiresCredentials: [],
        exportedAt: new Date().toISOString(),
        originalId: workflowId,
      }
    };

    // Determine output file
    const fileName = outputFile || `${workflow.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    const filePath = resolve(process.cwd(), fileName);

    // Write to file
    writeFileSync(filePath, JSON.stringify(exported, null, 2));

    console.log(`\n✅ Workflow exported successfully!`);
    console.log(`   File: ${filePath}`);
    console.log(`   Name: ${workflow.name}`);
    console.log(`   Steps: ${config.steps?.length || 0}`);
    console.log(`   Trigger: ${trigger.type}`);
    console.log(`\n💡 Tip: Import this workflow later:`);
    console.log(`   npx tsx scripts/import-workflow.ts ${fileName}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to export workflow:', error);
    process.exit(1);
  }
}

// Parse CLI arguments
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
Usage:
  npx tsx scripts/export-workflow.ts <workflow-id> [output-file]

Arguments:
  workflow-id     ID of the workflow to export
  output-file     Optional output filename (defaults to workflow-name.json)

Examples:
  npx tsx scripts/export-workflow.ts abc123
  npx tsx scripts/export-workflow.ts abc123 my-workflow.json
  npx tsx scripts/export-workflow.ts abc123 workflows/backup.json

Tip: List workflows to find IDs:
  npx tsx scripts/list-workflows.ts
  `);
  process.exit(0);
}

const workflowId = args[0];
const outputFile = args[1];

exportWorkflow(workflowId, outputFile).catch(console.error);
