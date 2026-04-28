import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "sk.dokanbratislava.treneri",
  appName: "DOKAN Trénerská zóna",
  webDir: "public",
  backgroundColor: "#f5f0e6",
  server: {
    url: "https://app.dokanbratislava.online",
    cleartext: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#f5f0e6",
      showSpinner: false
    }
  }
};

export default config;