import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "cn.anyu.support",
  appName: "安屿",
  webDir: "dist",
  android: { allowMixedContent: false },
  server: { androidScheme: "https" },
  plugins: {
    LocalNotifications: { smallIcon: "ic_stat_leaf", iconColor: "#697e53" },
  },
};
export default config;
