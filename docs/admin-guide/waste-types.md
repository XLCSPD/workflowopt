# Waste Type Management

Learn how to configure and manage waste type definitions as an administrator.

## Overview

Waste types are the categories observers use to tag waste during sessions. ProcessOpt comes with standard Lean waste types, but administrators can customize and extend these to match organizational needs.

---

## Accessing Waste Type Management

1. Click **Admin** in the sidebar
2. Select the **Waste Types** tab
3. View and manage all waste type definitions

---

## Default Waste Categories

### Core Lean Wastes (DOWNTIME)

These are the traditional Lean/Toyota Production System wastes:

| Code | Name | Color |
|------|------|-------|
| D | Defects | Red |
| O | Overproduction | Orange |
| W | Waiting | Yellow |
| N | Non-utilized Talent | Purple |
| T | Transportation | Blue |
| I | Inventory | Cyan |
| M | Motion | Green |
| E | Extra Processing | Pink |

### Digital Wastes

Extended categories for digital/office environments:

| Code | Name | Color |
|------|------|-------|
| IW | Information Waste | Violet |
| DO | Digital Overload | Dark Red |
| UF | Unused Features | Teal |
| ED | Excessive Data | Indigo |
| FW | Format Waste | Purple |
| DW | Digital Waiting | Amber |

---

## Creating a Waste Type

1. Click **"Add Waste Type"** button
2. Fill in the details:

### Required Fields

**Code** (1-3 characters)
A short abbreviation for the waste type.
- Must be unique
- Usually 1-2 uppercase letters
- Appears on badges and charts

**Name** (Text)
The full name of the waste type.
- Keep it concise but descriptive
- Example: "Overproduction"

**Category** (Select)
Choose from:
- `core_lean` - Traditional DOWNTIME wastes
- `digital` - Digital/office-specific wastes

### Optional Fields

**Description** (Text)
A detailed explanation of what this waste type means.
- Define when to use it
- Include examples
- Help observers identify it

**Color** (Hex code)
The color used in charts and badges.
- Use hex format: `#FF5733`
- Ensure good contrast
- Avoid colors too similar to existing types

**Examples** (Text array)
Common examples of this waste type.
- Real-world scenarios
- Industry-specific examples
- Help with recognition

3. Click **"Save"** to create the waste type

---

## Editing a Waste Type

1. Find the waste type in the list
2. Click the **three-dot menu** (⋮)
3. Select **"Edit"**
4. Modify the fields as needed
5. Click **"Save Changes"**

### What Can Be Changed
- Name
- Description
- Color
- Examples

### What Cannot Be Changed
- Code (creates consistency issues)
- Category (would affect existing data)

---

## Deleting a Waste Type

⚠️ **Warning: Consider the impact before deleting**

1. Find the waste type in the list
2. Click the **three-dot menu** (⋮)
3. Select **"Delete"**
4. Confirm the deletion

### Before Deleting
- Check if the type is used in existing observations
- Consider archiving instead (if feature available)
- Document why it was removed

### Impact of Deletion
- Type no longer appears in tagging interface
- Existing observations retain the type data
- Analytics may show "Unknown Type" for old data

---

## Best Practices

### Standardization
- Use consistent naming conventions
- Align with industry standards when possible
- Document your customizations

### Training Integration
- Update training content when adding types
- Include new types in the cheat sheet
- Brief users on custom categories

### Color Choices
- Use distinct, easily differentiated colors
- Consider colorblind accessibility
- Test visibility on charts

### Documentation
- Write clear, actionable descriptions
- Include multiple examples
- Reference how to distinguish from similar types

---

## Waste Type Categories Explained

### Core Lean (DOWNTIME)

The acronym DOWNTIME helps remember the 8 wastes:

- **D**efects - Errors, mistakes, rework
- **O**verproduction - Making more than needed
- **W**aiting - Idle time, delays
- **N**on-utilized Talent - Underused skills
- **T**ransportation - Moving materials unnecessarily
- **I**nventory - Excess stock, WIP
- **M**otion - Unnecessary movement of people
- **E**xtra Processing - Doing more than required

### Digital Wastes

Extended for modern work environments:

- **Information Waste** - Poor data quality, missing info
- **Digital Overload** - Too many tools, notifications
- **Unused Features** - Software not fully utilized
- **Excessive Data** - Collecting unnecessary data
- **Format Waste** - Converting between formats
- **Digital Waiting** - System delays, lag

---

## Viewing Usage Statistics

In the waste types list, you can see:
- How many observations use each type
- Most commonly identified types
- Types that may be underutilized

Use this data to:
- Identify if types need better descriptions
- Consider removing unused types
- Focus training on common types

---

## Importing/Exporting Waste Types

### Export
Currently, waste types can be exported via the database directly.

### Import
Contact system administrator for bulk import assistance.

---

## Troubleshooting

### "Code already exists"
Each code must be unique. Choose a different abbreviation.

### "Cannot delete - in use"
The type is used in observations. Consider:
- Leaving it as-is
- Replacing references first
- Archiving instead of deleting

### "Color not displaying correctly"
- Verify hex format (#RRGGBB)
- Check for typos
- Test in different chart views

