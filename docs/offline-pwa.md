# Offline & PWA Guide

Learn how to install ProcessOpt as a Progressive Web App and use it offline.

## What is a PWA?

ProcessOpt is a Progressive Web App (PWA), meaning it can be:
- Installed on your device like a native app
- Used offline when you don't have internet
- Fast and responsive
- Receive push notifications

---

## Installing the App

### Desktop (Chrome, Edge)

1. Look for the **install icon** in your browser's address bar (usually a + or computer icon)
2. Click **"Install"**
3. The app will open in its own window
4. Find it in your Start menu or Applications folder

### Desktop (Safari on macOS)

1. Click **File** → **Add to Dock**
2. The app appears in your Dock

### Mobile (iOS Safari)

1. Tap the **Share** button (square with arrow)
2. Scroll down and tap **"Add to Home Screen"**
3. Tap **"Add"**
4. The app icon appears on your home screen

### Mobile (Android Chrome)

1. Tap the **three-dot menu** (⋮)
2. Tap **"Install app"** or **"Add to Home Screen"**
3. Tap **"Install"**
4. Find it in your app drawer

---

## Using the App Offline

### What Works Offline

✅ **Available Offline:**
- View cached workflows
- View cached sessions
- Add observations (queued for sync)
- Access training cheat sheet
- View previously loaded analytics

### What Requires Internet

❌ **Needs Connection:**
- Syncing new data
- Real-time collaboration
- AI-generated insights
- Exporting reports
- User authentication
- Loading new content

---

## Offline Observations

### Adding Observations Without Internet

1. Open an active session you've previously loaded
2. Navigate to process steps
3. Add observations as normal
4. Observations are saved locally

### How Sync Works

When you reconnect:
1. The app detects internet is available
2. Queued observations are automatically synced
3. A notification confirms successful sync
4. Data appears in analytics

### Sync Status

Look for sync indicators:
- **Syncing** - Data is being uploaded
- **Synced** - All data up to date
- **Pending** - Waiting for connection

---

## Network Status

### Checking Your Status

The app shows your connection status:
- **Online** - Full functionality
- **Offline** - Limited to cached content

### Status Indicator

Look for network status in the app header or footer (implementation may vary).

---

## Caching Strategy

### What Gets Cached

- **App Shell** - Core UI components
- **Static Assets** - Images, fonts, styles
- **Recent Data** - Last viewed content
- **Cheat Sheet** - Always available

### Cache Updates

Caches update automatically when:
- You load new content
- The app is updated
- Background sync occurs

---

## Troubleshooting

### App Not Installing

**Check browser support:**
- Chrome 67+ ✅
- Firefox 65+ ✅
- Safari 11.1+ ✅
- Edge 79+ ✅

**Verify HTTPS:**
PWAs require secure connections. Ensure you're on https://

**Clear cache and retry:**
1. Clear browser data
2. Reload the page
3. Try installing again

### Offline Not Working

**Ensure initial load:**
- Visit the app while online first
- Navigate to pages you want offline
- Wait for caching to complete

**Check storage:**
- Browser may limit storage
- Clear unused site data
- Check storage settings

### Data Not Syncing

**Check connection:**
- Verify you're online
- Check for network issues
- Try refreshing the page

**Force sync:**
1. Go to Settings
2. Look for "Sync Now" option
3. Or refresh the page while online

**Check for errors:**
- Look for sync error messages
- Note any failed items
- Contact support if persistent

### App Outdated

**Force update:**
1. Close all app windows
2. Clear cache for the site
3. Reopen the app
4. New version will load

---

## Best Practices

### Prepare for Offline

Before going offline:
1. Open sessions you'll need
2. View relevant workflows
3. Access the cheat sheet
4. Ensure recent sync

### During Sessions

In areas with poor connectivity:
1. Pre-load session data
2. Take notes if app doesn't respond
3. Reconnect when possible
4. Verify sync completed

### Battery Optimization

PWAs are generally efficient, but:
- Reduce sync frequency if needed
- Close app when not in use
- Background sync uses minimal power

---

## Data Privacy

### Cached Data

Local data is stored securely:
- Uses browser's secure storage
- Encrypted on modern browsers
- Cleared when you sign out

### Shared Devices

If using a shared device:
- Sign out when done
- Use private/incognito mode
- Don't save passwords

---

## Removing the App

### Desktop

**Windows:**
- Right-click app → Uninstall
- Or Settings → Apps → Uninstall

**macOS:**
- Drag from Applications to Trash
- Or right-click → Move to Trash

### Mobile

**iOS:**
- Long-press app icon
- Tap "Remove App"
- Confirm deletion

**Android:**
- Long-press app icon
- Drag to "Uninstall"
- Or App Info → Uninstall

---

## Technical Details

### Service Worker

ProcessOpt uses a service worker to:
- Cache assets
- Handle offline requests
- Manage background sync
- Enable push notifications

### Storage APIs

Uses browser storage for:
- IndexedDB - Structured data
- Cache API - Network responses
- LocalStorage - Preferences

### Updates

The app checks for updates:
- On every page load
- In the background
- Shows prompt when available

