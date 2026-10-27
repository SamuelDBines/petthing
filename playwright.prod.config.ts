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
    },
  },
  use: {
    ...base.use,
    baseURL: "http://localhost:3001",
  },
};
