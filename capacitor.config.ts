import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "sk.dokanbratislava.treneri",
  appName: "DOKAN Trénerská zóna",
  webDir: "public",
  server: {
    url: "https://app.dokanbratislava.online",
    cleartext: false
  }
};

export default config;
