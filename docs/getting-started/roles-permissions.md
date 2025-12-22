# Roles & Permissions

ProcessOpt uses role-based access control to manage what users can do within the application.

## User Roles Overview

| Role | Description | Typical Users |
|------|-------------|---------------|
| **Participant** | Basic access for joining sessions and completing training | Team members, process workers |
| **Facilitator** | Can create and manage sessions and workflows | Process engineers, Lean specialists |
| **Admin** | Full system access including user management | Department heads, system administrators |

---

## Participant Role

Participants are team members who contribute observations during waste walk sessions.

### What Participants Can Do

✅ **Training**
- View and complete training modules
- Access the waste type cheat sheet
- Track personal training progress

✅ **Sessions**
- Join active waste walk sessions
- Add waste observations to process steps
- View their own observation history

✅ **Workflows**
- View published workflows
- Navigate through process steps

✅ **Account**
- Update personal profile
- Change password
- Manage notification preferences

### What Participants Cannot Do

❌ Create or edit workflows
❌ Start new sessions
❌ View full analytics dashboard
❌ Manage other users
❌ Access admin settings

---

## Facilitator Role

Facilitators lead waste walk sessions and manage process workflows.

### What Facilitators Can Do

Everything a Participant can do, plus:

✅ **Workflows**
- Create new workflows
- Edit existing workflows
- Import workflows from JSON/CSV
- Delete workflows

✅ **Sessions**
- Create new waste walk sessions
- Start, pause, and end sessions
- Archive completed sessions
- View all session observations

✅ **Analytics**
- View full analytics dashboard
- Compare sessions
- Generate and export reports
- View AI-powered insights

✅ **Export**
- Export reports to PDF
- Export reports to PowerPoint

### What Facilitators Cannot Do

❌ Invite new users
❌ Change user roles
❌ Manage waste type definitions
❌ Edit training content
❌ Access organization settings

---

## Admin Role

Administrators have full access to all features and system configuration.

### What Admins Can Do

Everything a Facilitator can do, plus:

✅ **User Management**
- Invite new users to the organization
- Change user roles (Participant, Facilitator, Admin)
- Remove users from the organization
- View pending invitations

✅ **Waste Types**
- Create custom waste type definitions
- Edit existing waste types
- Delete waste types
- Configure waste categories

✅ **Training Content**
- Create training modules
- Edit training content
- Upload videos and materials
- Delete training modules

✅ **Organization Settings**
- Edit organization name and details
- Configure system preferences
- View organization-wide statistics

---

## Role Comparison Matrix

| Feature | Participant | Facilitator | Admin |
|---------|:-----------:|:-----------:|:-----:|
| Complete training | ✅ | ✅ | ✅ |
| View cheat sheet | ✅ | ✅ | ✅ |
| Join sessions | ✅ | ✅ | ✅ |
| Add observations | ✅ | ✅ | ✅ |
| View workflows | ✅ | ✅ | ✅ |
| Create workflows | ❌ | ✅ | ✅ |
| Import workflows | ❌ | ✅ | ✅ |
| Create sessions | ❌ | ✅ | ✅ |
| Manage sessions | ❌ | ✅ | ✅ |
| View analytics | Limited | ✅ | ✅ |
| Export reports | ❌ | ✅ | ✅ |
| Invite users | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| Edit waste types | ❌ | ❌ | ✅ |
| Edit training | ❌ | ❌ | ✅ |
| Org settings | ❌ | ❌ | ✅ |

---

## Requesting a Role Change

If you need additional permissions:

1. Contact your organization administrator
2. Explain what you need access to and why
3. The admin can upgrade your role from the Admin panel

---

## Role Assignment

### For New Users

When inviting a new user, admins select the initial role:

1. Go to **Admin** → **Users** tab
2. Click **"Invite User"**
3. Enter the email address
4. Select the role: Participant, Facilitator, or Admin
5. Click **"Send Invitation"**

### Changing Existing Roles

1. Go to **Admin** → **Users** tab
2. Find the user in the list
3. Click the **three-dot menu** (⋮)
4. Select **"Change Role"**
5. Choose the new role
6. Confirm the change

---

## Best Practices

1. **Principle of Least Privilege** - Assign the minimum role needed for each user's responsibilities
2. **Multiple Admins** - Have at least two admins for backup
3. **Regular Audits** - Periodically review user roles and remove unnecessary access
4. **Role Documentation** - Keep records of who has what role and why

