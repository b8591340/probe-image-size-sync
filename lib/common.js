const sliceEq = (src, start, dest) => {
	for (let i = start, j = 0; j < dest.length; ) {
		if (src[i++] !== dest[j++]) return false;
	}
	return true;
};

const str2arr = (str, format = "") => {
	const arr = [];
	let i = 0;

	if (format === "hex") {
		while (i < str.length) {
			arr.push(parseInt(str.slice(i, i + 2), 16));
			i += 2;
		}
	} else {
		for (; i < str.length; i++) {
			arr.push(str.charCodeAt(i) & 0xff);
		}
	}

	return arr;
};

const readUInt16LE = function (data, offset) {
	return data[offset] | (data[offset + 1] << 8);
};

const readUInt16BE = function (data, offset) {
	return data[offset + 1] | (data[offset] << 8);
};

const readUInt32LE = function (data, offset) {
	return data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] * 0x1000000);
};

const readUInt32BE = function (data, offset) {
	return data[offset + 3] | (data[offset + 2] << 8) | (data[offset + 1] << 16) | (data[offset] * 0x1000000);
};

class ProbeError extends Error {
	constructor(message, code, statusCode) {
		super();

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		} else {
			this.stack = new Error().stack || "";
		}

		this.name = this.constructor.name;

		this.message = message;
		this.code = code;
		this.statusCode = statusCode;
	}
}

export { sliceEq, str2arr, readUInt16LE, readUInt16BE, readUInt32LE, readUInt32BE, ProbeError };
