#!/usr/bin/env tsx
/**
 * Export Fathom transcripts from database to individual markdown files
 *
 * Usage:
 *   npx tsx export-fathom-files.ts [output-dir] [limit]
 *
 * Examples:
 *   npx tsx export-fathom-files.ts /tmp 15
 *   npx tsx export-fathom-files.ts ~/fathom-transcripts
 */

import { db } from './src/lib/db';
import { fathomTranscriptsTable } from './src/lib/schema';
import { desc } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function exportFiles() {
  const outputDir = process.argv[2] || '/tmp';
  const limit = process.argv[3] ? parseInt(process.argv[3]) : undefined;

  console.log(`\n📁 Exporting Fathom transcripts to: ${outputDir}`);
  if (limit) console.log(`   Limit: ${limit} most recent\n`);

  // Fetch transcripts from database
  let query = db
    .select()
    .from(fathomTranscriptsTable)
    .orderBy(desc(fathomTranscriptsTable.meetingDate));

  if (limit) {
    query = query.limit(limit) as any;
  }

  const transcripts = await query;

  console.log(`   Found ${transcripts.length} transcript(s) in database\n`);

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`   ✅ Created directory: ${outputDir}\n`);
  }

  // Write each transcript to a file
  let successCount = 0;
  let errorCount = 0;

  for (const transcript of transcripts) {
    try {
      const filename = `${transcript.recordingId}_${transcript.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50) || 'untitled'}.md`;
      const filepath = path.join(outputDir, filename);

      fs.writeFileSync(filepath, transcript.transcriptMarkdown || '', 'utf8');

      const sizeKB = Math.round(Buffer.byteLength(transcript.transcriptMarkdown || '', 'utf8') / 1024);
      console.log(`   ✅ ${filename} (${sizeKB}KB)`);

      successCount++;
    } catch (error: any) {
      console.error(`   ❌ Failed to write ${transcript.recordingId}: ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Exported: ${successCount}`);
  if (errorCount > 0) console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   📁 Location: ${outputDir}\n`);
}

exportFiles().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
