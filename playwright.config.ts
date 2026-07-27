import { defineConfig, devices } from "@playwright/test";

const e2ePort = Number(process.env.PLAYWRIGHT_PORT ?? 42173);
const e2eHost = "127.0.0.1";
const e2eBaseUrl = `http://${e2eHost}:${e2ePort}`;
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === "1";

export default defineConfig({
	testDir: "./e2e",
	timeout: 30_000,
	expect: {
		timeout: 5_000,
	},
	webServer: {
		command: `bunx vite --host ${e2eHost} --port ${e2ePort} --strictPort`,
		url: e2eBaseUrl,
		reuseExistingServer,
		timeout: 120_000,
	},
	use: {
		baseURL: e2eBaseUrl,
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium-desktop",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "chromium-mobile",
			use: { ...devices["Pixel 7"] },
		},
	],
});
