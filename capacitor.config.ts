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
    GoogleAuth: {
      // Web Client ID from Google Cloud Console (OAuth 2.0 Client, type "Web application").
      // Required as serverClientId so the native plugin returns an idToken we can exchange with Supabase.
      // Android Client ID (468993545822-2b6s9lqes8gc1l3kln6samkv4cb06qje...) is registered in Google Cloud
      // with the app's package name + SHA-1 fingerprint and picked up automatically at runtime.
      scopes: ['profile', 'email'],
      serverClientId: '468993545822-veab3e63g8f6nsbhj929liu08ud4cqbp.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
