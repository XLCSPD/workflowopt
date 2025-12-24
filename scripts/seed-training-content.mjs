#!/usr/bin/env node
/**
 * Seed App Overview training modules using Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Load .env.local
config({ path: join(rootDir, '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  console.error('Run: SUPABASE_SERVICE_ROLE_KEY=your-key node scripts/seed-training-content.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public`;

async function main() {
  console.log('='.repeat(60));
  console.log('Seeding App Overview Training Modules');
  console.log('='.repeat(60));
  
  // First, get max order_index
  const { data: existingContent, error: fetchError } = await supabase
    .from('training_content')
    .select('order_index')
    .order('order_index', { ascending: false })
    .limit(1);
  
  if (fetchError) {
    console.error('Error fetching existing content:', fetchError);
    process.exit(1);
  }
  
  const maxOrder = existingContent?.[0]?.order_index ?? 0;
  console.log(`Current max order_index: ${maxOrder}`);
  
  // Shift existing content to make room at the top
  console.log('Shifting existing modules down...');
  const { error: updateError } = await supabase
    .from('training_content')
    .update({ order_index: supabase.rpc('order_index + 2') })
    .gte('order_index', 1);
  
  // Actually, we can't do arithmetic in update like that. Let's just insert at the end and reorder later.
  // Or we'll insert with order_index 0 and 1.
  
  // Check if modules already exist
  const { data: existing } = await supabase
    .from('training_content')
    .select('id, title')
    .in('title', ['ProcessOpt App Overview (Video)', 'ProcessOpt App Overview (Guided Walkthrough)']);
  
  if (existing && existing.length > 0) {
    console.log('\nModules already exist:');
    existing.forEach(m => console.log(`  - ${m.title}`));
    console.log('\nSkipping creation. Delete them first if you want to recreate.');
    process.exit(0);
  }
  
  // Insert Video Module
  console.log('\nCreating Video module...');
  const { data: videoModule, error: videoError } = await supabase
    .from('training_content')
    .insert({
      title: 'ProcessOpt App Overview (Video)',
      description: "A quick video introduction to the Process Optimization Tool. Learn what the app does, the end-to-end workflow, and what you'll produce by the end of your journey.",
      type: 'video',
      duration_minutes: 5,
      order_index: 0, // Will be at the top
      content: {
        videoUrl: `${STORAGE_BASE}/training-videos/Process_Optimization_Guide.mp4`,
        transcript: "This video provides an overview of the Process Optimization Tool. You'll learn about the methodology: Training, Workflows, Sessions, Future State Studio, and Export/Analytics. By the end, you'll understand how to capture observations, run AI synthesis, and produce actionable improvement roadmaps."
      }
    })
    .select()
    .single();
  
  if (videoError) {
    console.error('Error creating video module:', videoError);
  } else {
    console.log(`  Created: ${videoModule.title} (id: ${videoModule.id})`);
  }
  
  // Insert Slides Module with Lab
  console.log('\nCreating Slides module with lab...');
  const { data: slidesModule, error: slidesError } = await supabase
    .from('training_content')
    .insert({
      title: 'ProcessOpt App Overview (Guided Walkthrough)',
      description: 'A guided walkthrough of the app with hands-on lab exercises. Build a demo workflow, conduct a mini waste walk, and run your first AI synthesis.',
      type: 'slides',
      duration_minutes: 20,
      order_index: 1, // Second position
      content: {
        deckType: 'pdf',
        pdfUrls: [
          `${STORAGE_BASE}/training-docs/Process_Optimization_Tool_User_Guide.pdf`,
          `${STORAGE_BASE}/training-docs/ProcessOpt_Operational_Excellence_Guide.pdf`
        ],
        title: 'App Overview: From Workflow to Future State',
        lab: {
          workflowName: 'Demo: Request to Fulfillment',
          swimlanes: ['Requester', 'Operations', 'Approver'],
          steps: [
            'Submit Request',
            'Validate Request Completeness',
            'Clarify Missing Info',
            'Log / Route Request',
            'Review for Policy/Thresholds',
            'Approve / Reject',
            'Notify Requester',
            'Fulfill Request',
            'Confirm Completion',
            'Close Request'
          ],
          observations: [
            {
              stepHint: 'Review for Policy/Thresholds',
              wasteHint: 'Waiting/Delays',
              priorityHint: 'high',
              text: 'Approvals sit in queue 2–3 days; no SLA or routing by threshold.'
            },
            {
              stepHint: 'Validate Request Completeness',
              wasteHint: 'Defects/Rework',
              priorityHint: 'high',
              text: '~40% of requests missing required fields; Ops sends multiple follow-ups.'
            },
            {
              stepHint: 'Log / Route Request',
              wasteHint: 'Overprocessing/Handoffs',
              priorityHint: 'medium',
              text: 'Same request details re-entered into two trackers; causes mismatches.'
            }
          ],
          deepLinks: [
            { label: 'Create Workflow', href: '/workflows' },
            { label: 'Start Session', href: '/sessions' },
            { label: 'Future State Studio', href: '/future-state' }
          ]
        }
      }
    })
    .select()
    .single();
  
  if (slidesError) {
    console.error('Error creating slides module:', slidesError);
  } else {
    console.log(`  Created: ${slidesModule.title} (id: ${slidesModule.id})`);
  }
  
  // Re-order existing modules to come after the new ones
  console.log('\nRe-ordering existing modules...');
  const { data: allModules } = await supabase
    .from('training_content')
    .select('id, title, order_index')
    .order('order_index', { ascending: true });
  
  if (allModules) {
    let newOrder = 0;
    for (const mod of allModules) {
      if (mod.order_index !== newOrder) {
        await supabase
          .from('training_content')
          .update({ order_index: newOrder })
          .eq('id', mod.id);
      }
      newOrder++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Done! Training modules created successfully.');
  console.log('\nVerify by navigating to Training in the app.');
}

main().catch(console.error);

