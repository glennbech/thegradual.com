# 🚀 Quick Start - TheGradual iOS App

Get the iOS app running in under 5 minutes!

## Prerequisites

- ✅ macOS computer (required for iOS development)
- ✅ Xcode installed (free from Mac App Store)
- ✅ Apple ID (free, for code signing)

## Step-by-Step

### 1. Open Xcode Project

**Option A: Using the script**
```bash
cd ios
./open-xcode.sh
```

**Option B: Manually**
```bash
cd ios
open TheGradual.xcodeproj
```

### 2. Configure Code Signing

When Xcode opens:

1. **Click on "TheGradual" in the left sidebar** (top item, blue icon)
2. **Select the "TheGradual" target** (under TARGETS)
3. **Go to "Signing & Capabilities" tab** (top bar)
4. **Check "Automatically manage signing"**
5. **Select your Team:**
   - If you see your Apple ID → Select it
   - If you see "None" → Click "Add Account" and sign in with your Apple ID
   - Xcode will automatically create a free development certificate

### 3. Choose Where to Run

In the **top toolbar**, click the device selector (next to "TheGradual" and ▶ button):

**For Quick Testing (No Device Required):**
- Select **iPhone 15 Pro** (or any simulator)
- Simulators run on your Mac instantly

**For Real Device Testing:**
- Connect your iPhone/iPad via USB
- Unlock it and tap "Trust This Computer"
- Select your device from the list

### 4. Build and Run

Click the **Play button (▶)** or press **Cmd+R**

**What happens:**
1. Xcode compiles the Swift code (~10-30 seconds first time)
2. App installs to simulator/device
3. App launches automatically
4. You'll see "TheGradual" loading screen
5. Web app loads from https://thegradual.com

🎉 **That's it! You're running the iOS app!**

---

## Troubleshooting

### "Signing for 'TheGradual' requires a development team"
→ Go back to Step 2 and select your Apple ID as the Team

### "Failed to code sign"
→ Change the Bundle Identifier:
1. Signing & Capabilities tab
2. Under "Bundle Identifier", change `com.thegradual.app` to `com.YOURNAME.thegradual`
3. Try again

### Simulator is slow
→ First launch is always slow (30-60 seconds)
→ Subsequent launches are much faster

### App shows "Failed to load"
→ Check your internet connection
→ Try loading https://thegradual.com in Safari first

### Changes to web app not showing
→ Pull to refresh in the app
→ Or: Delete app and reinstall

---

## Next Steps

### Test on Real Device
1. Connect iPhone/iPad
2. Select it in Xcode toolbar
3. Build and run (Cmd+R)
4. **Free Apple ID limitation:** App expires after 7 days (rebuild to renew)

### Add App Icons
1. Create 1024x1024 PNG icon
2. Use https://appicon.co to generate all sizes
3. Drag into `Assets.xcassets/AppIcon`

### Deploy to TestFlight (requires $99/year Apple Developer Program)
1. **Product** → **Archive**
2. **Distribute App** → **App Store Connect**
3. Upload to TestFlight
4. Invite testers via email

---

## Development Tips

### Test Local Changes
Change the URL in `ViewController.swift` line 9:
```swift
private let appURL = "http://localhost:5173"  // For local development
```
Then run `npm run dev` in the web app folder.

### Debug JavaScript
1. Run app in simulator
2. Open **Safari** → **Develop** → **Simulator** → **TheGradual**
3. Safari Web Inspector opens with console, network, etc.

### View Logs
In Xcode, open **Debug Area** (Cmd+Shift+Y) to see:
- Swift print statements
- JavaScript console.log messages
- Network errors

---

## Common Modifications

### Change App Name
**Info.plist** → `CFBundleDisplayName` → "Your Name"

### Support Older iPhones
**Project Settings** → **Deployment Target** → Change to iOS 13.0 or lower

### Add Splash Screen Color
**LaunchScreen.storyboard** → Select view → Change background color

---

## Getting Help

**iOS/Xcode Issues:**
- Check [iOS README](README.md) for detailed docs
- Xcode menu → **Help** → **Search** for specific errors

**Web App Issues:**
- See main project README
- Test in mobile Safari first

**Can't find something in Xcode?**
- Cmd+Shift+O to open file by name
- Cmd+K to clear console

---

**Ready to ship? See [README.md](README.md) for App Store submission guide.**
