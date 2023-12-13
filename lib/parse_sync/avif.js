import { str2arr } from "../common.js";
import { sliceEq } from "../common.js";
import { readUInt32BE } from "../common.js";
import { unbox, getMimeType, readSizeFromMeta } from "../miaf_utils.js";
import { get_orientation } from "../exif_utils.js";

const SIG_FTYP = str2arr("ftyp");

export default function (data) {
	// ISO media file (avif format) starts with ftyp box:
	// 0000 0020 6674 7970 6176 6966
	//  (length)  f t  y p  a v  i f
	//
	if (!sliceEq(data, 4, SIG_FTYP)) return;

	var firstBox = unbox(data, 0);
	if (!firstBox) return;

	var fileType = getMimeType(firstBox.data);
	if (!fileType) return;

	var meta,
		offset = firstBox.end;

	for (;;) {
		var box = unbox(data, offset);
		if (!box) break;
		offset = box.end;

		// mdat block SHOULD be last (but not strictly required),
		// so it's unlikely that metadata is after it
		if (box.boxtype === "mdat") return;
		if (box.boxtype === "meta") {
			meta = box.data;
			break;
		}
	}

	if (!meta) return;

	var imgSize = readSizeFromMeta(meta);

	if (!imgSize) return;

	var result = {
		width: imgSize.width,
		height: imgSize.height,
		type: fileType.type,
		mime: fileType.mime,
		wUnits: "px",
		hUnits: "px",
	};

	if (imgSize.variants.length > 1) {
		result.variants = imgSize.variants;
	}

	if (imgSize.orientation) {
		result.orientation = imgSize.orientation;
	}

	if (imgSize.exif_location && imgSize.exif_location.offset + imgSize.exif_location.length <= data.length) {
		var sig_offset = readUInt32BE(data, imgSize.exif_location.offset);
		var exif_data = data.slice(
			imgSize.exif_location.offset + sig_offset + 4,
			imgSize.exif_location.offset + imgSize.exif_location.length
		);

		var orientation = get_orientation(exif_data);

		if (orientation > 0) result.orientation = orientation;
	}

	return result;
}
