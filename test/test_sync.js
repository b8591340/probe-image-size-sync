import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

import { probeAll } from "../index.js";
const probe = { sync: probeAll };

import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("probeBuffer", () => {
	it("should skip unrecognized files", () => {
		let file = path.join(__dirname, "fixtures", "text_file.txt");
		let size = probe.sync(fs.readFileSync(file));

		assert.strictEqual(size, null);
	});

	it("should skip empty files", () => {
		let file = path.join(__dirname, "fixtures", "empty.txt");
		let size = probe.sync(fs.readFileSync(file));

		assert.strictEqual(size, null);
	});
});
