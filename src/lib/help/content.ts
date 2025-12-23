/**
 * Help Content Data Structure
 * 
 * This file contains all the help content for the in-app help system.
 * Content is organized by page/feature and supports search functionality.
 */

export interface HelpTopic {
  id: string;
  title: string;
  description: string;
  content: string;
  keywords: string[];
  relatedTopics?: string[];
}

export interface HelpSection {
  id: string;
  title: string;
  icon: string;
  topics: HelpTopic[];
}

export interface PageHelp {
  pageId: string;
  title: string;
  description: string;
  quickActions: QuickAction[];
  featuredTopics: string[];
}

export interface QuickAction {
  label: string;
  href: string;
  description: string;
}

// Help sections organized by feature area
export const helpSections: HelpSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: "rocket",
    topics: [
      {
        id: "first-login",
        title: "Your First Login",
        description: "Learn what to do after logging in for the first time",
        content: `
## Welcome to ProcessOpt!

After logging in, here's what to do:

1. **Complete your training** - Go to the Training section and work through the available modules
2. **Explore the dashboard** - Get familiar with the main navigation
3. **Review the Waste Cheat Sheet** - Quick reference for waste types

### Quick Tips
- Your sidebar shows all main sections
- Click the ? icon anytime for help
- Check notifications for updates
        `,
        keywords: ["login", "first", "start", "begin", "new user", "welcome"],
        relatedTopics: ["navigation", "training-overview"],
      },
      {
        id: "navigation",
        title: "Navigating the App",
        description: "Learn how to get around ProcessOpt",
        content: `
## App Navigation

### Sidebar
The left sidebar provides access to all main sections:
- **Dashboard** - Overview and quick actions
- **Training** - Learning modules
- **Workflows** - Process maps
- **Sessions** - Waste walks
- **Analytics** - Insights and reports

### Header
- **Notifications** - Bell icon for alerts
- **Help** - This help panel
- **Page Actions** - Context-specific buttons

### Tips
- Collapse the sidebar for more space
- Use breadcrumbs to go back
- The cheat sheet link is always accessible
        `,
        keywords: ["navigate", "menu", "sidebar", "header", "find", "where"],
        relatedTopics: ["first-login", "roles"],
      },
      {
        id: "roles",
        title: "Understanding Your Role",
        description: "Learn what you can do based on your role",
        content: `
## User Roles

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
        `,
        keywords: ["role", "permission", "access", "admin", "facilitator", "participant", "can", "cannot"],
        relatedTopics: ["navigation"],
      },
    ],
  },
  {
    id: "training",
    title: "Training",
    icon: "graduation-cap",
    topics: [
      {
        id: "training-overview",
        title: "Training Overview",
        description: "How the training system works",
        content: `
## Training Modules

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
        `,
        keywords: ["training", "learn", "module", "video", "quiz", "progress"],
        relatedTopics: ["cheat-sheet", "completing-modules"],
      },
      {
        id: "cheat-sheet",
        title: "Using the Waste Cheat Sheet",
        description: "Quick reference for waste types",
        content: `
## Waste Type Cheat Sheet

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

### DOWNTIME
- **D**efects
- **O**verproduction  
- **W**aiting
- **N**on-utilized Talent
- **T**ransportation
- **I**nventory
- **M**otion
- **E**xtra Processing
        `,
        keywords: ["cheat sheet", "reference", "waste types", "DOWNTIME", "quick"],
        relatedTopics: ["training-overview", "adding-observations"],
      },
      {
        id: "completing-modules",
        title: "Completing Training Modules",
        description: "How to complete and track modules",
        content: `
## Completing Modules

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
        `,
        keywords: ["complete", "finish", "module", "video", "article", "quiz", "locked"],
        relatedTopics: ["training-overview"],
      },
    ],
  },
  {
    id: "workflows",
    title: "Workflows",
    icon: "git-branch",
    topics: [
      {
        id: "workflow-overview",
        title: "Workflow Overview",
        description: "Understanding process workflows",
        content: `
## Process Workflows

Workflows are visual maps of your business processes.

### What's in a Workflow
- **Steps** - Tasks, decisions, events
- **Lanes** - Who does each step
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
        `,
        keywords: ["workflow", "process", "map", "steps", "lanes"],
        relatedTopics: ["creating-workflows", "importing-workflows"],
      },
      {
        id: "creating-workflows",
        title: "Creating a Workflow",
        description: "Build a process workflow from scratch",
        content: `
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
- **Start** - Process beginning
- **Task** - Work activities
- **Decision** - Branching points
- **End** - Process completion

### Tips
- Use descriptive step names
- Keep processes focused
- Test before using in sessions
        `,
        keywords: ["create", "new", "build", "workflow", "editor", "steps"],
        relatedTopics: ["workflow-overview", "importing-workflows"],
      },
      {
        id: "importing-workflows",
        title: "Importing Workflows",
        description: "Import workflows from files",
        content: `
## Importing Workflows

Import existing process maps from JSON or CSV files.

### How to Import
1. Go to **Workflows**
2. Click **"Import"**
3. Choose format (JSON or CSV)
4. Upload file or paste content
5. Preview and confirm

### JSON Format
\`\`\`json
{
  "name": "Process Name",
  "steps": [
    { "name": "Step 1", "type": "task", "lane": "Role" }
  ]
}
\`\`\`

### CSV Format
Include columns: Step Number, Step Name, Description, Lane, Step Type

### Tips
- Validate your file format first
- Preview before importing
- Edit after import if needed
        `,
        keywords: ["import", "upload", "json", "csv", "file", "workflow"],
        relatedTopics: ["workflow-overview", "creating-workflows"],
      },
    ],
  },
  {
    id: "sessions",
    title: "Sessions",
    icon: "users",
    topics: [
      {
        id: "session-overview",
        title: "Session Overview",
        description: "Understanding waste walk sessions",
        content: `
## Waste Walk Sessions

Sessions are collaborative activities for identifying waste.

### Session States
- **Draft** - Created but not started
- **Active** - In progress
- **Completed** - Finished
- **Archived** - Historical reference

### Key Activities
1. Create a session with a workflow
2. Start the session
3. Participants add observations
4. End session when done
5. Review results

### Who Can Do What
- **Facilitators** - Create and manage sessions
- **Participants** - Join and add observations
        `,
        keywords: ["session", "waste walk", "active", "complete", "draft"],
        relatedTopics: ["creating-sessions", "adding-observations"],
      },
      {
        id: "creating-sessions",
        title: "Creating a Session",
        description: "Start a new waste walk session",
        content: `
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
        `,
        keywords: ["create", "new", "session", "start", "begin"],
        relatedTopics: ["session-overview", "adding-observations"],
      },
      {
        id: "adding-observations",
        title: "Adding Observations",
        description: "Tag waste during a session",
        content: `
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
- **Notes** - Specific description
- **Waste Types** - One or more
- **Digital/Physical** - Nature of waste
- **Scores** - Frequency, Impact, Ease (1-5)

### Tips
- Be specific in notes
- Multiple types can apply
- Capture everything, no filter
- Reference the cheat sheet
        `,
        keywords: ["observation", "add", "tag", "waste", "notes", "score"],
        relatedTopics: ["session-overview", "cheat-sheet"],
      },
      {
        id: "session-results",
        title: "Viewing Session Results",
        description: "Review completed session outcomes",
        content: `
## Session Results

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
- **PDF** - Formatted report
- **PowerPoint** - Presentation
- **CSV** - Raw data

### Next Steps
- Discuss with team
- Prioritize improvements
- Plan action items
- Track progress
        `,
        keywords: ["results", "report", "export", "complete", "summary"],
        relatedTopics: ["session-overview", "analytics-overview"],
      },
    ],
  },
  {
    id: "future-state",
    title: "Future State Studio",
    icon: "sparkles",
    topics: [
      {
        id: "future-state-overview",
        title: "Future State Studio Overview",
        description: "AI-powered process optimization workspace",
        content: `
## Future State Studio

Transform waste observations into optimized processes with AI assistance.

### The 6-Stage Pipeline
1. **Synthesis** - AI clusters observations into themes
2. **Solutions** - AI generates improvement recommendations
3. **Sequencing** - Group solutions into implementation waves
4. **Designer** - Visual future state process map
5. **Compare** - Side-by-side current vs. future
6. **Export** - Download deliverables

### Getting Started
1. Complete a waste walk session first
2. Go to **Future State** in sidebar
3. Select a session with observations
4. Work through each stage sequentially

### AI Assistance
Each stage uses AI agents that consider:
- Your observations and themes
- Workflow context (purpose, constraints)
- Industry best practices
- Implementation feasibility
        `,
        keywords: ["future state", "studio", "ai", "optimize", "improvement", "pipeline"],
        relatedTopics: ["synthesis", "solutions", "designer", "step-design"],
      },
      {
        id: "synthesis",
        title: "Synthesis Hub",
        description: "AI-powered observation clustering",
        content: `
## Synthesis Hub

The first stage where AI analyzes and groups your observations.

### How It Works
1. Click **"Run Agent"** to start analysis
2. AI groups similar observations into themes
3. Each theme has a root cause identified
4. Review and approve themes

### Themes Include
- **Title** - Descriptive name
- **Root Cause** - Why this waste occurs
- **Linked Observations** - Related findings
- **Impact Assessment** - Severity rating

### Tips
- Review each theme carefully
- Merge similar themes if needed
- Add manual themes for missed patterns
- Approve to proceed to Solutions
        `,
        keywords: ["synthesis", "theme", "cluster", "group", "analyze", "root cause"],
        relatedTopics: ["future-state-overview", "solutions"],
      },
      {
        id: "solutions",
        title: "Solution Builder",
        description: "AI-generated improvement recommendations",
        content: `
## Solution Builder

Stage 2 generates actionable improvement solutions.

### Solution Categories
- 🔴 **Eliminate** - Remove wasteful steps entirely
- 🟡 **Modify** - Improve existing processes
- 🟢 **Create** - Add new capabilities

### Each Solution Includes
- Clear title and description
- Expected impact (time/cost savings)
- Implementation effort estimate
- Linked themes it addresses
- Affected process steps

### Actions
- **Accept** - Approve for implementation planning
- **Reject** - Mark as not viable
- **Edit** - Customize the recommendation
- **Regenerate** - Get new suggestions

### Tips
- Consider quick wins first
- Balance effort vs. impact
- Think about dependencies
- Involve stakeholders in review
        `,
        keywords: ["solution", "recommendation", "eliminate", "modify", "create", "improvement"],
        relatedTopics: ["synthesis", "sequencing", "future-state-overview"],
      },
      {
        id: "sequencing",
        title: "Roadmap Builder",
        description: "Organize solutions into implementation waves",
        content: `
## Roadmap Builder

Stage 3 groups solutions into timed implementation phases.

### Waves (Horizons)
- **Wave 1** - Quick wins (0-3 months)
- **Wave 2** - Medium-term (3-6 months)
- **Wave 3** - Long-term (6-12 months)

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
        `,
        keywords: ["sequencing", "roadmap", "wave", "timeline", "implementation", "planning"],
        relatedTopics: ["solutions", "designer", "future-state-overview"],
      },
      {
        id: "designer",
        title: "Future State Designer",
        description: "Visual future state process design",
        content: `
## Future State Designer

Stage 4 creates the optimized process visualization.

### The Canvas
- Visual map based on current workflow
- Steps marked with planned changes
- Color-coded by action type:
  - Red = Eliminate
  - Yellow = Modify  
  - Green = Create
  - Blue = Unchanged

### Working with Steps
1. Click any step to open the design panel
2. Use **Step Design Assist** for AI help
3. Review and customize the design
4. Mark as complete when done

### Node Status Badges
- 🔵 Not Started
- 🟡 In Progress
- 🟢 Complete

### Tips
- Work systematically through the map
- Use the Solution Tracker sidebar
- Check cross-lane dependencies
- Validate with process owners
        `,
        keywords: ["designer", "canvas", "map", "visual", "process", "steps"],
        relatedTopics: ["step-design", "compare", "future-state-overview"],
      },
      {
        id: "step-design",
        title: "Step Design Assist",
        description: "AI-powered step-level design help",
        content: `
## Step Design Assist

Get detailed AI help for designing each process step.

### Opening the Panel
1. Click any step in the Designer canvas
2. The side panel opens automatically
3. See linked solutions and current status

### Panel Tabs

**Options Tab**
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

**Context Tab**
- Answer AI questions for better results
- Chat with the AI for clarification
- View current assumptions

**History Tab**
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
        `,
        keywords: ["step design", "assist", "ai", "options", "generate", "panel", "design"],
        relatedTopics: ["designer", "future-state-overview"],
      },
      {
        id: "compare",
        title: "Compare View",
        description: "Side-by-side current vs. future state",
        content: `
## Compare View

Stage 5 shows current and future processes side-by-side.

### What You'll See
- Left: Current state workflow
- Right: Future state workflow
- Highlighted differences
- Impact summary

### Metrics Comparison
- Total step count
- Cycle time estimates
- Waste categories addressed
- Automation opportunities

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
        `,
        keywords: ["compare", "side by side", "current", "future", "difference"],
        relatedTopics: ["designer", "export", "future-state-overview"],
      },
      {
        id: "export",
        title: "Export Deliverables",
        description: "Download reports and documentation",
        content: `
## Export Deliverables

Stage 6 generates professional documentation.

### Available Exports
- **Summary Report (PDF)** - Executive overview
- **Presentation (PPTX)** - Stakeholder deck
- **Process Maps (PNG/SVG)** - Visual diagrams
- **Data Export (CSV)** - Raw data for analysis

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
        `,
        keywords: ["export", "report", "pdf", "presentation", "download", "deliverable"],
        relatedTopics: ["compare", "future-state-overview"],
      },
    ],
  },
  {
    id: "analytics",
    title: "Analytics",
    icon: "bar-chart",
    topics: [
      {
        id: "analytics-overview",
        title: "Analytics Overview",
        description: "Understanding your analytics dashboard",
        content: `
## Analytics Dashboard

Transform observation data into actionable insights.

### Key Features
- Waste distribution charts
- Hotspot identification
- AI recommendations
- Session comparisons

### Summary Stats
- Total observations
- Waste types found
- Lanes affected
- Quick wins available

### Filtering
Use the session dropdown to:
- View all sessions combined
- Focus on a specific session
        `,
        keywords: ["analytics", "dashboard", "charts", "insights", "data"],
        relatedTopics: ["charts", "hotspots", "insights"],
      },
      {
        id: "charts",
        title: "Understanding Charts",
        description: "Interpret analytics visualizations",
        content: `
## Analytics Charts

### Waste Distribution (Pie)
- Shows percentage by waste type
- Hover for exact counts
- Colors match waste definitions

### By Swimlane (Bar)
- Observations per lane
- Blue = Digital waste
- Green = Physical waste
- Longer bars = More observations

### Reading Charts
- Large segments = Common waste
- Compare lanes for focus areas
- Look for patterns
        `,
        keywords: ["chart", "pie", "bar", "graph", "visualization"],
        relatedTopics: ["analytics-overview"],
      },
      {
        id: "hotspots",
        title: "Waste Hotspots",
        description: "Understanding priority rankings",
        content: `
## Waste Hotspots

Process steps with highest improvement priority.

### Priority Score
Calculated as: Frequency × Impact × Ease

Higher scores mean:
- Happens often
- Significant effect
- Easier to fix

### Using Hotspots
1. Focus on top-ranked steps
2. Look for quick wins (low effort)
3. Plan improvement initiatives
4. Track changes over time
        `,
        keywords: ["hotspot", "priority", "ranking", "focus", "improvement"],
        relatedTopics: ["analytics-overview", "insights"],
      },
      {
        id: "insights",
        title: "AI Insights",
        description: "AI-powered recommendations",
        content: `
## AI-Generated Insights

Smart recommendations based on your data.

### Insight Types
- ⚡ **Quick Win** - Easy, high-impact
- ⚠️ **Hotspot** - Critical areas
- 📈 **Trend** - Patterns detected

### Using Insights
- Review all recommendations
- Prioritize quick wins
- Address hotspots strategically
- Monitor trends

### Requirements
- Sufficient observation data
- Diverse waste types
- Completed sessions
        `,
        keywords: ["ai", "insight", "recommendation", "suggestion", "intelligent"],
        relatedTopics: ["analytics-overview", "hotspots"],
      },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    icon: "settings",
    topics: [
      {
        id: "profile-settings",
        title: "Profile Settings",
        description: "Update your personal information",
        content: `
## Profile Settings

### Updating Your Name
1. Go to **Settings**
2. Edit the Name field
3. Click **"Save Profile"**

### Email Address
Your email is your login and cannot be changed directly. Contact an admin if needed.

### Profile Picture
Use your avatar initials or upload a photo (if supported).
        `,
        keywords: ["profile", "name", "email", "account", "personal"],
        relatedTopics: ["password-settings", "notification-settings"],
      },
      {
        id: "password-settings",
        title: "Changing Password",
        description: "Update your account password",
        content: `
## Changing Your Password

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
        `,
        keywords: ["password", "change", "reset", "security"],
        relatedTopics: ["profile-settings"],
      },
      {
        id: "notification-settings",
        title: "Notification Preferences",
        description: "Control your notifications",
        content: `
## Notification Settings

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
        `,
        keywords: ["notification", "alert", "browser", "desktop", "preferences"],
        relatedTopics: ["profile-settings"],
      },
    ],
  },
  {
    id: "admin",
    title: "Administration",
    icon: "shield",
    topics: [
      {
        id: "admin-overview",
        title: "Admin Panel Overview",
        description: "Administrator features overview",
        content: `
## Admin Panel

Administrators have access to system configuration.

### Tabs
- **Waste Types** - Configure waste definitions
- **Training** - Manage training content
- **Users** - Invite and manage users
- **Organization** - Org settings

### Access
Admin panel is only visible to users with Admin role.
        `,
        keywords: ["admin", "administrator", "panel", "configure", "manage"],
        relatedTopics: ["managing-users", "managing-waste-types"],
      },
      {
        id: "managing-users",
        title: "Managing Users",
        description: "Invite and manage team members",
        content: `
## User Management

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
        `,
        keywords: ["user", "invite", "role", "remove", "manage", "team"],
        relatedTopics: ["admin-overview", "roles"],
      },
      {
        id: "managing-waste-types",
        title: "Managing Waste Types",
        description: "Configure waste definitions",
        content: `
## Waste Type Management

### Adding a Type
1. Go to Admin → Waste Types
2. Click "Add Waste Type"
3. Enter code, name, description
4. Choose category and color
5. Save

### Editing Types
Click the ⋮ menu on any type to edit.

### Categories
- **Core Lean** - Traditional DOWNTIME
- **Digital** - Digital/office waste
        `,
        keywords: ["waste type", "configure", "add", "edit", "DOWNTIME"],
        relatedTopics: ["admin-overview", "cheat-sheet"],
      },
    ],
  },
];

