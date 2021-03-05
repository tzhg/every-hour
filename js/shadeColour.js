export function shadeColour(colour, percent) {
	if (percent > 1) {
		return "#FFFFFF";
	} else if (percent < -1) {
		return "#000000";
	}
	let f = parseInt(colour.slice(1), 16);
	let t = percent < 0 ? 0 : 255;
	let p = percent < 0 ? percent * -1 : percent;
	let R = f >> 16;
	let G = f >> 8 & 0x00FF;
	let B = f & 0x0000FF;

	R += Math.round((t - R) * p);
	G += Math.round((t - G) * p);
	B += Math.round((t - B) * p);

	return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}