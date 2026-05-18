import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aiblueribbon.mia',
  appName: 'Mia Family Assistant',
  webDir: 'dist',
  // NOTE: To enable hot-reload from the Lovable sandbox during development,
  // uncomment the `server` block below. Leave it commented for normal device
  // installs so the app loads the bundled `dist/` build (otherwise you get a
  // black screen because the WebView can't authenticate to the sandbox URL).
  // server: {
  //   url: 'https://900ab33e-7264-49be-aa24-55300941d738.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  // },
  plugins: {
    StatusBar: {
      style: 'DARK',
    },
    Keyboard: {
      resize: 'body',
    },
  },
};

export default config;