// Page-specific help configurations
export const pageHelp: Record<string, PageHelp> = {
  dashboard: {
    pageId: "dashboard",
    title: "Dashboard Help",
    description: "Your central hub for ProcessOpt",
    quickActions: [
      { label: "Start Training", href: "/training", description: "Begin learning modules" },
      { label: "View Workflows", href: "/workflows", description: "Explore process maps" },
      { label: "Check Sessions", href: "/sessions", description: "See active sessions" },
    ],
    featuredTopics: ["first-login", "navigation", "roles"],
  },
  training: {
    pageId: "training",
    title: "Training Help",
    description: "Learn Lean waste identification",
    quickActions: [
      { label: "Cheat Sheet", href: "/training/cheat-sheet", description: "Quick waste reference" },
    ],
    featuredTopics: ["training-overview", "cheat-sheet", "completing-modules"],
  },
  workflows: {
    pageId: "workflows",
    title: "Workflows Help",
    description: "Manage process workflows",
    quickActions: [
      { label: "Create Workflow", href: "/workflows/new", description: "Build a new process map" },
    ],
    featuredTopics: ["workflow-overview", "creating-workflows", "importing-workflows"],
  },
  sessions: {
    pageId: "sessions",
    title: "Sessions Help",
    description: "Run waste walk sessions",
    quickActions: [
      { label: "New Session", href: "/sessions/new", description: "Start a waste walk" },
    ],
    featuredTopics: ["session-overview", "creating-sessions", "adding-observations"],
  },
  analytics: {
    pageId: "analytics",
    title: "Analytics Help",
    description: "Insights from your data",
    quickActions: [
      { label: "Compare Sessions", href: "/analytics/compare", description: "Side-by-side comparison" },
    ],
    featuredTopics: ["analytics-overview", "charts", "hotspots", "insights"],
  },
  "future-state": {
    pageId: "future-state",
    title: "Future State Studio Help",
    description: "AI-powered process optimization",
    quickActions: [
      { label: "User Guide", href: "/docs", description: "Full documentation" },
      { label: "Quick Start", href: "/docs/quick-start", description: "Get started in 5 minutes" },
    ],
    featuredTopics: ["future-state-overview", "synthesis", "solutions", "designer", "step-design"],
  },
  settings: {
    pageId: "settings",
    title: "Settings Help",
    description: "Configure your preferences",
    quickActions: [],
    featuredTopics: ["profile-settings", "password-settings", "notification-settings"],
  },
  admin: {
    pageId: "admin",
    title: "Admin Help",
    description: "System administration",
    quickActions: [],
    featuredTopics: ["admin-overview", "managing-users", "managing-waste-types"],
  },
};

