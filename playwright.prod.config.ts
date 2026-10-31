import base from "./playwright.config";

export default {
  ...base,
  webServer: {
    command: "npm run build && npm run start -- -p 3001",
    url: "http://localhost:3001/api/health",
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      ...(base.webServer as { env?: Record<string, string> }).env,
      NODE_ENV: "production",
      PORT: "3001",
      NEXT_PUBLIC_APP_URL: "http://localhost:3001",
      ALLOW_DEMO_CHECKOUT: "true",
      STRIPE_SECRET_KEY: "",
      STRIPE_WEBHOOK_SECRET: "",
    },
  },
  use: {
    ...base.use,
    baseURL: "http://localhost:3001",
  },
};
