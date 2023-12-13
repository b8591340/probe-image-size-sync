import { readUInt16BE, readUInt32BE } from "./common.js";

const unbox = (data, offset) => {
	if (data.length < 4 + offset) return null;

	const size = readUInt32BE(data, offset);

	if (data.length < size + offset || size < 8) return null;

	return {
		boxtype: String.fromCharCode.apply(null, data.slice(offset + 4, offset + 8)),
		data: data.slice(offset + 8, offset + size),
		end: offset + size,
	};
};

const scan_ipco = (data, sandbox) => {
	let offset = 0;

	for (;;) {
		const box = unbox(data, offset);
		if (!box) break;

		switch (box.boxtype) {
			case "ispe":
				sandbox.sizes.push({
					width: readUInt32BE(box.data, 4),
					height: readUInt32BE(box.data, 8),
				});
				break;

			case "irot":
				sandbox.transforms.push({
					type: "irot",
					value: box.data[0] & 3,
				});
				break;

			case "imir":
				sandbox.transforms.push({
					type: "imir",
					value: box.data[0] & 1,
				});
				break;
		}

		offset = box.end;
	}
};

const readUIntBE = (data, offset, size) => {
	let result = 0;

	for (let i = 0; i < size; i++) {
		result = result * 256 + (data[offset + i] || 0);
	}

	return result;
};

const scan_iloc = (data, sandbox) => {
	const offset_size = (data[4] >> 4) & 0xf;
	const length_size = data[4] & 0xf;
	const base_offset_size = (data[5] >> 4) & 0xf;
	const item_count = readUInt16BE(data, 6);
	let offset = 8;

	for (let i = 0; i < item_count; i++) {
		const item_ID = readUInt16BE(data, offset);
		offset += 2;

		const data_reference_index = readUInt16BE(data, offset);
		offset += 2;

		const base_offset = readUIntBE(data, offset, base_offset_size);
		offset += base_offset_size;

		const extent_count = readUInt16BE(data, offset);
		offset += 2;

		if (data_reference_index === 0 && extent_count === 1) {
			const first_extent_offset = readUIntBE(data, offset, offset_size);
			const first_extent_length = readUIntBE(data, offset + offset_size, length_size);
			sandbox.item_loc[item_ID] = { length: first_extent_length, offset: first_extent_offset + base_offset };
		}

		offset += extent_count * (offset_size + length_size);
	}
};

const scan_iinf = (data, sandbox) => {
	const item_count = readUInt16BE(data, 4);
	let offset = 6;

	for (let i = 0; i < item_count; i++) {
		const box = unbox(data, offset);
		if (!box) break;
		if (box.boxtype === "infe") {
			const item_id = readUInt16BE(box.data, 4);
			let item_name = "";

			for (let pos = 8; pos < box.data.length && box.data[pos]; pos++) {
				item_name += String.fromCharCode(box.data[pos]);
			}

			sandbox.item_inf[item_name] = item_id;
		}
		offset = box.end;
	}
};

const scan_iprp = (data, sandbox) => {
	let offset = 0;

	for (;;) {
		const box = unbox(data, offset);
		if (!box) break;
		if (box.boxtype === "ipco") scan_ipco(box.data, sandbox);
		offset = box.end;
	}
};

const scan_meta = (data, sandbox) => {
	let offset = 4; // version + flags

	for (;;) {
		const box = unbox(data, offset);
		if (!box) break;
		if (box.boxtype === "iprp") scan_iprp(box.data, sandbox);
		if (box.boxtype === "iloc") scan_iloc(box.data, sandbox);
		if (box.boxtype === "iinf") scan_iinf(box.data, sandbox);
		offset = box.end;
	}
};

const getMaxSize = (sizes) => {
	const maxWidthSize = sizes.reduce((a, b) => (a.width > b.width || (a.width === b.width && a.height > b.height) ? a : b));
	const maxHeightSize = sizes.reduce((a, b) => (a.height > b.height || (a.height === b.height && a.width > b.width) ? a : b));

	const maxSize =
		maxWidthSize.width > maxHeightSize.height ||
		(maxWidthSize.width === maxHeightSize.height && maxWidthSize.height > maxHeightSize.width)
			? maxWidthSize
			: maxHeightSize;

	return maxSize;
};

const readSizeFromMeta = (data) => {
	const sandbox = {
		sizes: [],
		transforms: [],
		item_inf: {},
		item_loc: {},
	};

	scan_meta(data, sandbox);

	if (!sandbox.sizes.length) return;

	const maxSize = getMaxSize(sandbox.sizes);

	let orientation = 1;

	// convert imir/irot to exif orientation
	sandbox.transforms.forEach((transform) => {
		const rotate_ccw = { 1: 6, 2: 5, 3: 8, 4: 7, 5: 4, 6: 3, 7: 2, 8: 1 };
		const mirror_vert = { 1: 4, 2: 3, 3: 2, 4: 1, 5: 6, 6: 5, 7: 8, 8: 7 };

		if (transform.type === "imir") {
			if (transform.value === 0) {
				// vertical flip
				orientation = mirror_vert[orientation];
			} else {
				// horizontal flip = vertical flip + 180 deg rotation
				orientation = mirror_vert[orientation];
				orientation = rotate_ccw[orientation];
				orientation = rotate_ccw[orientation];
			}
		}

		if (transform.type === "irot") {
			// counter-clockwise rotation 90 deg 0-3 times
			for (let i = 0; i < transform.value; i++) {
				orientation = rotate_ccw[orientation];
			}
		}
	});

	let exif_location = null;

	if (sandbox.item_inf.Exif) {
		exif_location = sandbox.item_loc[sandbox.item_inf.Exif];
	}

	return {
		width: maxSize.width,
		height: maxSize.height,
		orientation: sandbox.transforms.length ? orientation : null,
		variants: sandbox.sizes,
		exif_location: exif_location,
	};
};

const getMimeType = (data) => {
	const brand = String.fromCharCode.apply(null, data.slice(0, 4));
	const compat = {};

	compat[brand] = true;

	for (let i = 8; i < data.length; i += 4) {
		compat[String.fromCharCode.apply(null, data.slice(i, i + 4))] = true;
	}

	// heic and avif are superset of miaf, so they should all list mif1 as compatible
	if (!compat.mif1 && !compat.msf1 && !compat.miaf) return;

	if (brand === "avif" || brand === "avis" || brand === "avio") {
		// `.avifs` and `image/avif-sequence` are removed from spec, all files have single type
		return { type: "avif", mime: "image/avif" };
	}

	// https://nokiatech.github.io/heif/technical.html
	if (brand === "heic" || brand === "heix") {
		return { type: "heic", mime: "image/heic" };
	}

	if (brand === "hevc" || brand === "hevx") {
		return { type: "heic", mime: "image/heic-sequence" };
	}

	if (compat.avif || compat.avis) {
		return { type: "avif", mime: "image/avif" };
	}

	if (compat.heic || compat.heix || compat.hevc || compat.hevx || compat.heis) {
		if (compat.msf1) {
			return { type: "heif", mime: "image/heif-sequence" };
		}
		return { type: "heif", mime: "image/heif" };
	}

	return { type: "avif", mime: "image/avif" };
};

export { unbox, getMimeType, readSizeFromMeta };
