import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig(({ mode }) => {
	if (mode === "library") {
		return {
			plugins: [
				react(),
				dts({
					entryRoot: "src",
					include: [
						"src/index.ts",
						"src/template/**/*.ts",
						"src/template/**/*.tsx",
					],
					outDir: "dist/lib",
				}),
			],
			build: {
				emptyOutDir: false,
				lib: {
					entry: "src/index.ts",
					cssFileName: "styles",
					formats: ["es", "cjs"],
					fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
				},
				outDir: "dist/lib",
				rollupOptions: {
					external: [
						"lucide-react",
						"qrcode",
						"react",
						"react-dom",
						"react/jsx-runtime",
					],
				},
			},
		};
	}

	return {
		plugins: [react()],
		build: {
			outDir: "dist/demo",
		},
	};
});
