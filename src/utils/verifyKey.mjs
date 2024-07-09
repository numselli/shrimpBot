function concatUint8Arrays(arr1, arr2) {
	const merged = new Uint8Array(arr1.length + arr2.length);
	merged.set(arr1);
	merged.set(arr2, arr1.length);
	return merged;
}

function valueToUint8Array(value, format) {
	if (value == null) {
		return new Uint8Array();
	}
	if (typeof value === 'string') {
		if (format === 'hex') {
			const matches = value.match(/.{1,2}/g);
			if (matches == null) {
				throw new Error('Value is not a valid hex string');
			}
			const hexVal = matches.map((byte) => Number.parseInt(byte, 16));
			return new Uint8Array(hexVal);
		}

		return new TextEncoder().encode(value);
	}
	try {
		if (Buffer.isBuffer(value)) {
			return new Uint8Array(value);
		}
	} catch (ex) {
		// Runtime doesn't have Buffer
	}
	if (value instanceof ArrayBuffer) {
		return new Uint8Array(value);
	}
	if (value instanceof Uint8Array) {
		return value;
	}
	throw new Error(
		'Unrecognized value type, must be one of: string, Buffer, ArrayBuffer, Uint8Array',
	);
}

export default async function verifyKey(rawBody, signature, timestamp, clientPublicKey){
	try {
		const timestampData = valueToUint8Array(timestamp);
		const bodyData = valueToUint8Array(rawBody);
		const message = concatUint8Arrays(timestampData, bodyData);
		const publicKey =
			typeof clientPublicKey === 'string'
				? await crypto.subtle.importKey(
						'raw',
						valueToUint8Array(clientPublicKey, 'hex'),
						{
							name: 'ed25519',
							namedCurve: 'ed25519',
						},
						false,
						['verify'],
					)
				: clientPublicKey;

		const isValid = await crypto.subtle.verify(
			{
				name: 'ed25519',
			},
			publicKey,
			valueToUint8Array(signature, 'hex'),
			message
		);

		return isValid;
	} catch (ex) {
		return false;
	}
}