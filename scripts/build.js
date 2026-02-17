import esbuild from "esbuild";
import fs from "fs-extra";
import path from "path";
import { TsconfigPathsPlugin as tsconfigPaths } from "@esbuild-plugins/tsconfig-paths";

const isWatch = process.argv.includes("--watch");

async function build() {
	// Pre-build cleanup
	if (fs.existsSync("dist")) {
		fs.emptyDirSync("dist");
	}

	const context = await esbuild.context({
		entryPoints: [
			{ in: "src/presentation/background/index.ts", out: "background" },
			{ in: "src/presentation/popup/index.ts", out: "popup" },
			{ in: "src/presentation/offscreen/index.ts", out: "offscreen" },
		],
		bundle: true,
		minify: true,
		sourcemap: true,
		platform: "browser",
		outdir: "dist",
		logLevel: "info",
		plugins: [tsconfigPaths({})],
	});

	if (isWatch) {
		await context.watch();
	} else {
		await context.rebuild();
		await context.dispose();
	}

	// Copy assets
	const assets = ["manifest.json", "popup.html", "offscreen.html", "icons"];

	for (const asset of assets) {
		const src = path.resolve(asset);
		const dest = path.resolve("dist", asset);
		if (fs.existsSync(src)) {
			fs.copySync(src, dest);
		}
	}
}

build().catch((err) => {
	console.error(err);
	process.exit(1);
});
