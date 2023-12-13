import { str2arr as _str2arr } from "../common.js";
import { sliceEq as _sliceEq } from "../common.js";
import { readUInt16LE as _readUInt16LE } from "../common.js";

const SIG_BM = _str2arr("BM");

export default function (data) {
	if (data.length < 26) return;

	if (!_sliceEq(data, 0, SIG_BM)) return;

	return {
		width: _readUInt16LE(data, 18),
		height: _readUInt16LE(data, 22),
		type: "bmp",
		mime: "image/bmp",
		wUnits: "px",
		hUnits: "px",
	};
}
