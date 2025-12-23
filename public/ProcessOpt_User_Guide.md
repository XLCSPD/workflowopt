# ProcessOpt User Guide

**Versatex Process Optimization Platform**

A comprehensive guide to using ProcessOpt for Lean process improvement and waste identification.

---

## Table of Contents

1. [Getting Started](#getting-started)
   - [Your First Login](#your-first-login)
   - [Navigating the App](#navigating-the-app)
   - [Understanding Your Role](#understanding-your-role)
2. [Training](#training)
   - [Training Overview](#training-overview)
   - [Using the Waste Cheat Sheet](#using-the-waste-cheat-sheet)
   - [Completing Training Modules](#completing-training-modules)
3. [Workflows](#workflows)
   - [Workflow Overview](#workflow-overview)
   - [Creating a Workflow](#creating-a-workflow)
   - [Importing Workflows](#importing-workflows)
4. [Sessions](#sessions)
   - [Session Overview](#session-overview)
   - [Creating a Session](#creating-a-session)
   - [Adding Observations](#adding-observations)
   - [Viewing Session Results](#viewing-session-results)
5. [Future State Studio](#future-state-studio)
   - [Future State Studio Overview](#future-state-studio-overview)
   - [Synthesis Hub](#synthesis-hub)
   - [Solution Builder](#solution-builder)
   - [Roadmap Builder](#roadmap-builder)
   - [Future State Designer](#future-state-designer)
   - [Step Design Assist](#step-design-assist)
   - [Compare View](#compare-view)
   - [Export Deliverables](#export-deliverables)
6. [Analytics](#analytics)
   - [Analytics Overview](#analytics-overview)
   - [Understanding Charts](#understanding-charts)
   - [Waste Hotspots](#waste-hotspots)
   - [AI Insights](#ai-insights)
7. [Settings](#settings)
   - [Profile Settings](#profile-settings)
   - [Changing Password](#changing-password)
   - [Notification Preferences](#notification-preferences)
8. [Administration](#administration)
   - [Admin Panel Overview](#admin-panel-overview)
   - [Managing Users](#managing-users)
   - [Managing Waste Types](#managing-waste-types)

---

# Getting Started

## Your First Login

### Welcome to ProcessOpt!

After logging in, here's what to do:

1. **Complete your training** - Go to the Training section and work through the available modules
2. **Explore the dashboard** - Get familiar with the main navigation
3. **Review the Waste Cheat Sheet** - Quick reference for waste types

### Quick Tips
- Your sidebar shows all main sections
- Click the ? icon anytime for help
- Check notifications for updates

---

## Navigating the App

### Sidebar
The left sidebar provides access to all main sections:
- **Dashboard** - Overview and quick actions
- **Training** - Learning modules
- **Workflows** - Process maps
- **Sessions** - Waste walks
- **Future State Studio** - AI-powered optimization
- **Analytics** - Insights and reports

### Header
- **Notifications** - Bell icon for alerts
- **Help** - Context-sensitive help panel
- **Page Actions** - Context-specific buttons

### Tips
- Collapse the sidebar for more space
- Use breadcrumbs to go back
- The cheat sheet link is always accessible

---

## Understanding Your Role

### Participant
- Complete training modules
- Join waste walk sessions
- Add observations
- View your own data

### Facilitator
Everything a Participant can do, plus:
- Create and manage workflows
- Start and run sessions
- View full analytics
- Export reports

### Admin
Everything a Facilitator can do, plus:
- Invite and manage users
- Configure waste types
- Manage training content
- Organization settings

**Need more access?** Contact your administrator.

---

# Training

## Training Overview

Learn Lean waste identification through structured content:

### Module Types
- 🎥 **Video** - Watch instructional videos
- 📄 **Slides** - Step through presentations
- 📖 **Articles** - Read detailed content
- ❓ **Quizzes** - Test your knowledge

### Progress Tracking
- See your completion percentage
- Modules may be locked until prerequisites are done
- Retake quizzes to improve scores

### Tips
- Complete training before joining sessions
- Keep the cheat sheet handy
- Review modules periodically

---

## Using the Waste Cheat Sheet

A quick reference for all waste categories.

### Accessing the Cheat Sheet
1. Click **"Waste Cheat Sheet"** in the sidebar
2. Or from Training page, click the button

### What's Included
- Waste codes (D, O, W, N, T, I, M, E)
- Full names and definitions
- Examples for each type
- Tips for identification

### During Sessions
Keep a tab open with the cheat sheet for quick reference when tagging observations.

### DOWNTIME Acronym
| Code | Waste Type |
|------|------------|
| **D** | Defects |
| **O** | Overproduction |
| **W** | Waiting |
| **N** | Non-utilized Talent |
| **T** | Transportation |
| **I** | Inventory |
| **M** | Motion |
| **E** | Extra Processing |

---

## Completing Training Modules

### Videos
- Watch the entire video
- Progress saves automatically
- Marked complete when finished

### Articles
- Read through the content
- Click "Mark as Complete" at the end

### Quizzes
- Answer all questions
- Submit your answers
- Score is recorded

### Locked Modules
Some modules require completing prerequisites first. They'll unlock automatically when you're ready.

### Tips
- Take notes on key concepts
- Complete in order for best learning
- Review if you need a refresher

---

# Workflows

## Workflow Overview

Workflows are visual maps of your business processes.

### What's in a Workflow
- **Steps** - Tasks, decisions, events
- **Lanes** - Who does each step (swimlanes)
- **Connections** - How steps flow together

### Using Workflows
1. Create or import a workflow
2. Review the process map
3. Start a waste walk session
4. Tag observations on steps

### Viewing Workflows
- Go to **Workflows** in the sidebar
- Click any workflow to view
- See step count, lanes, sessions

---

## Creating a Workflow

### From Scratch
1. Go to **Workflows**
2. Click **"New Workflow"**
3. Enter name and description
4. Click **"Create"**
5. Use the editor to add steps

### In the Editor
- Drag nodes from the palette
- Connect steps by dragging edges
- Edit properties in the right panel
- Define swimlanes for roles

### Node Types
| Type | Description |
|------|-------------|
| **Start** | Process beginning |
| **Task** | Work activities |
| **Decision** | Branching points |
| **End** | Process completion |

### Tips
- Use descriptive step names
- Keep processes focused
- Test before using in sessions

---

## Importing Workflows

Import existing process maps from JSON or CSV files.

### How to Import
1. Go to **Workflows**
2. Click **"Import"**
3. Choose format (JSON or CSV)
4. Upload file or paste content
5. Preview and confirm

### JSON Format
```json
{
  "name": "Process Name",
  "steps": [
    { "name": "Step 1", "type": "task", "lane": "Role" }
  ]
}
```

### CSV Format
Include columns: Step Number, Step Name, Description, Lane, Step Type

### Tips
- Validate your file format first
- Preview before importing
- Edit after import if needed

---

# Sessions

## Session Overview

Sessions are collaborative activities for identifying waste (waste walks).

### Session States
| State | Description |
|-------|-------------|
| **Draft** | Created but not started |
| **Active** | In progress |
| **Completed** | Finished |
| **Archived** | Historical reference |

### Key Activities
1. Create a session with a workflow
2. Start the session
3. Participants add observations
4. End session when done
5. Review results

### Who Can Do What
- **Facilitators** - Create and manage sessions
- **Participants** - Join and add observations

---

## Creating a Session

### Steps
1. Go to **Sessions**
2. Click **"New Session"**
3. Enter session name
4. Select a workflow
5. Add description (optional)
6. Click **"Create Session"**

### Starting the Session
1. Find your draft session
2. Click **"Start"**
3. Session becomes active
4. Share with participants

### From a Workflow
1. Go to **Workflows**
2. Click the ▶ play button
3. Configure and create

### Tips
- Brief participants beforehand
- Share the cheat sheet link
- Monitor during the session

---

## Adding Observations

During an active session, tag waste you observe.

### Steps
1. Click a process step
2. Click **"Add Observation"**
3. Select waste type(s)
4. Add notes describing what you saw
5. Rate frequency, impact, ease
6. Click **"Save"**

### What to Include
| Field | Description |
|-------|-------------|
| **Notes** | Specific description of the waste |
| **Waste Types** | One or more DOWNTIME categories |
| **Digital/Physical** | Nature of the waste |
| **Scores** | Frequency, Impact, Ease (1-5 scale) |

### Tips
- Be specific in notes
- Multiple types can apply to one observation
- Capture everything, don't filter
- Reference the cheat sheet

---

## Viewing Session Results

After completing a session, review the findings.

### Accessing Results
1. Go to **Sessions**
2. Find the completed session
3. Click **"View Results"**

### What You'll See
- Total observations
- Waste type distribution
- Observations by step
- Priority scores

### Export Options
| Format | Use Case |
|--------|----------|
| **PDF** | Formatted report |
| **PowerPoint** | Presentation |
| **CSV** | Raw data for analysis |

### Next Steps
- Discuss with team
- Prioritize improvements
- Plan action items
- Track progress

---

# Future State Studio

## Future State Studio Overview

Transform waste observations into optimized processes with AI assistance.

### The 6-Stage Pipeline

| Stage | Name | Description |
|-------|------|-------------|
| 1 | **Synthesis** | AI clusters observations into themes |
| 2 | **Solutions** | AI generates improvement recommendations |
| 3 | **Sequencing** | Group solutions into implementation waves |
| 4 | **Designer** | Visual future state process map |
| 5 | **Compare** | Side-by-side current vs. future |
| 6 | **Export** | Download deliverables |

### Getting Started
1. Complete a waste walk session first
2. Go to **Future State** in sidebar
3. Select a session with observations
4. Work through each stage sequentially

### AI Assistance
Each stage uses AI agents that consider:
- Your observations and themes
- Workflow context (purpose, constraints, stakeholders)
- Industry best practices
- Implementation feasibility

---

## Synthesis Hub

The first stage where AI analyzes and groups your observations.

### How It Works
1. Click **"Run Agent"** to start analysis
2. AI groups similar observations into themes
3. Each theme has a root cause identified
4. Review and approve themes

### Themes Include
| Component | Description |
|-----------|-------------|
| **Title** | Descriptive name for the theme |
| **Root Cause** | Why this waste occurs |
| **Linked Observations** | Related findings from sessions |
| **Impact Assessment** | Severity rating |

### Tips
- Review each theme carefully
- Merge similar themes if needed
- Add manual themes for missed patterns
- Approve to proceed to Solutions

---

## Solution Builder

Stage 2 generates actionable improvement solutions.

### Solution Categories

| Category | Icon | Description |
|----------|------|-------------|
| **Eliminate** | 🔴 | Remove wasteful steps entirely |
| **Modify** | 🟡 | Improve existing processes |
| **Create** | 🟢 | Add new capabilities |

### Each Solution Includes
- Clear title and description
- Expected impact (time/cost savings)
- Implementation effort estimate
- Linked themes it addresses
- Affected process steps

### Actions
| Action | Description |
|--------|-------------|
| **Accept** | Approve for implementation planning |
| **Reject** | Mark as not viable |
| **Edit** | Customize the recommendation |
| **Regenerate** | Get new suggestions |

### Tips
- Consider quick wins first
- Balance effort vs. impact
- Think about dependencies
- Involve stakeholders in review

---

## Roadmap Builder

Stage 3 groups solutions into timed implementation phases.

### Waves (Horizons)

| Wave | Timeline | Focus |
|------|----------|-------|
| **Wave 1** | 0-3 months | Quick wins |
| **Wave 2** | 3-6 months | Medium-term improvements |
| **Wave 3** | 6-12 months | Long-term transformations |

### AI Sequencing
The AI considers:
- Dependencies between solutions
- Resource requirements
- Risk levels
- Change management needs

### How to Use
1. Run the sequencing agent
2. Review wave assignments
3. Drag solutions between waves
4. Adjust timing as needed
5. Finalize the roadmap

### Tips
- Start with high-impact, low-effort
- Don't overload Wave 1
- Consider organizational readiness
- Plan for change management

---

## Future State Designer

Stage 4 creates the optimized process visualization.

### The Canvas
- Visual map based on current workflow
- Steps marked with planned changes
- Color-coded by action type:

| Color | Action |
|-------|--------|
| Red | Eliminate |
| Yellow | Modify |
| Green | Create |
| Blue | Unchanged |

### Working with Steps
1. Click any step to open the design panel
2. Use **Step Design Assist** for AI help
3. Review and customize the design
4. Mark as complete when done

### Node Status Badges
| Badge | Status |
|-------|--------|
| 🔵 | Not Started |
| 🟡 | In Progress |
| 🟢 | Complete |

### Tips
- Work systematically through the map
- Use the Solution Tracker sidebar
- Check cross-lane dependencies
- Validate with process owners

---

## Step Design Assist

Get detailed AI help for designing each process step.

### Opening the Panel
1. Click any step in the Designer canvas
2. The side panel opens automatically
3. See linked solutions and current status

### Panel Tabs

#### Options Tab
- Click "Generate" to get 2-3 design alternatives
- Each option includes:
  - Purpose and description
  - Inputs and outputs
  - Actions/activities
  - Controls (approvals, validations)
  - Timing estimates
  - Waste addressed
  - Risks and mitigations
  - Confidence score

#### Context Tab
- Answer AI questions for better results
- Chat with the AI for clarification
- View current assumptions

#### History Tab
- See previous design versions
- Compare iterations
- Revert if needed

### Workflow
1. Generate options
2. Review alternatives
3. Select the best fit
4. Customize if needed
5. Accept to finalize

### Tips
- Provide context via the chat
- Consider all options before choosing
- Check the confidence score
- Review risks carefully

---

## Compare View

Stage 5 shows current and future processes side-by-side.

### What You'll See
- Left: Current state workflow
- Right: Future state workflow
- Highlighted differences
- Impact summary

### Metrics Comparison
| Metric | Description |
|--------|-------------|
| Total step count | Steps before vs. after |
| Cycle time estimates | Time savings |
| Waste categories addressed | Types eliminated |
| Automation opportunities | Digital improvements |

### Using Compare
1. Review visual differences
2. Check the impact summary
3. Validate with stakeholders
4. Export for presentations

### Tips
- Use for stakeholder sign-off
- Highlight key improvements
- Note any trade-offs
- Document assumptions

---

## Export Deliverables

Stage 6 generates professional documentation.

### Available Exports

| Format | Description |
|--------|-------------|
| **Summary Report (PDF)** | Executive overview |
| **Presentation (PPTX)** | Stakeholder deck |
| **Process Maps (PNG/SVG)** | Visual diagrams |
| **Data Export (CSV)** | Raw data for analysis |

### Report Contents
- Executive summary
- Current state analysis
- Identified themes and solutions
- Implementation roadmap
- Future state design
- Expected benefits

### How to Export
1. Complete previous stages
2. Go to Export tab
3. Select format
4. Click "Generate"
5. Download when ready

### Tips
- Complete all stages first
- Review before sharing
- Customize for audience
- Save copies locally

---

# Analytics

## Analytics Overview

Transform observation data into actionable insights.

### Key Features
- Waste distribution charts
- Hotspot identification
- AI recommendations
- Session comparisons

### Summary Stats
| Metric | Description |
|--------|-------------|
| Total observations | All tagged waste instances |
| Waste types found | Categories identified |
| Lanes affected | Roles/departments impacted |
| Quick wins available | Easy improvements |

### Filtering
Use the session dropdown to:
- View all sessions combined
- Focus on a specific session

---

## Understanding Charts

### Waste Distribution (Pie Chart)
- Shows percentage by waste type
- Hover for exact counts
- Colors match waste definitions

### By Swimlane (Bar Chart)
- Observations per lane
- Blue = Digital waste
- Green = Physical waste
- Longer bars = More observations

### Reading Charts
- Large segments = Common waste
- Compare lanes for focus areas
- Look for patterns across sessions

---

## Waste Hotspots

Process steps with highest improvement priority.

### Priority Score
Calculated as: **Frequency × Impact × Ease**

Higher scores mean:
- Happens often
- Significant effect
- Easier to fix

### Using Hotspots
1. Focus on top-ranked steps
2. Look for quick wins (low effort)
3. Plan improvement initiatives
4. Track changes over time

---

## AI Insights

Smart recommendations based on your data.

### Insight Types
| Type | Icon | Description |
|------|------|-------------|
| **Quick Win** | ⚡ | Easy, high-impact improvements |
| **Hotspot** | ⚠️ | Critical areas needing attention |
| **Trend** | 📈 | Patterns detected across data |

### Using Insights
- Review all recommendations
- Prioritize quick wins
- Address hotspots strategically
- Monitor trends over time

### Requirements
- Sufficient observation data
- Diverse waste types
- Completed sessions

---

# Settings

## Profile Settings

### Updating Your Name
1. Go to **Settings**
2. Edit the Name field
3. Click **"Save Profile"**

### Email Address
Your email is your login and cannot be changed directly. Contact an admin if needed.

### Profile Picture
Use your avatar initials or upload a photo (if supported).

---

## Changing Password

1. Go to **Settings**
2. Find the Password section
3. Enter current password
4. Enter new password
5. Confirm new password
6. Click **"Change Password"**

### Requirements
- Minimum 8 characters
- Mix of letters, numbers, symbols

### Forgot Password?
Use the "Forgot Password" link on the login page.

---

## Notification Preferences

### In-App Notifications
Toggle these on/off:
- Session updates
- Observation updates
- Invitation updates

### Browser Notifications
Get desktop alerts even when the app isn't focused.

To enable:
1. Toggle the setting on
2. Allow in browser prompt

### Clearing Notifications
Click the bell icon and use "Mark all as read".

---

# Administration

## Admin Panel Overview

Administrators have access to system configuration.

### Tabs
| Tab | Function |
|-----|----------|
| **Waste Types** | Configure waste definitions |
| **Training** | Manage training content |
| **Users** | Invite and manage users |
| **Organization** | Organization settings |

### Access
Admin panel is only visible to users with Admin role.

---

## Managing Users

### Inviting Users
1. Go to Admin → Users
2. Click "Invite User"
3. Enter email
4. Select role
5. Send invitation

### Changing Roles
1. Find user in list
2. Click ⋮ menu
3. Select "Change Role"
4. Choose new role

### Removing Users
1. Find user in list
2. Click ⋮ menu
3. Select "Remove"
4. Confirm

---

## Managing Waste Types

### Adding a Type
1. Go to Admin → Waste Types
2. Click "Add Waste Type"
3. Enter code, name, description
4. Choose category and color
5. Save

### Editing Types
Click the ⋮ menu on any type to edit.

### Categories
| Category | Description |
|----------|-------------|
| **Core Lean** | Traditional DOWNTIME wastes |
| **Digital** | Digital/office-specific waste |

---

# Quick Reference

## DOWNTIME Waste Types

| Code | Name | Description |
|------|------|-------------|
| **D** | Defects | Errors, rework, corrections |
| **O** | Overproduction | Making more than needed |
| **W** | Waiting | Idle time, delays |
| **N** | Non-utilized Talent | Underused skills, knowledge |
| **T** | Transportation | Unnecessary movement of materials |
| **I** | Inventory | Excess stock, backlogs |
| **M** | Motion | Unnecessary physical movement |
| **E** | Extra Processing | Over-engineering, redundant steps |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `?` | Open Help |
| `Esc` | Close modals/panels |

## Support

- Click the **?** icon in the header for contextual help
- Visit `/docs` for full documentation
- Contact your administrator for access issues

---

*ProcessOpt - Versatex Process Optimization Platform*
*© 2024 Versatex. All rights reserved.*

