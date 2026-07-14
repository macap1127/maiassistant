# Open the correct Xcode file and run

You're at the Xcode welcome screen with two recent "App" entries. We need to open the **workspace** (not the project), then clean and run.

## Steps

1. **Pick the workspace file**
   - In the recent files list on the right, the top entry (highlighted blue) should be `App.xcworkspace`.
   - Double-click it to open.
   - If you're not sure which is which, click **Open Existing Project…** at the bottom of the welcome screen, then navigate to:
     ```text
     Users/user935189/maiassistant/ios/App/App.xcworkspace
     ```
     Select it and click **Open**.

2. **Why `.xcworkspace` matters**
   - `.xcodeproj` opens the raw project — CocoaPods dependencies (Firebase, Capacitor plugins) won't load and the build will fail.
   - `.xcworkspace` includes both the project and the Pods — this is what `pod install` set up.

3. **Once the workspace is open in Xcode**
   - Wait for the "Indexing" / "Processing files" bar at the top to finish (can take 30–60s the first time).
   - Menu bar: **Product → Clean Build Folder** (⇧⌘K).
   - Make sure the run destination (top of window, next to the app name) is set to an iPhone simulator, e.g. **iPhone 17 Pro**.
   - Click the **▶️ Run** button (or ⌘R).

4. **Report back**
   - If the app launches and stays open: 🎉 tell me and we'll move on to Apple submission.
   - If it crashes again: open **View → Debug Area → Activate Console** in Xcode, tap the app to reproduce the crash, and paste the red error lines here so I can pinpoint the cause.

## Nothing to code

This is all manual Xcode work on your MacinCloud machine — no changes needed in the Lovable project right now.
