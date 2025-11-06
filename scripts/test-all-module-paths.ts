#!/usr/bin/env tsx
import { getModuleRegistry } from '../src/lib/workflows/module-registry';

// Copy of the CATEGORY_FOLDER_MAP from executor
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

// Simulate the executor's path parsing logic
function parseModulePath(modulePath: string): { categoryName: string; moduleName: string; functionName: string } | null {
  const parts = modulePath.split('.');

  let categoryName: string | undefined;
  let moduleName: string | undefined;
  let functionName: string | undefined;

  if (parts.length >= 3) {
    // Try 2-word category first
    if (parts.length >= 4) {
      const twoWordCategory = `${parts[0]} ${parts[1]}`.toLowerCase();
      if (CATEGORY_FOLDER_MAP[twoWordCategory]) {
        categoryName = CATEGORY_FOLDER_MAP[twoWordCategory];
        moduleName = parts[2];
        functionName = parts[3];
      }
    }

    // Try 1-word category if 2-word didn't match
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
    return null;
  }

  return { categoryName, moduleName, functionName };
}

console.log('🧪 Testing ALL module paths from registry...\n');

const registry = getModuleRegistry();
let totalFunctions = 0;
let successCount = 0;
let failureCount = 0;
const failures: string[] = [];

registry.forEach((category) => {
  const displayName = category.name;
  
  category.modules.forEach((module) => {
    module.functions.forEach((fn) => {
      const modulePath = `${displayName.toLowerCase()}.${module.name}.${fn.name}`;
      totalFunctions++;
      
      const parsed = parseModulePath(modulePath);
      
      if (parsed) {
        console.log(`✅ ${modulePath} → ${parsed.categoryName}/${parsed.moduleName}.${parsed.functionName}()`);
        successCount++;
      } else {
        console.log(`❌ ${modulePath} → FAILED TO PARSE`);
        failures.push(modulePath);
        failureCount++;
      }
    });
  });
});

console.log('\n📊 Summary:');
console.log(`   Total functions: ${totalFunctions}`);
console.log(`   ✅ Successful: ${successCount}`);
console.log(`   ❌ Failed: ${failureCount}`);

if (failures.length > 0) {
  console.log('\n🔴 Failed module paths:');
  failures.forEach(path => console.log(`   • ${path}`));
  process.exit(1);
} else {
  console.log('\n🎉 All module paths are correctly mapped!');
}
