# Workflow Management Guide

Learn how to create, edit, and import process workflows.

## Overview

Workflows are visual representations of your business processes. They show:
- Process steps (tasks, decisions, events)
- Swimlanes (who does what)
- Flow connections (step order)

Workflows serve as the foundation for waste walk sessions.

---

## Accessing Workflows

1. Click **Workflows** in the sidebar
2. View your workflow library
3. Search by name or description

---

## Creating a New Workflow

### Method 1: Create from Scratch

1. Click **"New Workflow"** button
2. Enter a name (e.g., "Patient Intake Process")
3. Add an optional description
4. Click **"Create Workflow"**
5. You'll be taken to the workflow editor

### Method 2: Import from File

1. Click **"Import"** button
2. Choose JSON or CSV format
3. Upload or paste your data
4. Preview the import
5. Click **"Import"** to create

---

## The Workflow Editor

### Canvas Area
The main editing area where you build your workflow:
- **Drag** to pan the view
- **Scroll** to zoom in/out
- **Click** nodes to select them

### Toolbar
Located at the top of the editor:
- **Save** - Save your changes
- **Undo/Redo** - Reverse or repeat actions
- **Zoom Controls** - Adjust view scale
- **Fit View** - Center the workflow

### Node Palette
Add new elements to your workflow:

| Node Type | Icon | Use For |
|-----------|------|---------|
| **Start** | Circle | Beginning of process |
| **Task** | Rectangle | Work activities |
| **Decision** | Diamond | Yes/No branching points |
| **End** | Circle (bold) | Process completion |

### Properties Panel
When a node is selected, edit its properties:
- **Name** - Step title
- **Description** - What happens in this step
- **Swimlane** - Who performs this step
- **Step Type** - Category of activity

---

## Adding Process Steps

### Adding a Step
1. Drag a node type from the palette
2. Drop it on the canvas
3. Click to select it
4. Edit properties in the right panel

### Connecting Steps
1. Hover over a node's edge
2. Drag from the connection point
3. Drop onto another node
4. Connection is created

### Deleting Elements
1. Select the node or connection
2. Press **Delete** or **Backspace**
3. Or right-click and select **Delete**

---

## Swimlanes

Swimlanes represent different roles, departments, or systems.

### Adding a Swimlane
1. Open the Lanes panel
2. Click **"Add Lane"**
3. Enter the lane name (e.g., "Front Desk", "Nurse", "Doctor")

### Assigning Steps to Lanes
1. Select a step
2. In the Properties panel, select the **Swimlane**
3. Step moves to that lane visually

---

## Importing Workflows

### JSON Format

Create a JSON file with this structure:

```json
{
  "name": "My Process",
  "description": "Description of the process",
  "steps": [
    {
      "name": "Start",
      "type": "start",
      "lane": "Customer"
    },
    {
      "name": "Submit Request",
      "type": "task",
      "lane": "Customer",
      "description": "Customer submits their request"
    },
    {
      "name": "Review Request",
      "type": "task",
      "lane": "Staff"
    },
    {
      "name": "Approved?",
      "type": "decision",
      "lane": "Manager"
    },
    {
      "name": "Process Complete",
      "type": "end",
      "lane": "System"
    }
  ],
  "connections": [
    { "from": 0, "to": 1 },
    { "from": 1, "to": 2 },
    { "from": 2, "to": 3 },
    { "from": 3, "to": 4 }
  ]
}
```

### CSV Format

Create a CSV with columns:

```csv
Step Number,Step Name,Description,Lane,Step Type
1,Start,Process begins,Customer,start
2,Submit Request,Customer submits request,Customer,task
3,Review Request,Staff reviews the request,Staff,task
4,Decision Point,Manager approves or rejects,Manager,decision
5,Complete,Process ends,System,end
```

### Import Steps

1. Click **"Import"** on the Workflows page
2. Select format tab (JSON or CSV)
3. Choose **Upload File** or **Paste Content**
4. Review the preview
5. Edit the workflow name if needed
6. Click **"Import Workflow"**

---

## Editing Workflows

### Opening the Editor
1. Find the workflow in your library
2. Click **"View Workflow"** or the workflow card
3. Make your changes in the editor

### Auto-Save
Changes are saved automatically as you work.

### Manual Save
Click **Save** in the toolbar to force save.

---

## Workflow Statistics

Each workflow card shows:
- **Steps** - Number of process steps
- **Lanes** - Number of swimlanes
- **Sessions** - How many waste walk sessions used this workflow
- **Last Updated** - When changes were last made

---

## Starting a Session from a Workflow

1. Find the workflow you want to use
2. Click the **Play** button (▶)
3. Configure session settings
4. Start the waste walk

---

## Best Practices

1. **Use descriptive names** - Make step names clear and action-oriented
2. **Keep it focused** - One process per workflow
3. **Include decision points** - Show where processes branch
4. **Define swimlanes clearly** - Use consistent role/department names
5. **Add descriptions** - Help observers understand each step
6. **Test before sessions** - Walk through the workflow to verify flow
7. **Version control** - Keep notes on major changes

---

## Troubleshooting

### "Cannot delete step with connections"
Remove all connections to/from the step first, then delete.

### "Import failed"
- Check JSON syntax is valid
- Ensure CSV has required columns
- Verify step types are valid (start, task, decision, end)

### "Workflow not appearing"
- Refresh the page
- Check if you have permission to view it
- Verify it wasn't deleted

