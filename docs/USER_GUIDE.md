# 📘 Process Optimization Tool - Complete User Guide

> **Version:** 1.0  
> **Last Updated:** December 2024  
> **Application:** ProcessOpt by Versatex

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Dashboard](#dashboard)
4. [Training Module](#training-module)
5. [Workflows Module](#workflows-module)
6. [Sessions Module](#sessions-module)
7. [Future State Studio](#future-state-studio)
8. [Analytics Module](#analytics-module)
9. [Admin Panel](#admin-panel)
10. [Settings](#settings)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is ProcessOpt?

ProcessOpt is an AI-powered process optimization platform designed to help organizations identify waste in their workflows and design optimized future states. The application implements the **Lean methodology** for waste identification, focusing on the 8 types of waste (TIMWOODS):

| Waste Type | Code | Description |
|------------|------|-------------|
| **T**ransportation | T | Unnecessary movement of materials or information |
| **I**nventory | I | Excess materials, data, or work-in-progress |
| **M**otion | M | Unnecessary movement of people |
| **W**aiting | W | Idle time, delays, bottlenecks |
| **O**verproduction | O | Producing more than needed |
| **O**verprocessing | O | Doing more work than required |
| **D**efects | D | Errors requiring rework or correction |
| **S**kills Underutilization | S | Not leveraging employee capabilities |

### The ProcessOpt Methodology

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PROCESSOPT WORKFLOW                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   📚 LEARN          🔀 DEFINE         👥 ANALYZE        ✨ OPTIMIZE  │
│   ───────          ───────          ─────────         ──────────    │
│   Training    →    Workflows    →    Sessions    →    Future State  │
│   Module           Creation          (Waste Walk)      Studio        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Getting Started

### First-Time Login

1. Navigate to the application URL provided by your administrator
2. Enter your **email address** and **password**
3. Click the **eye icon** (👁) to reveal your password if needed
4. Click **"Sign In"**

> **Tip:** If you've forgotten your password, click "Forgot Password?" to receive a reset link via email.

### Navigation Overview

The application uses a **sidebar navigation** (desktop) or **bottom sheet menu** (mobile):

| Icon | Module | Description |
|------|--------|-------------|
| 📊 | Dashboard | Your personalized home view |
| 🎓 | Training | Educational content and quizzes |
| 🔀 | Workflows | Process definition and mapping |
| 👥 | Sessions | Collaborative waste walk sessions |
| ✨ | Future State Studio | AI-powered process redesign |
| 📈 | Analytics | Insights and reporting |
| ⚙️ | Settings | Account preferences |
| 🔧 | Admin | User management (admin only) |

### User Roles

| Role | Permissions |
|------|-------------|
| **User** | Create workflows, participate in sessions, use Future State Studio |
| **Facilitator** | All User permissions + manage sessions, end/reopen sessions |
| **Admin** | All Facilitator permissions + manage users, organizations, waste types |

---

## Dashboard

**Navigation:** Sidebar → Dashboard

### Overview

The Dashboard provides a quick snapshot of your activity and progress across the platform.

### Dashboard Components

#### 1. Welcome Section
- Personalized greeting with your name
- Quick action buttons to common tasks

#### 2. Stats Cards
| Card | Description |
|------|-------------|
| Training Progress | Percentage of training modules completed |
| Total Workflows | Number of workflows you have access to |
| Active Sessions | Currently running waste walk sessions |
| Waste Identified | Total observations across all sessions |

#### 3. Recent Sessions
- Shows your 3 most recent sessions
- Quick access to continue or view sessions
- Status badges: Active, Completed, Draft

#### 4. Top Hotspots
- Process steps with highest priority scores
- Quick identification of problem areas
- Links to relevant sessions

#### 5. Training Progress
- Visual progress through training modules
- Quick links to continue learning

### Quick Actions from Dashboard

- **"Start Session"** → Create a new waste walk
- **"View Workflows"** → Go to workflow management
- **"Continue Training"** → Resume your learning

---

## Training Module

**Navigation:** Sidebar → Training

### Purpose

The Training module ensures all team members understand the waste identification methodology before conducting waste walks.

### Training Structure

```
Training Hub
├── Getting Started
│   ├── Introduction to Lean
│   ├── The 8 Wastes Overview
│   └── Using ProcessOpt
├── Deep Dive Modules
│   ├── Transportation Waste
│   ├── Inventory Waste
│   ├── Motion Waste
│   ├── Waiting Waste
│   ├── Overproduction Waste
│   ├── Overprocessing Waste
│   ├── Defects Waste
│   └── Skills Underutilization
└── Assessment
    └── Final Quiz
```

### Content Types

| Type | Icon | Description |
|------|------|-------------|
| Video | 🎥 | Instructional videos with examples |
| Slides | 📄 | Presentation-style content |
| Article | 📖 | Detailed written explanations |
| Quiz | ❓ | Knowledge assessment |

### How to Complete Training

1. **View the Training Hub**
   - See all available modules
   - Check your overall progress at the top

2. **Start a Module**
   - Click on an available (unlocked) module
   - Locked modules require completing prerequisites first

3. **Complete Content**
   - Watch videos or read content
   - Progress is automatically saved

4. **Take Quizzes**
   - Answer multiple-choice questions
   - Receive immediate feedback
   - Retry failed quizzes as needed

### Waste Cheat Sheet

**Quick Access:** Sidebar → "Waste Cheat Sheet" (bottom section)

A printable reference guide containing:
- All 8 waste types with definitions
- Real-world examples for each
- Quick identification tips
- Common indicators

> **Pro Tip:** Keep the Cheat Sheet open in a separate tab during waste walks for quick reference.

---

## Workflows Module

**Navigation:** Sidebar → Workflows

### Purpose

Define the processes you want to analyze. A workflow is the foundation for all waste identification activities.

### Workflow List View

#### View Modes
- **Grid View**: Card-based display with key metrics
- **List View**: Table format with more details

#### Sorting Options
- Last Updated (default)
- Name (A-Z or Z-A)
- Step Count
- Lane Count
- Session Count

#### Filtering
- Filter by number of swimlanes: All, 1, 2, 3, 4+

### Creating a New Workflow

1. Click **"+ New Workflow"** button
2. Fill in the dialog:
   - **Name** (required): Descriptive process name
   - **Description** (optional): Brief overview
3. Click **"Create"**

### The Workflow Editor

After creating a workflow, you'll enter the **Workflow Editor**:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Workflow Editor                                          [Context 📋]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   Step 1     │───→│   Step 2     │───→│   Step 3     │          │
│  │              │    │              │    │              │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│  ─────────────────────────────────────────────────────── Lane 1    │
│                                                                      │
│  ┌──────────────┐                        ┌──────────────┐          │
│  │   Step 4     │───────────────────────→│   Step 5     │          │
│  │              │                        │              │          │
│  └──────────────┘                        └──────────────┘          │
│  ─────────────────────────────────────────────────────── Lane 2    │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│ [+ Add Step]  [+ Add Lane]  [Auto Layout]  [Zoom Controls]          │
└─────────────────────────────────────────────────────────────────────┘
```

#### Adding Swimlanes (Departments/Roles)

1. Click **"+ Add Lane"**
2. Enter lane name (e.g., "Customer", "Sales", "Finance")
3. Lanes appear as horizontal bands

#### Adding Process Steps

1. Click **"+ Add Step"**
2. Enter step details:
   - **Step Name**: Action being performed
   - **Lane**: Which department owns this step
   - **Description**: Detailed explanation
3. Drag steps to reposition

#### Connecting Steps

1. Hover over a step to see connection handles
2. Drag from the right handle to the next step
3. Arrows show the process flow

#### Auto Layout

Click **"Auto Layout"** to automatically arrange steps for optimal readability.

### Workflow Context Drawer

**Access:** Click the **Context icon (📋)** in the workflow header

The Context Drawer provides rich metadata that helps AI agents generate better solutions.

#### Context Sections

| Section | What to Include |
|---------|-----------------|
| **Overview** | High-level description, purpose, frequency |
| **Stakeholders** | People involved, their roles, impact levels |
| **Systems** | Software, tools, technologies used |
| **Metrics** | KPIs, current values, targets |

#### AI Quick Fill

1. Click **"Quick Fill with AI"**
2. Enter a free-form description of the process
3. Click **"Generate"**
4. Review and accept AI-generated content
5. Edit as needed and **Save**

> **Why Context Matters:** The more context you provide, the better the AI can understand your process and generate relevant solutions in the Future State Studio.

### Workflow Actions

| Action | Description |
|--------|-------------|
| **Edit** | Modify workflow name/description |
| **Delete** | Remove the workflow (requires confirmation) |
| **Start Session** | Begin a waste walk on this workflow |
| **Import** | Load workflow from JSON file |
| **Export** | Download workflow as JSON |

---

## Sessions Module

**Navigation:** Sidebar → Sessions

### Purpose

Sessions are collaborative waste walk activities where teams identify waste in a workflow.

### Session Statuses

| Status | Badge | Description |
|--------|-------|-------------|
| **Draft** | ⏳ | Created but not started |
| **Active** | 🟢 | Currently in progress |
| **Completed** | ✅ | Waste walk finished |
| **Archived** | 📦 | Stored for reference |

### Creating a New Session

1. Click **"+ New Session"**
2. Select a **Workflow** from the dropdown
3. Enter a **Session Name** (e.g., "Q1 2024 Process Review")
4. Click **"Create"**

### The Waste Walk Interface

```
┌─────────────────────────────────────────────────────────────────────┐
│ Session: Q1 Process Review                              [End Session]│
├──────────────────────────────────────┬──────────────────────────────┤
│                                      │                              │
│         PROCESS MAP                  │      ACTIVITY FEED           │
│         (Interactive)                │                              │
│                                      │  👤 John added observation   │
│    ┌──────┐  ┌──────┐  ┌──────┐     │     on "Review Application"  │
│    │Step 1│→→│Step 2│→→│Step 3│     │     2 min ago                │
│    │ 🔥3  │  │ 🔥7  │  │ 🔥1  │     │                              │
│    └──────┘  └──────┘  └──────┘     │  👤 Sarah added observation  │
│                                      │     on "Submit Request"      │
│    ┌──────┐           ┌──────┐      │     5 min ago                │
│    │Step 4│→→→→→→→→→→→│Step 5│      │                              │
│    │ 🔥2  │           │      │      │  👤 Mike joined session      │
│    └──────┘           └──────┘      │     10 min ago               │
│                                      │                              │
├──────────────────────────────────────┴──────────────────────────────┤
│ 👥 3 Participants  │  📝 13 Observations  │  🔥 Heatmap: ON         │
└─────────────────────────────────────────────────────────────────────┘
```

### Understanding the Heatmap

The heatmap overlay shows waste intensity on each step:

| Color | Priority Score | Meaning |
|-------|---------------|---------|
| 🟢 Green | 1-3 | Low waste |
| 🟡 Yellow | 4-6 | Medium waste |
| 🟠 Orange | 7-8 | High waste |
| 🔴 Red | 9-10 | Critical waste |

### Adding Observations

1. **Click on a process step** in the map
2. The **Step Detail Panel** opens
3. Click **"+ Add Observation"**
4. Fill in the observation form:

| Field | Description |
|-------|-------------|
| **Notes** | Describe what you observed |
| **Waste Types** | Select one or more waste categories |
| **Priority** | Rate impact (1-10 scale) |
| **Evidence** | Optional: Add photos, links |

5. Click **"Save Observation"**

### Editing/Deleting Observations

1. Click on the step with observations
2. Find the observation in the list
3. Click the **"..."** menu
4. Select **Edit** or **Delete**

### Real-Time Collaboration

- **Green dots** indicate active participants
- Observations appear in real-time as others add them
- Activity feed shows recent actions

### Session Controls

| Action | When to Use |
|--------|-------------|
| **Pause Session** | Taking a break, will resume later |
| **End Session** | Waste walk is complete |
| **Reopen Session** | Need to add more observations after ending |
| **Archive** | Move to long-term storage |
| **Delete** | Remove permanently |

### Viewing Session Results

After completing a session:
1. Go to **Sessions** list
2. Click on the completed session
3. Click **"View Results"**
4. See summary statistics and all observations

---

## Future State Studio

**Navigation:** Sidebar → Future State Studio → Select a Session

### Purpose

Transform waste walk observations into an optimized future state using AI-powered analysis.

### Prerequisites

Before using Future State Studio:
- ✅ Complete a waste walk session
- ✅ Session should have multiple observations
- ✅ Observations should have waste types tagged

### The 6 Stages

```
┌─────────┐   ┌──────────┐   ┌─────────┐   ┌──────────┐   ┌─────────┐   ┌────────┐
│Synthesis│ → │ Solutions│ → │ Roadmap │ → │ Designer │ → │ Compare │ → │ Export │
│   Hub   │   │ Builder  │   │ Builder │   │          │   │  View   │   │ Panel  │
└─────────┘   └──────────┘   └─────────┘   └──────────┘   └─────────┘   └────────┘
     │              │              │              │              │           │
   Themes       Solutions       Waves        New Flow       Side-by-    Reports
   & Root       by Type      & Timeline      Design        Side View
   Causes
```

---

### Stage 1: Synthesis Hub

**Purpose:** AI analyzes observations and groups them into meaningful themes.

#### How to Use

1. Review the observation count at the top
2. Click **"Run Synthesis"** (or "Re-run Synthesis" if already done)
3. Wait for AI processing (10-30 seconds)
4. Review generated themes

#### Theme Cards

Each theme card shows:
- **Theme Name**: AI-generated title
- **Summary**: Brief description
- **Root Cause Hypotheses**: Potential underlying issues
- **Linked Observations**: Evidence supporting this theme
- **Status Badge**: Draft, Confirmed, or Rejected

#### Actions per Theme

| Action | Description |
|--------|-------------|
| **Confirm** ✓ | Mark as valid, include in solutions |
| **Reject** ✗ | Mark as invalid, exclude from solutions |
| **Edit** ✏️ | Modify name, summary, or hypotheses |
| **View Evidence** 👁 | See linked observations |
| **Delete** 🗑 | Remove theme entirely |

#### Best Practices

- Confirm themes that accurately represent the waste
- Reject false positives or duplicates
- Edit themes to add business context AI may have missed
- At least one confirmed theme is needed for solutions

---

### Stage 2: Solution Builder

**Purpose:** Generate actionable solutions to address confirmed themes.

#### How to Use

1. Ensure you have **confirmed themes** from Synthesis
2. Click **"Generate Solutions"** (or "Regenerate")
3. Wait for AI processing (15-45 seconds)
4. Review solutions organized by type

#### Solution Categories

| Category | Icon | Description |
|----------|------|-------------|
| **Eliminate** | 🚫 | Remove steps or activities entirely |
| **Modify** | 🔧 | Change how existing steps work |
| **Create** | ➕ | Add new steps or capabilities |

#### Solution Cards

Each solution shows:
- **Title**: What the solution does
- **Description**: Detailed explanation
- **Rationale**: Why this helps
- **Linked Themes**: Which problems it addresses
- **Impacted Steps**: Which process steps are affected
- **Step Design Status**: Design progress indicator

#### Solution Statuses

| Status | Meaning |
|--------|---------|
| **Draft** | Needs review |
| **Accepted** | Approved for implementation |
| **Rejected** | Not pursuing |

#### Detailed Solution View

Click on a solution card to see:
- Full description
- Implementation considerations
- Linked themes with evidence
- Edit capabilities

---

### Stage 3: Roadmap Builder

**Purpose:** Sequence accepted solutions into implementation waves.

#### How to Use

1. Ensure you have **accepted solutions**
2. Click **"Generate Roadmap"** (or "Regenerate")
3. View the implementation timeline

#### Implementation Waves

Solutions are grouped into waves based on:
- Dependencies between solutions
- Implementation complexity
- Quick wins vs. long-term changes

```
Wave 1 (Quick Wins)     Wave 2 (Medium)       Wave 3 (Complex)
─────────────────────   ─────────────────     ─────────────────
□ Solution A            □ Solution C          □ Solution E
□ Solution B            □ Solution D          □ Solution F
                                              □ Solution G
```

#### View Modes

- **Solutions View**: Group by solution
- **Items View**: Group by implementation item

#### Dependency Indicators

- Solutions with dependencies show **"Requires: [Solution X]"**
- Blocking dependencies prevent out-of-order implementation

---

### Stage 4: Future State Designer

**Purpose:** Create the redesigned process flow with AI assistance.

#### How to Use

1. Click **"Generate Design"** to create the future state
2. View the redesigned process

#### View Modes

| Mode | Description |
|------|-------------|
| **Flowchart** | Interactive swimlane diagram (default) |
| **Side-by-Side** | Current and future states together |
| **Future Only** | Focus on new design |

#### The Flowchart View

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Auto Layout] [Zoom In] [Zoom Out] [Fit View]                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Customer    ┌────────┐      ┌────────┐      ┌────────┐             │
│ ──────────  │ Start  │─────→│ Step A │─────→│ Step B │────→        │
│             └────────┘      └────────┘      └────────┘             │
│                                                                      │
│ Sales       ┌────────┐                      ┌────────┐             │
│ ──────────  │ Step C │─────────────────────→│ Step D │────→        │
│             └────────┘                      └────────┘             │
│                                                                      │
│ Finance                                     ┌────────┐             │
│ ──────────                                  │ Step E │────→ End    │
│                                             └────────┘             │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│ Legend: [Keep] [Modify] [Remove] [New]  Priority: [Low → High]     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Node Visual System

**Background Color (Priority):**
- Light → Dark gradient indicates waste priority

**Left Border Stripe (Action):**
| Color | Action | Meaning |
|-------|--------|---------|
| Gray | Keep | No changes needed |
| Blue | Modify | Step will be changed |
| Red | Remove | Step will be eliminated |
| Green | New | New step being added |

**Solution Badge:**
- Modified nodes show linked solution name
- Hover for full solution details

#### Sticky Swimlane Labels

- Lane labels remain visible when panning
- Always know which department each step belongs to

#### Step Design Panel

Click on any **future state node** to open the Step Design Panel:

1. **Context Tab**: AI asks clarifying questions
2. **Options Tab**: View generated design options
3. **Details Tab**: See step specifications

##### Generating Step Designs

1. Click **"Generate Design"** in the panel
2. AI may ask questions - answer them in the chat interface
3. Review generated design options
4. Select the preferred option
5. Optionally refine with follow-up questions

##### Design Options Include

- Inputs and outputs
- Actions performed
- Decision points
- System integrations
- SLAs and metrics
- Risk factors
- Implementation notes

---

### Stage 5: Compare View

**Purpose:** Side-by-side visualization of current vs. future state.

#### Features

- **Dual View**: Current state on left, future on right
- **Change Highlighting**: Visual indicators for what's different
- **Statistics**: Summary of changes (steps added, removed, modified)

---

### Stage 6: Export Panel

**Purpose:** Generate deliverables for stakeholders.

#### Export Options

| Format | Contents |
|--------|----------|
| **PowerPoint** | Full presentation with all stages |
| **PDF Report** | Detailed written documentation |
| **JSON** | Data export for integrations |

#### Presentation Includes

- Executive summary
- Current state analysis
- Waste themes identified
- Proposed solutions
- Implementation roadmap
- Future state design
- Appendix with all observations

---

## Analytics Module

**Navigation:** Sidebar → Analytics

### Purpose

Gain insights from waste identification efforts across all sessions.

### Dashboard Components

#### 1. Session Selector
- Choose a specific session or view aggregate data

#### 2. Waste Distribution Chart
- Pie/bar chart showing waste by type
- Filter to see patterns

#### 3. Priority Heatmap
- Visual representation of high-impact areas
- Click to drill down

#### 4. Trend Analysis
- Compare sessions over time
- Track improvement progress

#### 5. Step Hotspots
- Table of highest-waste steps
- Links to detailed observations

### Session Comparison

**Navigation:** Analytics → Compare Sessions

1. Select 2 or more sessions
2. View side-by-side metrics
3. Identify trends and improvements

---

## Admin Panel

**Navigation:** Sidebar → Admin (Admin users only)

### Purpose

Manage users, organizations, and system configuration.

### Sections

#### 1. User Management

| Action | Description |
|--------|-------------|
| **Invite User** | Send email invitation |
| **Edit User** | Modify role, permissions |
| **Deactivate** | Temporarily disable access |
| **Delete** | Permanently remove |

#### 2. Organization Management

- Create/edit organizations
- Manage organization-level settings

#### 3. Waste Type Configuration

- Customize waste type definitions
- Add organization-specific waste categories

#### 4. Training Content Management

- Upload new training modules
- Edit existing content
- Manage quiz questions

---

## Settings

**Navigation:** Sidebar → Settings (or User Avatar → Settings)

### Profile Settings

- Update name and email
- Change password
- Upload avatar

### Notification Preferences

- Email notifications for session invites
- Real-time collaboration alerts

### Display Preferences

- Dark/light mode (if available)
- Default view modes

---

## Best Practices

### For Facilitators

1. **Prepare Before Sessions**
   - Ensure workflow is complete and accurate
   - Add rich context for AI
   - Invite all stakeholders

2. **During Waste Walks**
   - Encourage all participants to contribute
   - Ask probing questions
   - Document specific examples, not generalities

3. **Quality Observations**
   - Be specific: "Approval takes 3 days" not "Slow approval"
   - Include impact: How does this waste affect customers/employees?
   - Tag multiple waste types when applicable

### For Participants

1. **Come Prepared**
   - Complete training first
   - Review the waste cheat sheet
   - Understand the process being analyzed

2. **Observe Objectively**
   - Focus on the process, not people
   - Look for systemic issues
   - Consider upstream and downstream effects

3. **Provide Context**
   - Explain why something is wasteful
   - Include frequency and duration
   - Note any workarounds being used

### For AI Optimization

1. **Rich Workflow Context**
   - Use the Context Drawer
   - Describe stakeholders and systems
   - Include current metrics and targets

2. **Detailed Observations**
   - Longer notes = better AI understanding
   - Include specific examples
   - Tag appropriate waste types

3. **Iterative Refinement**
   - Review and edit AI outputs
   - Confirm/reject themes
   - Answer AI questions completely

---

## Troubleshooting

### Common Issues

#### "AI agent not running"

**Symptoms:** Button clicks but nothing happens

**Solutions:**
1. Check browser console (F12) for errors
2. Look for toast notifications (bottom-right)
3. Ensure you have observations/themes as required
4. Try refreshing the page

#### "Session won't load"

**Symptoms:** Blank screen or loading forever

**Solutions:**
1. Check internet connection
2. Clear browser cache
3. Try a different browser
4. Contact administrator

#### "Can't see other participants"

**Symptoms:** Missing presence indicators

**Solutions:**
1. Ensure stable internet connection
2. Check if others have joined the session
3. Refresh the page

#### "AI questions not appearing"

**Symptoms:** Expected questions don't show

**Solutions:**
1. Check the "Context" tab in Step Design Panel
2. Ensure you clicked "Generate Design"
3. Wait for AI processing to complete

### Getting Help

- **In-App Docs:** Sidebar → Help/Documentation
- **Waste Cheat Sheet:** Sidebar → Waste Cheat Sheet
- **Quick Start Guide:** Dashboard → Quick Start
- **Support:** Contact your system administrator

---

## Appendix A: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Escape` | Close current panel |
| `Enter` | Submit forms |
| `Tab` | Navigate between fields |

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Waste Walk** | Collaborative session to identify waste in a process |
| **Swimlane** | Horizontal band representing a department or role |
| **Observation** | A documented instance of waste |
| **Theme** | A grouping of related observations |
| **Solution** | A proposed improvement to address waste |
| **Wave** | An implementation phase in the roadmap |
| **Heatmap** | Visual overlay showing waste intensity |

---

## Appendix C: Support Contact

For technical issues or feature requests:
- **Email:** support@versatex.com
- **Documentation:** [Link to online docs]

---

*© 2024 Versatex. All rights reserved.*





