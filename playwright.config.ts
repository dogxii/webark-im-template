import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	timeout: 30_000,
	expect: {
		timeout: 5_000,
	},
	webServer: {
		command: "bunx vite --host 127.0.0.1 --port 5173 --strictPort",
		url: "http://127.0.0.1:5173",
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
	use: {
		baseURL: "http://127.0.0.1:5173",
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
