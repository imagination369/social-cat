#!/usr/bin/env tsx
import { getModuleRegistry } from '../src/lib/workflows/module-registry';
import { readdirSync } from 'fs';
import { resolve } from 'path';

const registry = getModuleRegistry();
const modulesPath = resolve(process.cwd(), 'src/modules');
const actualFolders = readdirSync(modulesPath, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

console.log('📋 Category Name Mapping Analysis:\n');

const issues: string[] = [];

registry.forEach((category) => {
  const displayName = category.name;
  const lowerName = displayName.toLowerCase();
  
  // Try to find matching folder
  const matchingFolder = actualFolders.find(f => {
    return f === lowerName ||
           f === lowerName.replace(/\s+/g, '') ||
           f === lowerName.replace(/\s+/g, '-') ||
           f === lowerName.replace(/[^a-z0-9]/g, '');
  });
  
  if (matchingFolder) {
    if (matchingFolder !== lowerName.replace(/\s+/g, '')) {
      console.log(`⚠️  "${displayName}" → ${matchingFolder} (needs mapping)`);
      issues.push(`  '${lowerName}': '${matchingFolder}'`);
    } else {
      console.log(`✅ "${displayName}" → ${matchingFolder}`);
    }
  } else {
    console.log(`❌ "${displayName}" → NO MATCH`);
  }
});

console.log('\n📁 Folders without registry entries:');
const unmappedFolders: string[] = [];
actualFolders.forEach(folder => {
  const hasRegistry = registry.some(cat => {
    const catName = cat.name.toLowerCase();
    return catName === folder ||
           catName.replace(/\s+/g, '') === folder ||
           catName.replace(/\s+/g, '-') === folder ||
           catName.replace(/[^a-z0-9]/g, '') === folder;
  });
  if (!hasRegistry) {
    console.log(`  • ${folder}`);
    unmappedFolders.push(folder);
  }
});

if (issues.length > 0 || unmappedFolders.length > 0) {
  console.log('\n\n🔧 Missing mappings to add to CATEGORY_FOLDER_MAP:\n');
  issues.forEach(mapping => console.log(mapping + ','));
  unmappedFolders.forEach(f => console.log(`  '${f}': '${f}',`));
}
