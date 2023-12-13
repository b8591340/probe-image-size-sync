import { str2arr } from "../common.js";
import { sliceEq } from "../common.js";
import { readUInt32BE } from "../common.js";

const SIG_PNG = str2arr("\x89PNG\r\n\x1a\n");
const SIG_IHDR = str2arr("IHDR");

export default function (data) {
	if (data.length < 24) return;
	if (!sliceEq(data, 0, SIG_PNG)) return;
	if (!sliceEq(data, 12, SIG_IHDR)) return;
	return {
		width: readUInt32BE(data, 16),
		height: readUInt32BE(data, 20),
		type: "png",
		mime: "image/png",
		wUnits: "px",
		hUnits: "px",
	};
}
