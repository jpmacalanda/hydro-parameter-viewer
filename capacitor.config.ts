
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.9d096dec19bd43a980ce09ae73807cd9',
  appName: 'hydro-parameter-viewer',
  webDir: 'dist',
  server: {
    url: 'https://9d096dec-19bd-43a9-80ce-09ae73807cd9.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  // Add Android-specific configuration
  android: {
    buildOptions: {
      keystorePath: 'android.keystore',
      keystoreAlias: 'key0',
    }
  }
};

export default config;
