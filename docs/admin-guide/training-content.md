# Training Content Management

Learn how to create and manage training modules as an administrator.

## Overview

Training content helps users learn Lean methodology and waste identification. Administrators can create custom training modules tailored to their organization's needs.

---

## Accessing Training Management

1. Click **Admin** in the sidebar
2. Select the **Training** tab
3. View and manage all training modules

---

## Training Module Types

### Video 🎥
- Embedded video content
- Supports YouTube, Vimeo, or hosted videos
- Tracks completion when fully watched

### Slides 📄
- Presentation-style content
- Step-through navigation
- Good for visual concepts

### Article 📖
- Long-form written content
- Supports rich text formatting
- Scroll-based completion

### Quiz ❓
- Interactive knowledge checks
- Multiple choice questions
- Scored with passing thresholds

---

## Creating a Training Module

1. Click **"Add Module"** button
2. Fill in the module details:

### Basic Information

**Title** (Required)
The module name displayed to users.
- Keep it descriptive but concise
- Example: "Introduction to Lean Waste"

**Description** (Required)
Brief summary shown in the module list.
- 1-2 sentences
- Explain what users will learn

**Type** (Required)
Select: Video, Slides, Article, or Quiz

**Category** (Optional)
Group related modules together.
- Examples: "Fundamentals", "Advanced", "Digital Waste"

**Order** (Number)
Position in the training sequence.
- Lower numbers appear first
- Use for sequential learning paths

### Content Configuration

**Duration** (Minutes)
Estimated time to complete.
- Helps users plan their learning
- Shown on module cards

**Content URL** (For Video/Slides)
Link to the content:
- YouTube: Full video URL
- Vimeo: Video URL
- Hosted: Direct link to content

**Content Body** (For Articles)
Rich text content:
- Supports headers, lists, bold, italic
- Can include images
- Markdown supported

**Questions** (For Quizzes)
Add quiz questions:
- Question text
- Answer options
- Correct answer marking
- Explanation for feedback

### Prerequisites

**Requires Completion Of** (Optional)
Select modules that must be completed first.
- Creates learning paths
- Locked modules show to users

3. Click **"Save"** to create the module

---

## Editing Training Content

1. Find the module in the list
2. Click the **three-dot menu** (⋮)
3. Select **"Edit"**
4. Modify fields as needed
5. Click **"Save Changes"**

### Editing Considerations
- Changes apply immediately
- Users in progress may be affected
- Consider versioning for major changes

---

## Deleting Training Content

1. Find the module in the list
2. Click the **three-dot menu** (⋮)
3. Select **"Delete"**
4. Confirm the deletion

### Before Deleting
- Check if users have progress on this module
- Consider archiving instead
- Update any dependencies

---

## Creating a Learning Path

Organize modules into a sequential path:

1. Set module **Order** numbers (1, 2, 3, etc.)
2. Configure **Prerequisites**
3. Users must complete in order

### Example Path
```
1. Introduction to Lean (Order: 1, Prerequisites: None)
    ↓
2. Understanding Waste (Order: 2, Prerequisites: Module 1)
    ↓
3. DOWNTIME Categories (Order: 3, Prerequisites: Module 2)
    ↓
4. Digital Waste (Order: 4, Prerequisites: Module 3)
    ↓
5. Final Assessment (Order: 5, Prerequisites: All above)
```

---

## Quiz Configuration

### Adding Questions

For each question:

1. **Question Text**
   - Clear, unambiguous wording
   - Focus on key concepts

2. **Answer Options**
   - Typically 4 options (A, B, C, D)
   - One correct answer
   - Plausible distractors

3. **Correct Answer**
   - Mark which option is correct
   - Can have multiple correct (if configured)

4. **Explanation**
   - Shown after answering
   - Reinforces learning

### Passing Score
Set the minimum score to pass:
- Percentage (e.g., 70%)
- Users can retake to improve

---

## Content Best Practices

### Videos
- Keep under 10 minutes
- Focus on one concept per video
- Include visual examples
- Provide captions/transcripts

### Articles
- Use headers for organization
- Include images and diagrams
- Break into digestible sections
- Summarize key points

### Slides
- One concept per slide
- Minimal text, more visuals
- Include notes for context
- Allow self-paced navigation

### Quizzes
- Test application, not memorization
- Use scenario-based questions
- Provide helpful feedback
- Keep reasonable length (5-10 questions)

---

## Tracking Progress

View training completion metrics:

### Organization Overview
- Overall completion rate
- Module-by-module stats
- Users who haven't started

### Individual Progress
- See who completed what
- Track quiz scores
- Identify struggling users

---

## Content Updates

### Minor Updates
- Fix typos, update examples
- Apply immediately
- No user notification needed

### Major Updates
- Consider creating new version
- Notify users of changes
- May require recompletion

### Versioning Strategy
- Keep original for historical reference
- Create new module for updated content
- Update prerequisites as needed

---

## Troubleshooting

### "Video not playing"
- Verify URL is correct
- Check video privacy settings
- Test embedding is allowed

### "Users can't access module"
- Check prerequisite completion
- Verify module is published
- Check user permissions

### "Quiz not saving scores"
- Verify all questions have correct answers
- Check for validation errors
- Try saving again

### "Progress not tracking"
- Ensure user is logged in
- Check browser compatibility
- Clear cache and retry

