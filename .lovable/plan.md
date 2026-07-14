## Same crash = plist exists on disk but Xcode isn't bundling it

The `git pull` brought the file to `ios/App/App/GoogleService-Info.plist`, but Xcode won't ship it into the app unless it's **registered in the project and added to the App target**. Right now it isn't, so Firebase still can't find it at launch → same crash.

## Do this in Xcode (2 minutes)

1. **Stop the running app** (⌘ + . or the red ■ button).

2. In the left sidebar (Project Navigator, the folder icon at top-left), find the inner **App** group — the one that contains `AppDelegate.swift`, `Info.plist`, `Assets.xcassets`.

3. **Right-click that inner `App` group → "Add Files to "App"…"**

4. In the file picker:
   - Navigate to `ios/App/App/`
   - Select **`GoogleService-Info.plist`**
   - At the bottom of the dialog:
     - ✅ **Copy items if needed** — leave checked (harmless, file is already there)
     - **Added folders:** "Create groups"
     - ✅ **Add to targets: App** — this is the critical checkbox
   - Click **Add**

5. Verify it's in the target: click `GoogleService-Info.plist` in the sidebar → open the **File Inspector** on the right (⌥⌘1) → under **Target Membership**, "App" must be checked.

6. **Clean build folder**: Product menu → **Clean Build Folder** (⇧⌘K).

7. Press ▶️ **Run** again.

The Firebase crash will be gone and you'll see Mia launch in the simulator.

## Why the earlier drag-and-drop didn't stick

You did `git pull` which puts the file on disk, but Xcode's `.pcbxproj` file (the project manifest) has no reference to it, so it isn't copied into the app bundle at build time. The "Add Files to…" step is what edits `.pbxproj` to register it.

## After it launches

Reply "it's running" and I'll walk through the remaining Apple submission steps (signing team, Push Notifications capability, App Store Connect metadata, screenshots).
