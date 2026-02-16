# TheGradual iOS App

A native iOS wrapper for TheGradual web app, providing a seamless native experience with enhanced iOS features.

## Overview

This is a **hybrid iOS app** that wraps the TheGradual web application (https://thegradual.com) in a native WKWebView container. It provides:

- ✅ Native iOS app experience (no Safari chrome/UI)
- ✅ Full-screen immersive interface
- ✅ Haptic feedback integration
- ✅ Offline capability through WKWebView caching
- ✅ Pull-to-refresh gesture
- ✅ Native loading screen
- ✅ iOS status bar integration

## Architecture

### WKWebView Wrapper
The app uses `WKWebView` (modern iOS web view) to load and display the React web application. This provides:

- Full JavaScript/ES6 support
- Modern CSS/animations
- Local storage persistence
- Service worker support (PWA features)
- Native-like performance

### Native Features

**Haptic Feedback**
- JavaScript bridge allows web app to trigger iOS haptic feedback
- Three intensity levels: light, medium, heavy
- Usage from web app:
  ```javascript
  window.webkit.messageHandlers.nativeApp.postMessage({
    action: 'vibrate',  // or 'vibrateLight', 'vibrateHeavy'
  });
  ```

**App Detection**
- JavaScript variables injected at page load:
  - `window.isNativeApp = true`
  - `window.platform = 'ios'`
- Web app can conditionally enable native features

**Pull-to-Refresh**
- Native iOS refresh control
- Reloads web app content

**Network Error Handling**
- Native alerts for connection failures
- Retry mechanism

## Project Structure

```
ios/
├── TheGradual.xcodeproj/          # Xcode project file
│   └── project.pbxproj            # Project configuration
├── TheGradual/                    # App source code
│   ├── AppDelegate.swift          # App lifecycle
│   ├── SceneDelegate.swift        # Scene/window management (iOS 13+)
│   ├── ViewController.swift       # Main view controller (WKWebView)
│   ├── Info.plist                 # App configuration
│   ├── LaunchScreen.storyboard    # Launch screen
│   └── Assets.xcassets/           # Images/icons
│       ├── AppIcon.appiconset/    # App icons (need to add images)
│       └── AccentColor.colorset/  # Accent color
└── README.md                      # This file
```

## Requirements

- **Xcode**: 14.0 or later
- **iOS Deployment Target**: iOS 14.0+
- **Swift**: 5.0+
- **macOS**: Required for building iOS apps

## Setup Instructions

### 1. Install Xcode
Download from the Mac App Store or [Apple Developer](https://developer.apple.com/xcode/).

### 2. Open the Project
```bash
cd ios
open TheGradual.xcodeproj
```

### 3. Configure Code Signing
In Xcode:
1. Select the project in the navigator (left sidebar)
2. Select the "TheGradual" target
3. Go to "Signing & Capabilities" tab
4. **Team**: Select your Apple Developer account
   - If you don't have one, you can use a free Apple ID for testing
5. **Bundle Identifier**: Change to something unique (e.g., `com.yourname.thegradual`)

### 4. Add App Icons (Optional but Recommended)
The project expects app icons in `TheGradual/Assets.xcassets/AppIcon.appiconset/`.

**Required sizes:**
- iPhone: 40x40, 60x60, 80x80, 87x87, 120x120, 180x180 (@2x and @3x)
- iPad: 20x20, 29x29, 40x40, 76x76, 83.5x83.5
- App Store: 1024x1024

**Easy way to generate:**
1. Create a 1024x1024 PNG icon
2. Use [AppIconMaker](https://appiconmaker.co) or [AppIcon.co](https://appicon.co)
3. Drag generated icons into Xcode's AppIcon asset

### 5. Build and Run
1. Select a simulator or connected device from the toolbar
2. Click the "Play" button (▶) or press `Cmd+R`
3. App will build and launch

## Configuration

### Change Web App URL
Edit `ViewController.swift` line 9:
```swift
private let appURL = "https://thegradual.com"  // Change this for dev/staging
```

For local development:
```swift
private let appURL = "http://localhost:5173"
```

### App Name and Bundle ID
Edit `Info.plist`:
- `CFBundleDisplayName`: "TheGradual" (shown on home screen)
- `CFBundleIdentifier`: `com.thegradual.app` (must be unique)

### Deployment Target
To support older iOS versions, edit `project.pbxproj`:
```
IPHONEOS_DEPLOYMENT_TARGET = 14.0;  // Change to minimum iOS version
```

## Building for Production

### 1. Archive the App
1. In Xcode, select **Any iOS Device** as the destination
2. **Product** → **Archive**
3. Wait for build to complete
4. Xcode Organizer will open with your archive

### 2. Distribute to TestFlight
1. Click **Distribute App**
2. Select **App Store Connect**
3. Follow the wizard (sign, upload)
4. App will appear in App Store Connect for testing

### 3. Submit to App Store
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create a new app listing
3. Fill in metadata (screenshots, description, keywords)
4. Submit for review

**Note:** You need an **Apple Developer Program membership** ($99/year) to distribute to App Store or TestFlight.

## Testing

### Simulator Testing
- **Fast**: Instant builds, no device needed
- **Limitations**: No camera, haptic feedback, some sensors

### Device Testing (Free)
1. Connect iPhone/iPad via USB
2. Select device in Xcode
3. Trust computer on device
4. Build and run (Cmd+R)

**Free provisioning limitations:**
- 7-day expiration (need to rebuild weekly)
- Max 3 devices
- No App Store distribution

### TestFlight (Paid Developer Account)
1. Archive and upload to App Store Connect
2. Invite testers via email
3. Testers install via TestFlight app
4. 90-day builds, up to 10,000 testers

## Development Workflow

### Iterating on Web App
1. Make changes to React app (`src/`)
2. Deploy to S3 (`make webapp-sync`)
3. iOS app auto-loads latest version on launch

### Testing Local Changes
1. Run `npm run dev` (starts on localhost:5173)
2. Change `appURL` to `http://localhost:5173`
3. **Simulator only** (devices can't reach localhost)
4. Or use ngrok/CloudFlare Tunnel for device testing

### Debugging
- **Safari Web Inspector**: Connect iPhone → Safari → Develop → [Device] → [App]
- **Xcode Console**: Shows Swift logs and JavaScript errors
- **Network Tab**: Monitor API calls

## Native Bridge API

The app exposes a JavaScript bridge for native features:

### Haptic Feedback
```javascript
// Check if running in native app
if (window.isNativeApp && window.platform === 'ios') {
  // Trigger haptic feedback
  window.webkit.messageHandlers.nativeApp.postMessage({
    action: 'vibrate'        // Medium intensity
    // or 'vibrateLight'     // Light tap
    // or 'vibrateHeavy'     // Strong impact
  });
}
```

### Future Extensions
Add more native features by extending `userContentController(_:didReceive:)` in `ViewController.swift`:

**Examples:**
- Push notifications
- Camera/photo access
- Biometric authentication (Face ID/Touch ID)
- HealthKit integration (workout tracking)
- Background sync
- Share sheets

## Offline Support

**Automatic:**
- WKWebView caches resources
- LocalStorage/IndexedDB persist offline
- Service Worker caching (PWA)

**Manual:**
- Bundle static assets in app (not implemented)
- Pre-cache API responses

## Performance Optimization

**Current optimizations:**
- No zoom (locked viewport)
- Bounce/overscroll enabled (feels native)
- Status bar integration
- Fast launch screen

**Future improvements:**
- Pre-render critical path
- Lazy load heavy assets
- Bundle critical resources in app

## Troubleshooting

### "Failed to load app" error
- Check internet connection
- Verify `appURL` is correct and accessible
- Check Safari can load the URL

### App crashes on launch
- Check Xcode console for error logs
- Verify code signing is configured
- Try cleaning build folder (Cmd+Shift+K)

### App shows blank screen
- Open Safari Web Inspector to check for JavaScript errors
- Verify web app is deployed and accessible
- Check for console errors

### Changes not appearing
- WKWebView caches aggressively
- Clear cache: Delete and reinstall app
- Or add cache busting to web app URLs

## App Store Guidelines

Before submitting, ensure compliance:

- ✅ App provides value beyond website (native features, offline, performance)
- ✅ Content is appropriate and follows guidelines
- ✅ Privacy policy linked (required for data collection)
- ✅ App icons and screenshots included
- ✅ No broken links or placeholder content

**Potential rejections:**
- ❌ "Just a web view" - Add native features to differentiate
- ❌ Broken functionality - Test thoroughly
- ❌ Missing metadata - Complete all App Store Connect fields

## License

Same as parent project.

## Support

For iOS-specific issues:
1. Check Xcode console logs
2. Test in Safari first (to isolate iOS vs web issues)
3. Verify network connectivity

For web app issues, see main project README.

---

**Built with ❤️ for TheGradual users**