// Search function for help content
export function searchHelpContent(query: string): HelpTopic[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  const results: { topic: HelpTopic; score: number }[] = [];

  for (const section of helpSections) {
    for (const topic of section.topics) {
      let score = 0;

      // Title match (highest weight)
      if (topic.title.toLowerCase().includes(normalizedQuery)) {
        score += 10;
      }

      // Description match
      if (topic.description.toLowerCase().includes(normalizedQuery)) {
        score += 5;
      }

      // Keyword match
      for (const keyword of topic.keywords) {
        if (keyword.toLowerCase().includes(normalizedQuery)) {
          score += 3;
        }
      }

      // Content match (lowest weight)
      if (topic.content.toLowerCase().includes(normalizedQuery)) {
        score += 1;
      }

      if (score > 0) {
        results.push({ topic, score });
      }
    }
  }

  // Sort by score descending
  return results
    .sort((a, b) => b.score - a.score)
    .map((r) => r.topic);
}

// Get help topic by ID
export function getHelpTopic(topicId: string): HelpTopic | undefined {
  for (const section of helpSections) {
    const topic = section.topics.find((t) => t.id === topicId);
    if (topic) return topic;
  }
  return undefined;
}

// Get page-specific help
export function getPageHelp(pathname: string): PageHelp | undefined {
  // Extract page identifier from pathname
  const segments = pathname.split("/").filter(Boolean);
  const pageId = segments[0] || "dashboard";
  
  return pageHelp[pageId];
}

// Get all topics for a section
export function getSectionTopics(sectionId: string): HelpTopic[] {
  const section = helpSections.find((s) => s.id === sectionId);
  return section?.topics || [];
}

