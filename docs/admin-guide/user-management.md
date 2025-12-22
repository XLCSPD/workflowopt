# User Management

Learn how to invite, manage, and organize users in your organization.

## Overview

User management allows administrators to:
- Invite new team members
- Assign and change roles
- Remove users from the organization
- Monitor user activity

---

## Accessing User Management

1. Click **Admin** in the sidebar
2. Select the **Users** tab
3. View all organization members

---

## User List

The user list displays:

| Column | Description |
|--------|-------------|
| **User** | Name and email |
| **Role** | Current permission level |
| **Status** | Active, Pending, Inactive |
| **Joined** | When they joined |
| **Last Active** | Recent activity date |

### Filtering Users
- **All** - Everyone in the organization
- **Admins** - Administrator role only
- **Facilitators** - Facilitator role only
- **Participants** - Participant role only

### Searching
Use the search box to find users by:
- Name
- Email address

---

## Inviting New Users

1. Click **"Invite User"** button
2. Fill in the invitation form:

### Email Address (Required)
The user's email address.
- Must be a valid email format
- User receives invitation at this address
- Becomes their login credential

### Role (Required)
Select the initial role:
- **Participant** - Basic access
- **Facilitator** - Can manage sessions/workflows
- **Admin** - Full access

3. Click **"Send Invitation"**

### What Happens Next
1. System sends invitation email
2. User clicks link in email
3. User creates their password
4. User is added to organization
5. Admin sees them in the user list

---

## Pending Invitations

View invitations that haven't been accepted:

### Viewing Pending
Scroll down on the Users tab to see the **Pending Invitations** section.

### Pending Invitation Info
- Email address
- Role assigned
- When invited
- Expiration status

### Resending Invitations
1. Find the pending invitation
2. Click **"Resend"** button
3. User receives new email

### Canceling Invitations
1. Find the pending invitation
2. Click **"Cancel"** button
3. Invitation link becomes invalid

---

## Changing User Roles

1. Find the user in the list
2. Click the **three-dot menu** (⋮)
3. Select **"Change Role"**
4. Choose the new role
5. Confirm the change

### Role Change Effects

**Upgrading (e.g., Participant → Facilitator)**
- User gains new permissions immediately
- No data is lost

**Downgrading (e.g., Admin → Participant)**
- User loses permissions immediately
- Their created content remains
- They lose access to admin features

### Best Practices
- Communicate role changes to users
- Document reasons for changes
- Follow principle of least privilege

---

## Removing Users

1. Find the user in the list
2. Click the **three-dot menu** (⋮)
3. Select **"Remove from Organization"**
4. Confirm the removal

### What Happens When Removed
- User loses all access immediately
- Their login no longer works for this org
- Their created content remains
- Observations they made are preserved
- Training progress is deleted

### Before Removing
- Confirm with stakeholders
- Transfer ownership of content if needed
- Export any personal data if required
- Document the removal reason

---

## Bulk Actions

For multiple users:

1. Select users using checkboxes (if available)
2. Choose bulk action:
   - Change role
   - Export list
   - Remove selected

---

## User Activity

Monitor user engagement:

### Last Active
Shows when user last logged in or performed action.

### Training Progress
View individual training completion:
1. Click on user name
2. See their training progress
3. Identify who needs reminders

### Session Participation
See which sessions user participated in and their contribution.

---

## Role Permissions Reference

| Permission | Participant | Facilitator | Admin |
|------------|:-----------:|:-----------:|:-----:|
| Join sessions | ✅ | ✅ | ✅ |
| Add observations | ✅ | ✅ | ✅ |
| Complete training | ✅ | ✅ | ✅ |
| Create workflows | ❌ | ✅ | ✅ |
| Create sessions | ❌ | ✅ | ✅ |
| View analytics | Limited | ✅ | ✅ |
| Invite users | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| Admin settings | ❌ | ❌ | ✅ |

---

## Best Practices

### Invitations
- Use corporate email addresses
- Set appropriate initial roles
- Follow up if not accepted
- Cancel old pending invites

### Role Assignment
- Start with minimal access
- Upgrade as needed
- Document role assignments
- Regular access reviews

### Security
- Have multiple admins (backup)
- Review inactive users
- Remove departed employees promptly
- Monitor for unusual activity

### Communication
- Notify users of role changes
- Explain what they can/cannot do
- Provide training resources
- Be available for questions

---

## Troubleshooting

### "Invitation email not received"
- Check spam/junk folder
- Verify email address is correct
- Resend the invitation
- Check email delivery logs

### "Cannot change own role"
- Admins cannot demote themselves
- Another admin must make the change
- Prevents accidental lockout

### "User cannot log in"
- Verify they completed registration
- Check if account is active
- Reset password if needed
- Ensure correct organization

### "Removed user still appears"
- Refresh the page
- Check if removal was confirmed
- Clear browser cache
- Contact support if persists

