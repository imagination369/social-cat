#!/usr/bin/env tsx
/**
 * Validate Output Display Script
 *
 * Validates that workflow output display configuration matches the final step's return type.
 * Helps catch type mismatches that cause runtime errors.
 *
 * Usage:
 *   npx tsx scripts/validate-output-display.ts <workflow-file.json>
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

interface WorkflowStep {
  id: string;
  module: string;
  inputs: Record<string, unknown>;
  outputAs?: string;
}

interface OutputDisplay {
  type: 'table' | 'list' | 'text' | 'markdown' | 'json' | 'number' | 'auto';
  columns?: Array<{
    key: string;
    label: string;
    type: string;
  }>;
  content?: string;
}

interface Workflow {
  version: string;
  name: string;
  description: string;
  config: {
    steps: WorkflowStep[];
    returnValue?: string;
    outputDisplay?: OutputDisplay;
  };
}

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
  example?: string;
}

const issues: ValidationIssue[] = [];

// Module return type patterns
const MODULE_RETURN_TYPES: Record<string, string> = {
  // AI SDK - returns objects with .content
  'ai.ai-sdk.generateText': 'object',
  'ai.ai-sdk.chat': 'object',
  'ai.ai-sdk.streamText': 'stream',
  'ai.ai-sdk.generateJSON': 'object',

  // Array utilities
  'utilities.array-utils.range': 'array',
  'utilities.array-utils.fill': 'array',
  'utilities.array-utils.first': 'value|array',
  'utilities.array-utils.last': 'value|array',
  'utilities.array-utils.unique': 'array',
  'utilities.array-utils.flatten': 'array',
  'utilities.array-utils.chunk': 'array',
  'utilities.array-utils.shuffle': 'array',
  'utilities.array-utils.zipToObjects': 'array',
  'utilities.array-utils.pluck': 'array',
  'utilities.array-utils.sum': 'number',
  'utilities.array-utils.average': 'number',
  'utilities.array-utils.min': 'number',
  'utilities.array-utils.max': 'number',
  'utilities.array-utils.median': 'number',

  // String utilities
  'utilities.string-utils.concat': 'string',
  'utilities.string-utils.truncate': 'string',
  'utilities.string-utils.capitalize': 'string',
  'utilities.string-utils.wordCount': 'number',
  'utilities.string-utils.template': 'string',

  // Transform utilities
  'utilities.transform.renameFields': 'array',
  'utilities.transform.selectFields': 'array',
  'utilities.transform.castTypes': 'array',

  // Filtering utilities
  'utilities.filtering.filterArrayByCondition': 'array',
  'utilities.filtering.findItemByCondition': 'value|null',

  // Aggregation utilities
  'utilities.aggregation.groupAndAggregate': 'array',
  'utilities.aggregation.summarize': 'object',

  // Social media - typically return objects
  'social.twitter.createTweet': 'object',
  'social.twitter.postTweet': 'object',
  'social.reddit.getSubredditPosts': 'array',
  'social.reddit.searchPosts': 'array',
  'social.youtube.getVideoComments': 'array',
  'social.youtube.searchVideos': 'array',

  // Communication - typically return objects/void
  'communication.slack.postMessage': 'object',
  'communication.discord.sendMessage': 'object',
  'communication.email.sendEmail': 'object',
};

/**
 * Infer return type from module name
 */
function inferReturnType(moduleName: string): string {
  // Exact match
  if (MODULE_RETURN_TYPES[moduleName]) {
    return MODULE_RETURN_TYPES[moduleName];
  }

  // Pattern matching
  if (moduleName.startsWith('ai.ai-sdk.')) return 'object';
  if (moduleName.includes('.list') || moduleName.includes('.search')) return 'array';
  if (moduleName.includes('.get') && moduleName.includes('s')) return 'array';
  if (moduleName.includes('.create') || moduleName.includes('.send')) return 'object';
  if (moduleName.endsWith('.sum') || moduleName.endsWith('.count')) return 'number';

  // Array utils patterns
  if (moduleName.includes('ziptoobjects') || moduleName.includes('zipToObjects')) return 'array';
  if (moduleName.includes('array-utils') && !moduleName.match(/\.(sum|average|min|max|median|count|wordcount)$/i)) {
    // Most array-utils return arrays except aggregation functions
    return 'array';
  }

  return 'unknown';
}

/**
 * Get the expected type for an output display type
 */
