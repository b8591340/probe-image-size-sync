import { str2arr, sliceEq, readUInt16LE, readUInt32LE } from "../common.js";
import { get_orientation as exif_get_orientation } from "../exif_utils.js";

const SIG_RIFF = str2arr("RIFF");
const SIG_WEBP = str2arr("WEBP");

function parseVP8(data, offset) {
	if (data[offset + 3] !== 0x9d || data[offset + 4] !== 0x01 || data[offset + 5] !== 0x2a) {
		return;
	}

	return {
		width: readUInt16LE(data, offset + 6) & 0x3fff,
		height: readUInt16LE(data, offset + 8) & 0x3fff,
		type: "webp",
		mime: "image/webp",
		wUnits: "px",
		hUnits: "px",
	};
}

function parseVP8L(data, offset) {
	if (data[offset] !== 0x2f) return;

	const bits = readUInt32LE(data, offset + 1);

	return {
		width: (bits & 0x3fff) + 1,
		height: ((bits >> 14) & 0x3fff) + 1,
		type: "webp",
		mime: "image/webp",
		wUnits: "px",
		hUnits: "px",
	};
}

function parseVP8X(data, offset) {
	return {
		width: ((data[offset + 6] << 16) | (data[offset + 5] << 8) | data[offset + 4]) + 1,
		height: ((data[offset + 9] << offset) | (data[offset + 8] << 8) | data[offset + 7]) + 1,
		type: "webp",
		mime: "image/webp",
		wUnits: "px",
		hUnits: "px",
	};
}

export default function (data) {
	if (data.length < 16) return;

	if (!sliceEq(data, 0, SIG_RIFF) && !sliceEq(data, 8, SIG_WEBP)) return;

	let offset = 12;
	let result = null;
	let exif_orientation = 0;
	const fileLength = readUInt32LE(data, 4) + 8;

	if (fileLength > data.length) return;

	while (offset + 8 < fileLength) {
		if (data[offset] === 0) {
			offset++;
			continue;
		}

		const header = String.fromCharCode.apply(null, data.slice(offset, offset + 4));
		const length = readUInt32LE(data, offset + 4);

		if (header === "VP8 ") {
			if (length < 10) continue;
			result = result || parseVP8(data, offset + 8);
		} else if (header === "VP8L") {
			if (length < 9) continue;
			result = result || parseVP8L(data, offset + 8);
		} else if (header === "VP8X") {
			if (length < 10) continue;
			result = result || parseVP8X(data, offset + 8);
		} else if (header === "EXIF") {
			exif_orientation = exif_get_orientation(data.slice(offset + 8, offset + 8 + length));
			offset = Infinity;
		}

		offset += 8 + length;
	}

	if (!result) return;

	if (exif_orientation > 0) {
		result.orientation = exif_orientation;
	}

	return result;
}
