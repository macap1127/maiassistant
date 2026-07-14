## Next step in Xcode: Configure Signing

You're in the project navigator with the App target expanded. To run on the simulator (and later a real device), you need to open project settings and set your Apple Developer team.

### Steps

1. Click the **blue "App" icon** at the very top of the left sidebar (the project root, above `debug` and the `App` folder).
2. The center pane will show project settings with tabs across the top: **General | Signing & Capabilities | Resource Tags | Info | Build Settings | Build Phases | Build Rules**.
3. Click **"Signing & Capabilities"**.
4. Under **Team**, pick your Apple Developer team from the dropdown.
   - If no team appears: Xcode menu → **Settings → Accounts → +** → sign in with your Apple ID, then return to Signing & Capabilities.
5. Confirm **Bundle Identifier** is: `app.lovable.900ab33e726449beaa2455300941d738`
6. "Automatically manage signing" should already be checked — leave it.

### After signing is set

- Verify the run destination at the top center says **iPhone 17 Pro** (simulator).
- Hit the **▶ Play button** (top-left) to build and launch.

### What to send next

Screenshot of the **Signing & Capabilities** tab after selecting your team, so I can confirm no red errors appear (common ones: "No account", provisioning profile issues, bundle ID conflict).
