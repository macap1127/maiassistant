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
    FirebaseMessaging: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'DARK',
    },
    Keyboard: {
      resize: 'body',
    },
    SplashScreen: {
      // Keep the native splash on-screen until the JS bundle mounts and calls hide().
      // This covers the "weird text loading screen" testers reported.
      launchShowDuration: 3000,
      launchAutoHide: false,
      backgroundColor: '#0b0b1a',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
