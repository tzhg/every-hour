/* Converts a hue (number from 0 to 360) to a colour. */
export function transformHue(h) {
	const s = 1;
	const l = 0.6;

	/* These values are based on the theme colour */
	const mixColour = [0.11, 0.36, 0.54];
	const mixRatio = 0.5;

	h /= 360;

	let r, g, b;

	const hue2rgb = (p, q, t) => {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;

		return p;
	};

	const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	const p = 2 * l - q;

	r = Math.sqrt((1 - mixRatio) * (hue2rgb(p, q, h + 1 / 3) ** 2) + mixRatio * (mixColour[0] ** 2));
	g = Math.sqrt((1 - mixRatio) * (hue2rgb(p, q, h) ** 2) + mixRatio * (mixColour[1] ** 2));
	b = Math.sqrt((1 - mixRatio) * (hue2rgb(p, q, h - 1 / 3) ** 2) + mixRatio * (mixColour[2] ** 2));

	const toHex = x => {
		const hex = Math.round(x * 255).toString(16);
		return hex.length === 1 ? "0" + hex : hex;
	};

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}