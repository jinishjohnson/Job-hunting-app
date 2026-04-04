import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.uaejobfinder.app',
  appName: 'UAE Job Finder',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