function getExpectedTypeForDisplay(displayType: string): string {
  const map: Record<string, string> = {
    'table': 'array',
    'list': 'array',
    'text': 'string',
    'markdown': 'string',
    'number': 'number',
    'json': 'any',
    'auto': 'any',
  };
  return map[displayType] || 'unknown';
}

/**
 * Validate output display configuration
 */
function validateOutputDisplay(workflow: Workflow): void {
  const { steps, outputDisplay, returnValue } = workflow.config;

  // If no outputDisplay, that's fine (will show raw JSON)
  if (!outputDisplay) {
    issues.push({
      severity: 'info',
      message: 'No outputDisplay configured - workflow will return raw JSON',
      suggestion: 'Consider adding outputDisplay for better UX',
      example: `"outputDisplay": { "type": "auto" }`,
    });
    return;
  }

  // Get final step or returnValue
  let finalStepModule: string;
  let finalStepOutputAs: string | undefined;

  if (returnValue) {
    // Find the step that produces returnValue
    const match = returnValue.match(/{{([^.}]+)/);
    if (match) {
      const varName = match[1];
      const step = steps.find(s => s.outputAs === varName);
      if (step) {
        finalStepModule = step.module;
        finalStepOutputAs = step.outputAs;
      } else {
        issues.push({
          severity: 'error',
          message: `returnValue references undefined variable: ${varName}`,
          suggestion: `Ensure returnValue matches an outputAs from one of your steps`,
        });
        return;
      }
    } else {
      finalStepModule = steps[steps.length - 1].module;
      finalStepOutputAs = steps[steps.length - 1].outputAs;
    }
  } else {
    // Use last step
    const lastStep = steps[steps.length - 1];
    finalStepModule = lastStep.module;
    finalStepOutputAs = lastStep.outputAs;
  }

  const inferredType = inferReturnType(finalStepModule);
  const expectedType = getExpectedTypeForDisplay(outputDisplay.type);

  // Check type compatibility
  if (expectedType === 'any') {
    // auto and json accept anything
    return;
  }

  if (inferredType === 'unknown') {
    issues.push({
      severity: 'warning',
      message: `Cannot infer return type for module: ${finalStepModule}`,
      suggestion: 'Manually verify that output type matches display type',
    });
    return;
  }

  // Check for type mismatches
  if (expectedType === 'array' && inferredType !== 'array' && !inferredType.includes('array')) {
    issues.push({
      severity: 'error',
      message: `Output type mismatch: Display expects "${outputDisplay.type}" (array) but final step "${finalStepModule}" returns ${inferredType}`,
      suggestion: getFixSuggestion(outputDisplay.type, inferredType),
      example: getFixExample(outputDisplay.type, inferredType, finalStepOutputAs),
    });
  }

  if (expectedType === 'string' && inferredType === 'object') {
    issues.push({
      severity: 'error',
      message: `Output type mismatch: Display expects "text/markdown" (string) but final step "${finalStepModule}" returns object`,
      suggestion: `If this is an AI SDK module, access the .content property using returnValue`,
      example: `Add to config:\n"returnValue": "{{${finalStepOutputAs}.content}}"`,
    });
  }

  if (expectedType === 'number' && inferredType !== 'number') {
    issues.push({
      severity: 'error',
      message: `Output type mismatch: Display expects "number" but final step "${finalStepModule}" returns ${inferredType}`,
      suggestion: `Change outputDisplay.type to match the return type`,
      example: getDisplayTypeExample(inferredType),
    });
  }

  // Validate table columns if type is table
  if (outputDisplay.type === 'table') {
    validateTableColumns(outputDisplay, finalStepModule);
  }
}

/**
 * Get fix suggestion based on mismatch
 */
function getFixSuggestion(displayType: string, returnType: string): string {
  if (displayType === 'table' || displayType === 'list') {
    if (returnType === 'object') {
      return `The final step returns an object, but you need an array for ${displayType} display. Options:
1. Wrap the object in an array: Add a step that does [finalObject]
2. Change outputDisplay.type to "json" to show the raw object
3. If this is AI SDK, the object has structure - you may need to extract an array field`;
    }

    if (returnType === 'string' || returnType === 'number') {
      return `The final step returns a ${returnType}, but you need an array for ${displayType} display. Options:
1. Use utilities.array-utils.fill to create an array: fill(1, value)
2. Change outputDisplay.type to "${returnType === 'string' ? 'text' : 'number'}"`;
    }
  }

  return `Change either the final step to return the expected type, or change outputDisplay.type to match`;
}

/**
 * Get fix example
 */
function getFixExample(displayType: string, returnType: string, outputAs?: string): string {
  if (displayType === 'table' && returnType === 'object') {
    return `Add final step:
{
  "id": "wrapInArray",
  "module": "utilities.array-utils.fill",
  "inputs": {
    "length": 1,
    "value": "{{${outputAs}}}"
  },
  "outputAs": "tableData"
}`;
  }

  if ((displayType === 'table' || displayType === 'list') && returnType === 'object') {
    return `"outputDisplay": { "type": "json" }`;
  }

  return '';
}

/**
 * Get display type example based on return type
 */
function getDisplayTypeExample(returnType: string): string {
  const map: Record<string, string> = {
    'array': '"outputDisplay": { "type": "list" } or "table"',
    'object': '"outputDisplay": { "type": "json" }',
    'string': '"outputDisplay": { "type": "text" } or "markdown"',
    'number': '"outputDisplay": { "type": "number" }',
  };
  return map[returnType] || '"outputDisplay": { "type": "json" }';
}

/**
 * Validate table columns
 */
function validateTableColumns(outputDisplay: OutputDisplay, finalStepModule: string): void {
  if (!outputDisplay.columns || outputDisplay.columns.length === 0) {
    issues.push({
      severity: 'error',
      message: 'Table display requires columns configuration',
      suggestion: 'Add columns array with at least one column',
      example: `"columns": [
  { "key": "id", "label": "ID", "type": "number" },
  { "key": "name", "label": "Name", "type": "text" }
]`,
    });
    return;
  }

  // Check column types are valid
  const validColumnTypes = ['text', 'number', 'date', 'boolean', 'link', 'image', 'json'];
  for (const column of outputDisplay.columns) {
    if (!validColumnTypes.includes(column.type)) {
      issues.push({
        severity: 'warning',
        message: `Column "${column.key}" has invalid type: "${column.type}"`,
        suggestion: `Use one of: ${validColumnTypes.join(', ')}`,
      });
    }
  }

  // Check for zipToObjects - ensure all columns match fieldArrays
  if (finalStepModule === 'utilities.array-utils.zipToObjects') {
    issues.push({
      severity: 'info',
      message: 'Using zipToObjects - ensure column keys match fieldArrays keys',
      suggestion: 'Column "key" must exactly match the field names in zipToObjects',
      example: `If fieldArrays has { "id": [...], "title": [...] }
Then columns should have { "key": "id", ... } and { "key": "title", ... }`,
    });
  }
}

/**
 * Print validation report
 */
function printValidationReport(): void {
  if (issues.length === 0) {
    console.log('✅ Output display validation passed!\n');
    return;
  }

  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const infos = issues.filter(i => i.severity === 'info');

  if (errors.length > 0) {
    console.log(`\n❌ ${errors.length} Error${errors.length > 1 ? 's' : ''} Found:\n`);
    for (const issue of errors) {
      console.log(`   ${issue.message}`);
      if (issue.suggestion) {
        console.log(`   💡 ${issue.suggestion}`);
      }
      if (issue.example) {
        console.log(`   📝 Example:\n${issue.example.split('\n').map(l => '      ' + l).join('\n')}`);
      }
      console.log('');
    }
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} Warning${warnings.length > 1 ? 's' : ''}:\n`);
    for (const issue of warnings) {
      console.log(`   ${issue.message}`);
      if (issue.suggestion) {
        console.log(`   💡 ${issue.suggestion}`);
      }
      console.log('');
    }
  }

  if (infos.length > 0) {
    console.log(`\n💡 ${infos.length} Info:\n`);
    for (const issue of infos) {
      console.log(`   ${issue.message}`);
      if (issue.suggestion) {
        console.log(`   ${issue.suggestion}`);
      }
      if (issue.example) {
        console.log(`   📝 ${issue.example.split('\n').map(l => '      ' + l).join('\n')}`);
      }
      console.log('');
    }
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

/**
 * CLI
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/validate-output-display.ts <workflow-file.json>');
    process.exit(1);
  }

  const filePath = resolve(args[0]);

  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    const workflow: Workflow = JSON.parse(fileContent);

    console.log(`📂 Validating output display: ${filePath}`);
    console.log(`📝 Workflow: ${workflow.name}\n`);

    validateOutputDisplay(workflow);
    printValidationReport();
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
