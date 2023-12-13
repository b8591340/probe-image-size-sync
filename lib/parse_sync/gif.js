import { str2arr as str2arrCommon } from "../common.js";
import { sliceEq as sliceEqCommon } from "../common.js";
import { readUInt16LE as readUInt16LECommon } from "../common.js";

const SIG_GIF87a = str2arrCommon("GIF87a");
const SIG_GIF89a = str2arrCommon("GIF89a");

export default function (data) {
	if (data.length < 10) return;

	if (!sliceEqCommon(data, 0, SIG_GIF87a) && !sliceEqCommon(data, 0, SIG_GIF89a)) return;

	return {
		width: readUInt16LECommon(data, 6),
		height: readUInt16LECommon(data, 8),
		type: "gif",
		mime: "image/gif",
		wUnits: "px",
		hUnits: "px",
	};
}
