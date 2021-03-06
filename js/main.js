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
let data;

/* Constants in the CSS */
const chartInsideMargin = 10;
const mainContainerMaxWidth = 760;
const mainContainerPadding = 20;
const yAxisWidth = 35;
const lightGrey = "#ffffff";
const mediumGrey = "#b3b3b3";
const darkGrey = "#404040";

const NS = "http://www.w3.org/2000/svg";
const svg = elem("chart-svg");

/* The starting viewBox dimensions. Coordinates of the svg canvas. */
const canvasShape = [2000, 1000];

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
			"blocks": [],
			"previous": ""
		},
		{
			"start": (date) => date.getDate() === 1 && date.getMonth() % 3 === 0,
			"label": (date) => `Q${Math.ceil(date.getMonth() / 3) + 1} ${date.getFullYear()}`,
			"blocks": [],
			"previous": ""
		}
	];

	const n = scaleList.length;

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
								"range": [i, ""]
							});
							scaleList[j].previous = i;
						}
						prevBoundary = true;
					}
				});
			}
		}

		let firstBlock = true;
		scaleList.forEach((scaleObj, scale) => {
			scaleObj.blocks.forEach((blockObj) => {
				const container = elem("x-axis-container");

				/* Block */
				const block = document.createElement("div");
				block.classList.add("x-axis-block");
				block.dataset.label = blockObj.label;
				container.appendChild(block);

				/* Label */
				const label = document.createElement("div");
				label.innerText = blockObj.label;
				label.classList.add("x-axis-label");
				label.classList.add("movable");
				label.dataset.label = blockObj.label;
				block.appendChild(label);

				/* Whitespace in between */
				const blockSeparator = document.createElement("div");
				blockSeparator.classList.add("x-axis-tick");
				blockSeparator.classList.add("movable");
				blockSeparator.dataset.label = blockObj.label;
				container.appendChild(blockSeparator);

				if (scale === 0) {
				    const container2 = elem("timeline-row");
					/* Block */
				    const block2 = document.createElement("div");
				    block2.classList.add("timeline-block");
				    block2.style.backgroundColor = shadeColour("#1e9664", 0.2);
				    block2.dataset.label = blockObj.label;
				    container2.appendChild(block2);

				    /* Label */
				    const label2 = document.createElement("div");
				    label2.innerText = blockObj.label;
				    label2.classList.add("timeline-label");
				    label2.dataset.label = blockObj.label;
				    block2.appendChild(label2);

				    /* Whitespace in between */
				    const blockSeparator2 = document.createElement("div");
				    blockSeparator2.classList.add("timeline-separator");
				    blockSeparator2.dataset.label = blockObj.label;
				    container2.appendChild(blockSeparator2);

				    /* For axis interaction */
				    if (scale === 0 || scale === 1) {
					    block2.dataset.startDay = blockObj.range[0];
					    block2.dataset.endDay = blockObj.range[1];
				    }
				}
			});
		});
	};

	const updateTimeline = () => {
	let firstBlock = true;
		scaleList[0].blocks.forEach((blockObj) => {
			const idString = `[data-label='${blockObj.label}']`;

			const $block = $(`.timeline-block${idString}`);
			const $label = $(`.timeline-label${idString}`);
			const $blockSeparator = $(`.timeline-separator${idString}`);

			let pos = blockObj.range.map((day) => (day / noDays) * svgShape[2]);

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

	const updateXAxis = () => {
		const scale = view.getScale();
		let firstBlock = true;
		scaleList[scale].blocks.forEach((blockObj) => {
			const idString = `[data-label='${blockObj.label}']`;

			const $block = $(`.x-axis-block${idString}`);
			const $label = $(`.x-axis-label.movable${idString}`);
			const $blockSeparator = $(`.x-axis-tick.movable${idString}`);

			let pos = blockObj.range.map(view.dayToX);

			if (pos[0] >= svgShape[2] || pos[1] <= 0) {
				return;
			}

			/* Truncates blocks inside viewBox */
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

		const posFixed = [0, view.zoomWidth()].map((val) => (val + view.zoomX()) * svgShape[2]);

		const $movingWindow = $(".moving-window");

		$movingWindow.css("left", `${posFixed[0] - 1}px`);
		$movingWindow.css("width", `${posFixed[1] - posFixed[0] + 3}px`);
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
		"updateTimeline": updateTimeline,
		"updateXAxis": updateXAxis,
		"declutter": declutter
	};
})();

/* Possible values for width of viewBox */
const viewWRange = [350, 1800];

/* Concerns the viewBox of the svg canvas (e.g. zooming and panning) */
const view = (() => {
	let viewBox = {
		"x": 0,
		"y": 0,
		"w": "",
		"h": ""
	};

	let zoomX, zoomWidth;

	/* At zoomWidth = zoomThreshold, changes scale of x-axis (xAxisScale) */
	const zoomThreshold = [0.5];
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

	/* Returns 0 if no zoom */
	/* Input: target x and width of viewBox */
	const zoom = (targetX, targetWidth) => {

		if (targetWidth < viewWRange[0] || targetWidth > viewWRange[1]) {
		    return 0;
		}

		targetX = Math.max(targetX, 0);
		targetWidth = Math.min(targetWidth, canvasShape[0] - targetX);

		setView({ x:targetX, w:targetWidth });
	};

	const viewBoxAnimate = (targetX, targetWidth) => {
		const oldX = viewBox.x;
		const oldWidth = viewBox.w;
		const duration = 200;

		let start = performance.now();

	    requestAnimationFrame(function animate(time) {
			// timeFraction goes from 0 to 1
			let timeFraction = (time - start) / duration;
			if (timeFraction > 1) timeFraction = 1;

			// calculate the current animation state
			let progress = timeFraction

			setView({ x:oldX + progress * (targetX - oldX), w:oldWidth + progress * (targetWidth - oldWidth) });
			drawXAxis();

			if (timeFraction < 1) {
				requestAnimationFrame(animate);
			}

	    });
	}

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

	return {
		"set": setView,
		"zoomX": () => zoomX,
		"zoomWidth": () => zoomWidth,
		"viewBox": () => viewBox,
		"dayToX": dayToX,
		"xToDay": xToDay,
		"zoom": zoom,
		"viewBoxAnimate": viewBoxAnimate,
		"pan": pan,
		"getScale": getScale,
		"getZoom": getZoom,
		"smooth": smooth
	};
})();

const categories = [
	{
		"id": ["i", "v", "f"],
		"name": "Leisure",
	},
	{
		"id": ["c", "j"],
		"name": "Professional",
	},
	{
		"id": ["n", "g", "a", "m"],
		"name": "Intellectual\xa0and\xa0creative",
	},
	{
		"id": ["p"],
		"name": "Health,\xa0duties,\xa0and\xa0productivity",
	},
	{
		"id": ["o"],
		"name": "Social",
	},
	{
		"id": ["s"],
		"name": "Sleep",
	},
	{
		"id": ["w", "k", "e", "l", "r"],
		"name": "Other",
	}
];

const catColours = [
    transformHue(15),
    transformHue(60),
    transformHue(120),
    transformHue(215),
    transformHue(275),
    "#b3b3b3",
    "#505050"
]

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
		square.style.background = catColours[i];
		square.style.border = `solid ${catColours[i]} 1px`;
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

const analyseData = (dataCSV) => {
	let data = dataCSV;

	data = data.split("\n");

    data.shift();
	data.pop();

	data = data.map((day) => day.split(",").map((x) => Number(x)));

	noDays = data.length;

	return data;
}

const drawChart = () => {
	$(svg).empty();
	svg.style.background = "";
	$(".grid-line").hide();

	let startTime = new Date();

	/* Number of points to evaluate */
	let noPoints = 400;

	noPoints = Math.round(noPoints / view.getZoom());

	/* Array of categories to plot */
	let cats;

	if (!chartState.lockFlag) {
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

		const n = data.length;

		/* Sharp upper edge */
		if (!chartState.lockFlag && cat === 0) {
			path = `M ${-spill} ${canvasShape[1] + spill} V ${-spill} H ${canvasShape[0] + spill} V ${canvasShape[1] + spill} Z`;
		} else {
			data.forEach((arr, i) => {
			    const val = arr[cat] + (chartState.lockFlag ? -(cat !== noCats - 1 ? arr[cat + 1] : 0) : 0)
				const xCoord = i * canvasShape[0] / n;
				const yCoord = (1 - val) * canvasShape[1];
				str += ` L ${xCoord} ${yCoord}`;
			})

			const bottomLeft = `${-spill} ${canvasShape[1] + spill}`;
			const topLeft = `${-spill} ${(1 - data[0][cat]) * canvasShape[1]}`;
			const topRight = `${canvasShape[0] + spill} ${(1 - data[n - 1][cat]) * canvasShape[1]}`;
			const bottomRight = `${canvasShape[0] + spill} ${canvasShape[1] + spill}`;

			path = `M ${bottomLeft} ${topLeft}${str} ${topRight} L ${bottomRight} Z`;
		}

		const area = document.createElementNS(NS, "path");
		area.setAttribute("d", path);
		area.setAttribute("fill", catColours[cat]);
		area.setAttribute("stroke", "white");
		area.setAttribute("stroke-width", "1.5");
		area.setAttribute("vector-effect", "non-scaling-stroke");
		area.setAttribute("stroke-linejoin", "round");
		area.setAttribute("pointer-events", "none");
		area.setAttribute("data-cat", String(cat));
		area.setAttribute("class", "area");
		svg.appendChild(area);
	});

	 //console.log(new Date() - startTime);
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
	$(".timeline-block").hide();
	$(".timeline-label").hide();
	$(".timeline-separator").hide();
	$(".x-axis-block").hide();
	$(".x-axis-label.movable").hide();
	$(".x-axis-tick.movable").hide();

	updateXAxisEndpoint(0);
	updateXAxisEndpoint(1);

	xAxisScales.updateTimeline();
	xAxisScales.updateXAxis();

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

	const arr = data[day];

	const _y = svgShape[3] - y;

	/* Converts pointer y position to hours */
	/* Sometimes it is greater than 1 */
	const yHours = Math.min(_y / svgShape[3], 1);
	let i;

	let range = [];

	if (chartState.lockFlag) {
		i = chartState.lockCat;
		range = [0, arr[i] - (i < noCats - 1 ? arr[i + 1] : 0)];
	} else {
		i = noCats - 1;
		let lowerBound = 0;
		let upperBound = arr[i];
		while (i > 0 && arr[i] < yHours) {
			--i;
			lowerBound = arr[i + 1];
			upperBound = arr[i];
		}
		range = [lowerBound, upperBound];
	}

	/* When a category is isolated, the chart is drawn "upside-down" */
	if (false && chartState.lockFlag) {
		range = range.map((val) => 1 - val);
		range.reverse();
	}

	/* Converts hours to pointer y position */
	const rangeY = range.map((val) => val * svgShape[3]);

	rangeY[1] -= 1;

	chartState.hoverFlag = true;

	elem("y-axis-indicator").style.bottom = `${rangeY[0]}px`;
	elem("y-axis-indicator").style.height = `${rangeY[1] - rangeY[0] + 1}px`;
	elem("y-axis-indicator").style.background = catColours[i];

	elem("y-axis-label-hover").innerHTML = `${((range[1] - range[0]) * 24).toFixed(1)}`;
	const h2 = elem("y-axis-label-hover").getBoundingClientRect().height;
	elem("y-axis-label-hover").style.bottom = `${(rangeY[0] + rangeY[1] - h2) / 2}px`;

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

		const direction = -Math.sign(evt.deltaY);

		/* We want zooming in and out to cancel each other out */
		const zoomSpeed = direction > 0 ? 0.15 : 0.15 / (1 - 0.15)

		const targetWidth = (1 - direction * zoomSpeed) * view.viewBox().w;
		const targetX = Math.max(view.viewBox().x + (view.viewBox().w - targetWidth) * x / svgShape[2], 0);

		if (view.zoom(targetX, targetWidth) !== 0) {
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
			catColours[i],
			shadeColour(catColours[i], 0.5),
			lightGrey
		];

		$(`.legend-square[data-cat = ${i}]`).css({
			"background": background[stage]
		});
	}

	/* stage = 0: default/hover, stage = 1: active,  stage = 2: disappeared */
	const catReappear = (i, stage) => {
		const background = [
			shadeColour(catColours[i], 0.9),
			shadeColour(catColours[i], 0.95),
			catColours[i]
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
		const zoomStar = (endDay - startDay) / noDays;

		/* Desired viewBox width and x */
		let targetWidth, targetX;

		if (zoomStar < viewWRange[0] / canvasShape[0]) {
			/* The desired viewbox width is too small */
			targetWidth = viewWRange[0];
			targetX = canvasShape[0] - viewWRange[0];
		} else {
			targetWidth = zoomStar * canvasShape[0];
			targetX = startDay / noDays * canvasShape[0];
		}

		view.viewBoxAnimate(targetX, targetWidth);
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
		const $block = $(`.timeline-block[data-label='${evt.target.dataset.label}']`);

		$block.css({
			"background-color": oldColour
		});
	};

	pointer.hover(".timeline-block", XAxisBlockEnter, XAxisBlockLeave);
	pointer.click(
		".timeline-block",
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

    view.set({ x: (canvasShape[0] - svgShape[2]), w: svgShape[2], h: canvasShape[1] });

	drawChart();

	drawXAxis();
};


const init = (rawData) => {
	data = analyseData(rawData);

	updateSvgShape();

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
    url: `./data-0.008-100.txt`,
    async: true,
    success: init,
    dataType: "text"
});

});
