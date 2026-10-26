import type { Config } from "@react-router/dev/config";
export default {
  ssr: false,
  prerender: ["/"],
  appDirectory: "app",
} satisfies Config;
