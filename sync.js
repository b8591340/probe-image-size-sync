import parsers from "./lib/parsers_sync.js";

export async function probe(buffer) {
	try {
		return await Promise.any(
			Object.values(parsers).map(
				(func) =>
					new Promise((resolve, reject) => {
						const result = func(buffer);
						if (result) {
							resolve(result);
						} else {
							reject();
						}
					})
			)
		);
	} catch {
		return null;
	}
}

export function probeMime(buffer, mimeType) {
	const func = parsers[mimeType.split("/")[1]];
	return func?.(buffer) || null;
}

export function probeType(buffer, type) {
	const func = parsers[type];
	return func?.(buffer) || null;
}

export function probeAll(buffer) {
	for (const func of Object.values(parsers)) {
		const result = func(buffer);
		if (result) return result;
	}
	return null;
}
