import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
	test: {
		globals: true,
		environment: "jsdom",
	},
	resolve: {
		alias: {
			"@domain": path.resolve(__dirname, "./src/domain"),
			"@infrastructure": path.resolve(__dirname, "./src/infrastructure"),
			"@application": path.resolve(__dirname, "./src/application"),
			"@presentation": path.resolve(__dirname, "./src/presentation"),
		},
	},
});
