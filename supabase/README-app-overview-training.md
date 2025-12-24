# App Overview Training Module Setup

This document explains how to set up the new "App Overview" training modules.

## Prerequisites

You need to upload the following files to Supabase Storage before running the seed script.

### Files to Upload

| Local File | Supabase Bucket | Path in Bucket |
|------------|-----------------|----------------|
| `docs/Process_Optimization_Guide.mp4` | `training-videos` | `Process_Optimization_Guide.mp4` |
| `docs/📘 Process Optimization Tool - User Guide.pdf` | `training-docs` | `Process_Optimization_Tool_User_Guide.pdf` |
| `docs/ProcessOpt_Operational_Excellence_Guide.pdf` | `training-docs` | `ProcessOpt_Operational_Excellence_Guide.pdf` |

## Step 1: Create Storage Buckets (if needed)

In the Supabase Dashboard:

1. Go to **Storage** → **New bucket**
2. Create a bucket named `training-docs` (public access)
3. The `training-videos` bucket should already exist

## Step 2: Upload Files

### Option A: Via Supabase Dashboard

1. Go to **Storage** → **training-videos**
2. Upload `Process_Optimization_Guide.mp4`
3. Go to **Storage** → **training-docs**
4. Upload both PDF files (rename to remove emoji if needed)

### Option B: Via Supabase CLI

```bash
# From the process-optimization-app directory
supabase storage cp docs/Process_Optimization_Guide.mp4 storage://training-videos/Process_Optimization_Guide.mp4

supabase storage cp "docs/📘 Process Optimization Tool - User Guide.pdf" storage://training-docs/Process_Optimization_Tool_User_Guide.pdf

supabase storage cp docs/ProcessOpt_Operational_Excellence_Guide.pdf storage://training-docs/ProcessOpt_Operational_Excellence_Guide.pdf
```

## Step 3: Run the Seed Script

```bash
# Via Supabase CLI
supabase db execute --file supabase/seed-app-overview-training.sql

# Or via psql directly
psql $DATABASE_URL -f supabase/seed-app-overview-training.sql
```

## Step 4: Verify

1. Navigate to **Training** in the app
2. You should see two new modules at the top:
   - "ProcessOpt App Overview (Video)" - 5 min video
   - "ProcessOpt App Overview (Guided Walkthrough)" - 20 min PDF slides with lab

## Alternative: Use Admin UI

If you prefer not to run SQL:

1. Upload the files to Supabase Storage (Step 1-2 above)
2. Go to **Admin** → **Training Content** in the app
3. Click **Add Content** and fill in:
   - **Title**: ProcessOpt App Overview (Video)
   - **Type**: Video
   - **Duration**: 5 minutes
   - **Order Index**: 1
   - **Video URL**: `https://rnmgqwsujxqvsdlfdscw.supabase.co/storage/v1/object/public/training-videos/Process_Optimization_Guide.mp4`
4. Repeat for the slides module with appropriate fields

## Module Content Details

### Video Module
- Quick 3-5 minute introduction
- Covers the end-to-end methodology
- Sets expectations for what users will learn

### Slides Module (PDF Deck + Lab)
- Combines content from both User Guide and Operational Excellence Guide
- Includes hands-on lab with:
  - Demo workflow: "Request to Fulfillment"
  - 3 swimlanes: Requester, Operations, Approver
  - 10 process steps
  - 3 sample observations to copy/paste
  - Deep links to Workflows, Sessions, and Future State Studio

## Troubleshooting

### PDFs not loading
- Check the CSP in `next.config.mjs` includes `worker-src 'self' blob:`
- Verify the storage bucket is public
- Check browser console for CORS or CSP errors

### Video not playing
- Verify the `media-src` CSP directive includes `https:`
- Check if the video file is correctly uploaded

### "Module not found" error
- Run the seed script to create the training_content records
- Verify the order_index values don't conflict

