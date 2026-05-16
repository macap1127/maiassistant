import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.900ab33e726449beaa2455300941d738',
  appName: 'Mia Assistant',
  webDir: 'dist',
  server: {
    url: 'https://900ab33e-7264-49be-aa24-55300941d738.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
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
