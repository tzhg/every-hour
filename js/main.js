/* global $ */

"use strict";

import { transformHue } from "./transformHue.js";
import { pointerEvents } from "./pointerEvents.js";
import { shadeColour } from "./shadeColour.js";

$(() => {
	
const elem = (className) => {
	return document.getElementsByClassName(className)[0];
}

/* Data */
let dataFreq;

/* Constants in the CSS */
const chartInsideMargin = 10;
const mainContainerMaxWidth = 1000;
const mainContainerPadding = 20;
const yAxisWidth = 35;
const lightGrey = "#ffffff";
const mediumGrey = "#b3b3b3";
const darkGrey = "#404040";
	
const NS = "http://www.w3.org/2000/svg";
const svg = elem("chart-svg");

/* The starting viewBox dimensions. Coordinates of the svg canvas. */
const canvasShape = [2500, 1000];

let svgShape;
svgShape = (() => {
	let bBox = svg.getBoundingClientRect();
	
	return [bBox.x, bBox.y, bBox.width, bBox.height];
})();

const startDate = new Date(2017, 0, 1);
let noDays = 0;

/* Hover: when pointer is over chart and labels/ticks appear on the axes */
/* Drag: when user starts to pan */
/* Lock: when user clicks on legend item to isolate a category */
const chartState = {
	"hoverFlag": false,
	"dragFlag": false,
	"dragX": "",
	"lockFlag": false,
	"lockCat": ""
};

const xAxisScales = (() => {
	const scaleList = [
		{
			"start": (date) => date.getDate() === 1 && date.getMonth() === 0,
			"label": (date) => `${date.getFullYear()}`,
			"colour": (date) => yearPalette[date.getFullYear() - 2017],
			"blocks": [],
			"previous": ""
		},
		{
			"start": (date) => date.getDate() === 1 && date.getMonth() % 3 === 0,
			"label": (date) => `Q${Math.ceil(date.getMonth() / 3) + 1} ${date.getFullYear()}`,
			"colour": (date) => shadeColour(yearPalette[date.getFullYear() - 2017], shadeProp[Math.ceil(date.getMonth() / 3) % 2]),
			"blocks": [],
			"previous": ""
		},
		{
			"start": (date) => date.getDate() === 1,
			"label": (date) => `${monthNames[date.getMonth()]} ${date.getFullYear()}`,
			"colour": (date) => shadeColour(yearPalette[date.getFullYear() - 2017], shadeProp[date.getMonth() % 2]),
			"blocks": [],
			"previous": ""
		}
	];
	
	const n = scaleList.length;
	
	const yearPalette = [
		shadeColour(transformHue(215), -0.1),
		shadeColour(transformHue(60), -0.1),
		shadeColour(transformHue(120), -0.1),
		shadeColour(transformHue(15), -0.1),
		shadeColour(transformHue(275), -0.1)
	];
	
	const shadeProp = [0, -0.4];
	
	const closeLastBlock = (scale, end) => {
		const l = scaleList[scale].blocks.length;
		scaleList[scale].blocks[l - 1].range[1] = end;
	};
	
	const init = () => {
		for (
		let i = 0, date = new Date(startDate.getTime());
		i < noDays + 1;
		++i, date.setDate(date.getDate() + 1)) {
			
			let prevBoundary = false;
			/* If last day */
			if (i === noDays) {
				for (let scale = n - 1; scale >= 0; --scale) {
					if (!scaleList[scale].start(date)) {
						/* Closes unfinished blocks */
						for (let j = scale; j < n; ++j) {
							/* +1 is added because the end date is sometime in the future */
							closeLastBlock(n - j - 1, i + 1);
						}
					}
				}
			} else {
				scaleList.forEach((scaleObj, scale) => {
					/* If block boundary */
					if (!prevBoundary && scaleObj.start(date)) {
						/* If not first block */
						if (scaleObj.previous !== "") {
							/* Closes block and nested blocks */
							for (let j = scale; j < n; ++j) {
								closeLastBlock(j, i);
							}
						}
						/* Opens block and nested blocks */
						for (let j = scale; j < n; ++j) {
							scaleList[j].blocks.push({
								"label": scaleList[j].label(date),
								"colour": scaleList[j].colour(date),
								"range": [i, ""]
							});
							scaleList[j].previous = i;
						}
						prevBoundary = true;
					}
				});
			}
		}
		
		scaleList.forEach((scaleObj, scale) => {
			scaleObj.blocks.forEach((blockObj) => {
				const container = elem("x-axis-container");
				
				/* Block */
				const block = document.createElement("div");
				block.classList.add("x-axis-block");
				block.style.backgroundColor = blockObj.colour;
				block.dataset.label = blockObj.label;
				container.appendChild(block);
				
				/* Label */
				const label = document.createElement("div");
				label.innerText = blockObj.label;
				label.classList.add("x-axis-label");
				label.classList.add("x-axis-label-block");
				label.dataset.label = blockObj.label;
				block.appendChild(label);
				
				/* Whitespace in between */
				const blockSeparator = document.createElement("div");
				blockSeparator.classList.add("x-axis-block-separator");
				blockSeparator.dataset.label = blockObj.label;
				container.appendChild(blockSeparator);

				/* For axis interaction */
				if (scale === 0 || scale === 1) {
					block.dataset.startDay = blockObj.range[0];
					block.dataset.endDay = blockObj.range[1];
				}
			});
		});
	};
	
	const updateTimeBlock = () => {
		const scale = view.getScale();
		let firstBlock = true;
		scaleList[scale].blocks.forEach((blockObj) => {
			const idString = `[data-label='${blockObj.label}']`;
			
			const $block = $(`.x-axis-block${idString}`);
			const $label = $(`.x-axis-label${idString}`);
			const $blockSeparator = $(`.x-axis-block-separator${idString}`);
			
			let pos = blockObj.range.map(view.dayToX);
			
			/* Truncates blocks inside viewBox */
			if (pos[0] >= svgShape[2] || pos[1] <= 0) {
				return;
			}
			
			pos[0] = Math.max(pos[0], 0);
			pos[1] = Math.min(svgShape[2], pos[1]);
			
			$block.show();
			$block.css("left", `${pos[0]}px`);
			$block.css("width", `${pos[1] - pos[0]}px`);
			
			$label.show();
			const h1 = $label.width();
			$label.css("left", `${(pos[1] - pos[0] - h1) / 2}px`);
			
			const pad = 6;
			/* Checks if the label has enough space */
			if (h1 > $block.width() - pad) {
				$label.hide();
			}
			
			/* Puts separators in between the blocks */
			if (!firstBlock) {
				$blockSeparator.show();
				$blockSeparator.css("left", `${pos[0]}px`);		
			} else {
				firstBlock = false;
			} 
		});
	};
	
	const declutter = () => {
			for (let side = 0; side < 2; ++side) {
			const scale = view.getScale();
			scaleList[scale].blocks.forEach((blockObj) => {
				if (blockObj.range[side] === view.xToDay(side * svgShape[2])) {
					$(`.x-axis-label-endpoint.${side}`).hide();
				}
			});
		}
	};
	
	return {
		"init": init,
		"updateTimeBlock": updateTimeBlock,
		"declutter": declutter
	};
})();

/* Concerns the viewBox of the svg canvas (e.g. zooming and panning) */
const view = (() => {
	let viewBox = {
		"x": 0,
		"y": 0,
		"w": "",
		"h": ""
	};
	
	let zoomX, zoomWidth;

	/* At the minimum zoom, the width should be this proportion of total width */
	const minZoom = 0.04;
	
	/* At zoomWidth = zoomThreshold, changes scale of x-axis (xAxisScale) */
	const zoomThreshold = [0.5, 0.2];
	let scale;

	/* Smoothness at max zoom */
	const startSmooth = 7;
	
	const setView = (obj) => {
		for (const [key, value] of Object.entries(obj)) {
			viewBox[key] = value;
		}
		const arr = [viewBox.x, viewBox.y, viewBox.w, viewBox.h];
		
		svg.setAttribute("viewBox", `${arr.join(" ")}`);
		
		zoomX = viewBox.x / canvasShape[0];
		zoomWidth = viewBox.w / canvasShape[0];
		
		b = startSmooth * zoomWidth;
		scale = 0
		
		while (zoomWidth < zoomThreshold[scale]) {
			++scale;
		}
	};
	
	/* Converts x position (offset from svg-chart left edge) to day */
	const xToDay = (x) => {
		const pointerProp = x / svgShape[2];
		
		const day = noDays * (zoomX + zoomWidth * pointerProp);
		
		return Math.floor(day);
	};
	
	const dayToX = (day) => (day / noDays - zoomX) * svgShape[2] / zoomWidth;
	
	const getZoom = () => zoomWidth;
	
	/* Direction: 1 (zoom in) or 1 (zoom out) */
	/* Returns 0 if no zoom */
	const zoom = (x, direction, zoomSpeed) => {
		const dw = viewBox.w * direction * zoomSpeed;
		const dx = dw * x / svgShape[2];
		const newX = Math.max(viewBox.x + dx, 0);
		const newWidth = Math.min(viewBox.w - dw, canvasShape[0] - newX);
		
		if (newWidth === viewBox.w) {
			return 0;
		}
		
		const widthProp = newWidth / canvasShape[0];
		if (widthProp < minZoom) {
			return 0;
		}
		
		setView({ x:newX, w:newWidth });
	};
	
	/* Determines (t, x) such that zoom^t(x, 1, zoomSpeed) gives */
	/*     a viewBox with dayRange = [startDay, endDay] */
	/*    (takes some algebra to work out) */
	const zoomInverse = (startDay, endDay, zoomSpeed) => {
		const zoomStar = (endDay - startDay) / noDays;
		
		/* Desired viewBox width and x */
		let wStar, xStar;
	
		if (zoomStar < minZoom) {
			/* The desired viewbox width is too small */
			wStar = minZoom * canvasShape[0];
			xStar = (1 - minZoom) * canvasShape[0];
		} else {
			wStar = zoomStar * canvasShape[0];
			xStar = startDay / noDays * canvasShape[0];
		}
		
		const t = Math.log(wStar / viewBox.w) / Math.log(1 - zoomSpeed);
		const x = svgShape[2] * (xStar - viewBox.x) / (viewBox.w * (1 - (1 - zoomSpeed) ** t));
		
		return [t, x, xStar, wStar];
	};
	
	/* Returns 0 if no pan */
	const pan = (xDist) => {
		let newX = viewBox.x - viewBox.w * xDist / svgShape[2];
		
		/* Truncates to viewBox */
		newX = Math.max(newX, 0);
		newX = Math.min(newX, canvasShape[0] - viewBox.w);
		
		if (newX === viewBox.x) {
			return 0;
		}
		
		setView({ x:newX });
	};
	
	const getScale = () => scale;
	
	let b;
	
	const d = (x, y) => Math.exp(-((x - y) ** 2 / (2 * b ** 2)));
	
	/* Smooths data based on zoom level */
	const smooth = (data, x) => {
		const s = Math.round(3 * b);
		const slice_idx = [Math.max(x - s, 0), Math.min(x + s + 1, noDays)];
		const data_slice = data.slice(...slice_idx);
		
		const w = data_slice.map((_, i) => d(slice_idx[0] + i, x));
		
		const sumWeights = w.reduce((sum, x) => sum + x, 0);

		let res = categories.map((_, i) => {
			const catArr = data_slice.map(arr => arr[i]);
			
			return catArr.reduce((sum, x, i) => sum + x * w[i], 0) / sumWeights;
		});
		
		let n = res.reduce((sum, x) => sum + x, 0);
		res = res.map((val) => val / n);
		
		const e = 1 - res.reduce((sum, x) => sum + x, 0);
		
		res[noCats - 1] += e; 
		return res;
	};
	
	const init = () => {
		setView({ w:canvasShape[0], h:canvasShape[1] });
	};

	return {
		"init": init,
		"set": setView,
		"dayToX": dayToX,
		"xToDay": xToDay,
		"zoom": zoom,
		"zoomInverse": zoomInverse,
		"pan": pan,
		"getScale": getScale,
		"getZoom": getZoom,
		"smooth": smooth
	};
})();

const categories = [
	{
		"id": ["i", "v", "f"],
		"colour": transformHue(15),
		"name": "Leisure",
	},
	{
		"id": ["c", "j"],
		"colour":  transformHue(60),
		"name": "Professional",
	},
	{
		"id": ["n", "g", "a", "m"],
		"colour":  transformHue(120),
		"name": "Intellectual\xa0and\xa0creative",
	},
	{
		"id": ["p"],
		"colour":  transformHue(215),
		"name": "Health,\xa0duties,\xa0and\xa0productivity",
	},
	{
		"id": ["o"],
		"colour": transformHue(275),
		"name": "Social",
	},
	{
		"id": ["s"],
		"colour": "#b3b3b3",
		"name": "Sleep",
	},
	{
		"id": ["w", "k", "e", "l", "r"],
		"colour": "#505050",
		"name": "Other",
	}
];

const genLegend = () => {
	$(".legend-row-1").empty();
	$(".legend-row-2").empty();
	$(".legend-row-below-1").empty();
	$(".legend-row-below-2").empty();
	
	categories.forEach((obj, i) => {
		obj.location
		obj.width
		
		const button = document.createElement("div");
		const square = document.createElement("div");
		const label = document.createElement("span");

		button.className = "legend-button";
		button.dataset.cat = `${i}`;

		square.className = "legend-square";
		square.style.background = obj.colour;
		square.style.border = `solid ${obj.colour} 1px`;
		square.dataset.cat = `${i}`;
		button.appendChild(square);

		label.className = "legend-label";
		label.innerText = obj.name;
		button.appendChild(label);
		
		let location;
		if (window.innerWidth < 800) {
			location = i % 2 ? "legend-row-below-2": "legend-row-below-1";
		} else {
			location = i % 2 ? "legend-row-1": "legend-row-2";
		}
		elem(location).appendChild(button);
		
		const w = label.getBoundingClientRect().width;
		button.style.width = `${w + 30}px`;
	});
	
	
	legendEvents();
};

const noCats = categories.length;

/* Ignores the csv structure. Counts occurences of the category ids using regex. */
const analyseData = (_dataCSV) => {
	let data = _dataCSV;
	
	data = data.split("\n");

	data.pop();

	data = data.map((day) => {
		let freq = categories.map((cat) => {
			const reg = new RegExp(cat.id.join("|"), "g");
			return (day.match(reg) || []).length;
		});
		
		let n = freq.reduce((sum, x) => sum + x, 0);
		
		return freq.map((val) => val / n);
	});
	
	noDays = data.length;
	
	return data;
}

const drawChart = () => {
	$(svg).empty();
	svg.style.background = "";
	$(".grid-line").hide();
	
	/* Number of points to evaluate */
	let noPoints = 400;
	
	noPoints = Math.round(noPoints / view.getZoom());
	
	let dataFreqSmooth = [...Array(noPoints).keys()].map((x) => view.smooth(dataFreq, x * noDays / noPoints));
	
	/* Array of categories to plot */
	let cats;
	
	if (!chartState.lockFlag) {
		/* Turns array of data cumulative */
		/* We reverse the cumulation so that we can draw from the bottom of the canvas upwards */
		dataFreqSmooth = dataFreqSmooth.map((day) => day.map((_, i) => day.slice(i).reduce((a, b) => a + b, 0)));
		cats = [...Array(noCats).keys()];
	} else {
		$(".grid-line").show();
		cats = [chartState.lockCat];
	}
	
	/* The chart spills a little out of the viewBox to give sharp edges */
	const spill = 10;
	
	/* Draws categories (starts at bottom left corner of chart and draws clockwise) */
	cats.forEach((cat) => {
		let str = "";
		
		let path;
		
		const n = dataFreqSmooth.length;
		
		/* Sharp upper edge */
		if (!chartState.lockFlag && cat === 0) {
			path = `M ${-spill} ${canvasShape[1] + spill} V ${-spill} H ${canvasShape[0] + spill} V ${canvasShape[1] + spill} Z`;
		} else {
			dataFreqSmooth.forEach((arr, i) => {
				const xCoord = i * canvasShape[0] / n;
				const yCoord = (1 - arr[cat]) * canvasShape[1];
				str += ` L ${xCoord} ${yCoord}`;
			})
	
			const bottomLeft = `${-spill} ${canvasShape[1] + spill}`;
			const topLeft = `${-spill} ${(1 - dataFreqSmooth[0][cat]) * canvasShape[1]}`;
			const topRight = `${canvasShape[0] + spill} ${(1 - dataFreqSmooth[n - 1][cat]) * canvasShape[1]}`;
			const bottomRight = `${canvasShape[0] + spill} ${canvasShape[1] + spill}`;
			
			path = `M ${bottomLeft} ${topLeft}${str} ${topRight} L ${bottomRight} Z`;
		}
		
		const area = document.createElementNS(NS, "path");
		area.setAttribute("d", path);
		area.setAttribute("fill", categories[cat].colour);
		area.setAttribute("stroke", "white");
		area.setAttribute("stroke-width", "1.5");
		area.setAttribute("vector-effect", "non-scaling-stroke");
		area.setAttribute("stroke-linejoin", "round");
		area.setAttribute("pointer-events", "none");
		area.setAttribute("data-cat", String(cat));
		area.setAttribute("class", "area");
		svg.appendChild(area);
	});
}
const monthNames = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct", 
	"Nov",
	"Dec"
];

const initYAxis = () => {
	/* Draw a gridline every n hours */
	const n = 6;
	
	const getY = (val) => svgShape[3] * (1 - val / 24);
	
	for (let i = 0; i < n + 1; ++i) {
		let y = i / n * svgShape[3] + 0.2;
		
		if (i === n) {
			y -= 1;
		}
		
		const line = document.createElement("div");
		line.classList.add("grid-line");
		line.style.top = `${y}px`;
		line.style.width = `${svgShape[2] + chartInsideMargin}px`;
		elem("chart-main").appendChild(line);
		
		const tick = document.createElement("div");
		tick.classList.add("y-axis-tick");
		elem("y-axis-main").appendChild(tick);
		
		tick.style.top = `${y}px`;
		
		const label = document.createElement("div");
		label.innerHTML = `${(n - i) * (24 / n)}`;
		label.classList.add("y-axis-label");
		label.classList.add("y-axis-label-fixed");
		elem("y-axis-main").appendChild(label);
		
		const h = label.getBoundingClientRect().height;
		label.style.top = `${y - h / 2}px`;
	}
};

/* Hides overlapping labels/major ticks when hovering */
const declutterAxes = () => {
	const $hoverLabel = $(".x-axis-label-hover");
	const hoverLabelRange = [
		$hoverLabel.position().left,
		$hoverLabel.position().left + $hoverLabel.width()];

	/* Hide x-axis endpoints */
	for (let side = 0; side < 2; ++side) {
		const $label = $(`.x-axis-label-endpoint.${side}`);
		$label.show();
			
		const labelRange = [
			$label.position().left,
			$label.position().left + $label.width()];
		
		if (
			chartState.hoverFlag &&
			((side === 0 && labelRange[1] > hoverLabelRange[0]) ||
			(side === 1 && labelRange[0] < hoverLabelRange[1]))) {
			$label.hide();
		}
	}
		
	xAxisScales.declutter();
	
	const $indicator = $(".y-axis-indicator");
	const indicatorRange = [
		$indicator.position().top,
		$indicator.position().top + $indicator.height()];
	
	/* Minimum distance between centres of ticks/labels */
	const yPadRad = 10;
	
	/* Hides y-axis labels */
	const yAxisItems = Array.from(elem("y-axis-main").children);
	yAxisItems.forEach((item) => {
		const $item = $(item);
		$item.show();
		
		const y = $item.position().top + $item.height() / 2
		if (chartState.hoverFlag && y > indicatorRange[0] - yPadRad && y < indicatorRange[1] + yPadRad) {
			$item.hide();
		}
	});
}

const updateXAxisEndpoint = (side) => {
	let x = side * svgShape[2];
	let day = view.xToDay(x);
	if (x === svgShape[2]) {
		--x;
		--day;
	}
	
	let date = new Date(startDate.getTime());
	date.setDate(date.getDate() + day);
	
	const $tick = $(`.x-axis-tick.${side}`);
	$tick.show();
	$tick.css("left", `${x}px`);
	
	const $label = $(`.x-axis-label.${side}`);
	
	const month = monthNames[date.getMonth()];
	const year = date.getFullYear();

	$label.text(`${date.getDate()} ${month} ${year}`);
	$label.show();
	$label.css("left", `${x - $label.width() / 2}px`);
}

const drawXAxis = () => {
	$(".x-axis-block").hide();
	$(".x-axis-label").hide();
	$(".x-axis-block-separator").hide();
	$(".x-axis-tick").hide();
	$(".x-axis-label").hide();
	
	updateXAxisEndpoint(0);
	updateXAxisEndpoint(1);
	
	xAxisScales.updateTimeBlock();
	
	declutterAxes();
}

const initAxes = () => {
	initYAxis();
	
	xAxisScales.init();
	
	drawXAxis();
	
	axesEvents();
};

const hover = (x, y) => {
	$(".x-axis-tick-hover").show();
	$(".x-axis-label-hover").show();
	$(".y-axis-indicator").show();
	$(".y-axis-label-hover").show();
	
	x = Math.max(x, 0);
	
	let day = view.xToDay(x);
	if (x === svgShape[2]) {
		--x;
		--day;
	}
	
	let date = new Date(startDate.getTime());
	
	date.setDate(date.getDate() + day);
	
	elem("x-axis-tick-hover").style.left = `${x}px`;
	elem("x-axis-label-hover").innerHTML = `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
	const h1 = elem("x-axis-label-hover").getBoundingClientRect().width;
	elem("x-axis-label-hover").style.left = `${x - h1 / 2}px`;
	
	const arr = view.smooth(dataFreq, day);
	
	const _y = chartState.lockFlag ? svgShape[3] - y : y;

	/* Converts pointer y position to hours */
	/* Sometimes it is greater than 1 */
	const yHours = Math.min(_y / svgShape[3], 1);
	let sum;
	let i;
	
	if (chartState.lockFlag) {
		if (arr[chartState.lockCat] <= yHours) {
			unHover();
			return;
		}
		i = chartState.lockCat;
		sum = 0;
	} else {
		i = 0;
		sum = 0;
		while (i < 8 && sum + arr[i] < yHours) {
			sum += arr[i];
			++i;
		}
	}
	
	let range = [sum, sum + arr[i]];
	
	/* When a category is isolated, the chart is drawn "upside-down" */
	if (chartState.lockFlag) {
		range = range.map((val) => 1 - val);
		range.reverse();
	}
	
	/* Converts hours to pointer y position */
	const rangeY = range.map((val) => val * svgShape[3]);

	rangeY[1] -= 1;
	
	chartState.hoverFlag = true;
	
	elem("y-axis-indicator").style.top = `${rangeY[0]}px`;
	elem("y-axis-indicator").style.height = `${rangeY[1] - rangeY[0] + 1}px`;
	elem("y-axis-indicator").style.background = categories[i].colour;
	
	elem("y-axis-label-hover").innerHTML = `${((range[1] - range[0]) * 24).toFixed(1)}`;
	const h2 = elem("y-axis-label-hover").getBoundingClientRect().height;
	elem("y-axis-label-hover").style.top = `${(rangeY[0] + rangeY[1] - h2) / 2}px`;
	
	/* Dragging already redraws axes */
	if (!chartState.dragFlag) {
		declutterAxes();
	}
};

const unHover = () => {
	chartState.hoverFlag = false;
	
	$(".x-axis-tick-hover").hide();
	$(".x-axis-label-hover").hide();
	$(".y-axis-indicator").hide();
	$(".y-axis-label-hover").hide();
	
	$(".x-axis-label-endpoint").show();
	$(".y-axis-label-fixed").show();

	declutterAxes();
};

const chartEvents = () => {
	const pointer = pointerEvents();
	
	const moveInChartArea = (evt) => {
		hover(evt.offsetX, evt.offsetY);
	};
	
	const enterChart = (evt) => {
		if (evt !== undefined) {
			hover(evt.offsetX, evt. offsetY);
		}
	};
	
	const leaveChart = (evt) => {
		unHover();
	};
	
	const zoomEvent = (evt) => {
		evt.preventDefault();
		
		/* We don't use offsetX/Y because child element might be target */
		const x = evt.clientX - svgShape[0];
		const y = evt.clientY - svgShape[1];
		
		const zoomSpeed = 0.15;
		
		if (view.zoom(x, -Math.sign(evt.deltaY), zoomSpeed) !== 0) {
			drawChart();
			
			drawXAxis();
			
			if (chartState.hoverFlag) {
				hover(x, y);
			}
		}
	};
	
	/* Pan */
	const dragStart = (evt) => {
		chartState.dragX = evt.clientX;
		chartState.dragFlag = true;
	};
	
	const drag = (evt) => {
		if (!chartState.dragFlag) {
			return;
		}
		
		evt.preventDefault();
		
		if (view.pan(evt.clientX - chartState.dragX) !== 0) {
			chartState.dragX = evt.clientX;
			drawXAxis();
		}
	};
	
	const releaseDrag = (evt) => {
		chartState.dragX = "";
		chartState.dragFlag = false;
	};
	
	/* I would like to pass the mouse position here but it's not possible */
    enterChart();
		
	svg.addEventListener("pointermove", moveInChartArea);
	
	/* Adding dragging events */
	svg.addEventListener("pointerdown", dragStart);
	elem("chart-lower-row").addEventListener("pointerdown", dragStart);
	document.addEventListener("pointerup", releaseDrag);
	document.addEventListener("pointermove", drag);

	pointer.hover(".chart-svg", enterChart, leaveChart);
	
	svg.addEventListener("wheel", zoomEvent);
	elem("chart-lower-row").addEventListener("wheel", zoomEvent);
};

const legendEvents = () => {
	const pointer = pointerEvents();
	
	/* stage = 0: default/hover, stage = 1: active,  stage = 2: disappeared */
	const catDisappear = (i, stage) => {
		const background = [
			categories[i].colour,
			shadeColour(categories[i].colour, 0.5),
			lightGrey
		];

		$(`.legend-square[data-cat = ${i}]`).css({
			"background": background[stage]
		});
	}	
	
	/* stage = 0: default/hover, stage = 1: active,  stage = 2: disappeared */
	const catReappear = (i, stage) => {
		const background = [
			shadeColour(categories[i].colour, 0.9),
			shadeColour(categories[i].colour, 0.95),
			categories[i].colour
		];
		
		$(`.legend-square[data-cat = ${i}]`).css({
			"background": background[stage]
		});
	}
	
	/* stage = 0: default,  stage = 1: hover,  stage = 2: active, stage = 3: locked */
	const catLock = (cat, stage) => {
		const para = [
			["2px", "12px"],
			["3px", "14px"],
			["4px", "16px"],
			["3px", "14px"]
		];

		$(`.legend-square[data-cat = ${cat}]`).css({
			"top": para[stage][0],
			"left": para[stage][0],
			"height": para[stage][1],
			"width": para[stage][1]
		});
	}
	
	const lockState = (cat) => {
		if (chartState.lockFlag && chartState.lockCat === cat) {
			return "lockedSelf";
		}
		
		if (chartState.lockFlag && chartState.lockCat !== cat) {
			return "lockedOther";
		}
		
		return "unlocked";
	}
	
	const legendEnter = (evt) => {
		const cat = Number(evt.target.dataset.cat);
		
		if (lockState(cat) !== "lockedSelf") {
			catLock(cat, 1);
		}
		
		if (lockState(cat) === "lockedOther") {
			catReappear(cat, 0);
		}
	};
	
	const legendLeave = (evt) => {
		const cat = Number(evt.target.dataset.cat);
		
		if (lockState(cat) !== "unlocked") {
			for (let i = 0; i < noCats; ++i) {
				if (i === chartState.lockCat) {
					continue;
				}
				catDisappear(i, 2);
			}
		}
		
		if (lockState(cat) !== "lockedSelf") {
			catLock(cat, 0);
		}
	};
	
	const legendActive = (evt) => {
		const cat = Number(evt.target.dataset.cat);
		
		catLock(cat, 2);
		
		if (lockState(cat) === "lockedOther") {
			catReappear(cat, 1);
		}
		
		if (lockState(cat) === "unlocked") {
			for (let i = 0; i < noCats; ++i) {
				if (i === cat) {
					continue;
				}
				catDisappear(i, 1);
			}
		}
	};
	
	const legendDeactive = (evt) => {
		const cat = Number(evt.target.dataset.cat);
		
		if (lockState(cat) === "unlocked") {
			for (let i = 0; i < noCats; ++i) {
				catDisappear(i, 0);
			}
		}
		if (lockState(cat) === "lockedSelf") {
			catLock(cat, 3);
		}
	};
	
	const legendClick = (evt) => {
		const cat = Number(evt.target.dataset.cat);
		let newLockFlag = chartState.lockFlag;
		let newLockCat = chartState.lockCat;
		
		if (lockState(cat) !== "unlocked") {
			catLock(cat, 0);
				
			for (let i = 0; i < noCats; ++i) {
				catReappear(i, 2);
			}
			
			newLockFlag = false;
			newLockCat = "";
		}
			
		if (lockState(cat) !== "lockedSelf") {
			for (let i = 0; i < noCats; ++i) {
				catDisappear(i, 2);
				catLock(i, 0);
				
				if (i === cat) {
					catReappear(i, 2);
					catLock(i, 3);
				}
			}
			
			newLockFlag = true;
			newLockCat = cat;
		}
		
		chartState.lockFlag = newLockFlag;
		chartState.lockCat = newLockCat;
		drawChart();
	};
	
	pointer.hover(".legend-button", legendEnter, legendLeave);
	pointer.click(
		".legend-button",
		legendClick,
		legendActive,
		legendDeactive
	);
};

const axesEvents = () => {
	const pointer = pointerEvents();
	
	let oldColour;
	
	const XAxisBlockEnter = (evt) => {
		if (evt.target.dataset.startDay === undefined) {
			return;
		}
		
		oldColour = $(evt.target).css("background-color");
		
		/* rgb to hex from https://stackoverflow.com/a/33511903/6536036 */
		oldColour = '#'+oldColour.match(/\d+/g).map(x=>(+x).toString(16).padStart(2,0)).join``

		$(evt.target).css({
			"background-color": shadeColour(oldColour, 0.2)
		});
	};
	
	const XAxisBlockLeave = (evt) => {
		if (evt.target.dataset.startDay === undefined) {
			return;
		}
		
		$(evt.target).css({
			"background-color": oldColour
		});
	};
	
	/* Zooms so that interval [startDay, endDay) is the range of the viewBox */
	const zoomGoal = (startDay, endDay) => {
		const zoomSpeed = 0.25;
		
		const arr = view.zoomInverse(startDay, endDay, zoomSpeed);
				
		/* Animation */
		let i = 0;
		const frame = () => {
			if (i < Math.floor(arr[0])) {
				view.zoom(arr[1], 1, zoomSpeed);

				drawChart();
				
				drawXAxis();
				++i;		
			} else {
				clearInterval(id);
				view.set({ x:arr[2], w:arr[3] });
				
				drawChart();
				
				drawXAxis();
			}
		}
		
		const id = setInterval(frame, 5);
	}
	
	const XAxisBlockClick = (evt) => {
		if (evt.target.dataset.startDay === undefined) {
			return;
		}
		zoomGoal(Number(evt.target.dataset.startDay), Number(evt.target.dataset.endDay));
	};	
	
	const XAxisBlockActive = (evt) => {
		if (evt.target.dataset.startDay === undefined) {
			return;
		}
		
		$(evt.target).css({
			"background-color": shadeColour(oldColour, 0.1)
		});
	};
	
	const XAxisBlockDeactive = (evt) => {
		if (evt.target.dataset.startDay === undefined) {
			return;
		}
		const $block = $(`.x-axis-block[data-label='${evt.target.dataset.label}']`);
		
		$block.css({
			"background-color": oldColour
		});
	};
	
	pointer.hover(".x-axis-block", XAxisBlockEnter, XAxisBlockLeave);
	pointer.click(
		".x-axis-block",
		XAxisBlockClick,
		XAxisBlockActive,
		XAxisBlockDeactive
	);
}

const updateSvgShape = () => {
	const w = elem("main-container").getBoundingClientRect().width;
	
	const w1 = Math.min(window.innerWidth, mainContainerMaxWidth) - 2 * mainContainerPadding - yAxisWidth - chartInsideMargin;
	
	svg.setAttribute("height", `${svg.clientHeight}px`);
	svg.setAttribute("width", `${w1}px`);
	
	svgShape = (() => {
		let bBox = svg.getBoundingClientRect();
		
		return [bBox.x, bBox.y, bBox.width, bBox.height];
	})();
	
	$(".grid-line").css("width", `${svgShape[2] + chartInsideMargin}px`);
	genLegend();
};

const init = (dataCSV) => {
	dataFreq = analyseData(dataCSV);
	
	updateSvgShape();

	view.init();
	
	initAxes();
	
	drawChart();
	
	chartEvents();
	
	window.addEventListener("resize", () => {
		updateSvgShape();
		drawXAxis();
	});
	
	/* Unhides things which were hidden during loading */
	$(".main-container").css("visibility", "visible");
};

$.ajax({
	type: "GET",
	url: "./data-csv.txt",
	dataType: "text",
	success: init,
	error: () => {
		console.log("Using mangled data.")
		$.ajax({
			type: "GET",
			url: "./data-csv-mangled.txt",
			dataType: "text",
			success: init
		});
	}
});
});
