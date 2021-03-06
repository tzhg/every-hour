/* global $ */

"use strict";

import { transformHue } from "../../js/transformHue.js";
import { pointerEvents } from "../../js/pointerEvents.js";
import { shadeColour } from "../../js/shadeColour.js";

$(() => {
const DAYS_IN_WEEK = 7;
const HOURS_IN_DAY = 24;
const MONTHS_IN_YEAR = 12;

/* Text colour */
const DARK_GREY = "#404040";

/* Background colour */
const LIGHT_GREY = "#ffffff";

let TYPES, LEGENDS, PERIODS;

const defaultChart = ["default", "hist", "month", true];

let getData;

let noDays, noHours;

/* Settings options */
let period, legend, type, truncate, selected, scroll;

const pointer = pointerEvents();

/* Fixes modulo operator for negative numbers */
function mod(n, m) {
	return ((n % m) + m) % m;
}

function elem(className) {
	return document.getElementsByClassName(className)[0];
}

/* upperLimit()/lowerLimit() = "" if there is not limit */
let typesInit = function() {
	let scrollYear = function(truncate) {
		return {
			"lowerLimit": () => 0,
			"upperLimit": () => PERIODS.year.len() - 1,
			"label": (n) => START_DATE[0] + n,
			"labelWidth": 32, /* Maximum width of the scroll text */
			"truncate": truncate
		};
	};

	let sort = (arr) => {
		const indices = arr.map((val, idx) => idx);

		for (let pos = 0; pos < arr.length; ++pos) {
			if (pos > 0 && arr[indices[pos]] > arr[indices[pos - 1]]) {
				[indices[pos], indices[pos - 1]] = [indices[pos - 1], indices[pos]];
				pos -= 2;
			}
		}

		return indices;
	}

	let sortMean = (legend, period) => {
		let aves = period === "year" ?
			LEGENDS[legend].calcAverage(PERIODS[period].start(scroll.get()), PERIODS[period].start(scroll.get() + 1)) :
			LEGENDS[legend].calcAverage();

		return sort(aves);
	};

	function freq(legend, period) {
		const freq = [];

		if (period === "weekday") {
			for (let i = 0; i < DAYS_IN_WEEK; ++i) {
				freq[i] = Array(LEGENDS[legend].len).fill(0);
			}

			for (let i = 0; i < noDays; ++i) {
				let data = LEGENDS[legend].data[i];
				if (data) {
					for (let k = 0; k < HOURS_IN_DAY; ++k) {
						if (data[k]) {
							data[k].forEach((val) => {
								++freq[i % DAYS_IN_WEEK][val];
							});
						}
					}
				}
			}
		} else {
			let currentDay;

			currentDay = PERIODS[period].offset;

			for (let i = 0; currentDay < noDays; ++i) {
				const arrFreq = Array(LEGENDS[legend].len).fill(0);

				for (let j = 0; j < PERIODS[period].days(i); ++j, ++currentDay) {
					let data = LEGENDS[legend].data[currentDay];
					if (data) {
						for (let k = 0; k < HOURS_IN_DAY; ++k) {
							if (data[k]) {
								data[k].forEach((val) => {
									++arrFreq[val];
								});
							}
						}
					}
				}
				freq.push(arrFreq);
			}
		}
		return freq;
	}

	function hourFreq(legend, period) {
		const hourFreq = [];

		if (period === "weekday") {
			for (let i = 0; i < DAYS_IN_WEEK; ++i) {
				hourFreq[i] = [];
				for (let j = 0; j < HOURS_IN_DAY; ++j) {
					hourFreq[i][j] = Array(LEGENDS[legend].len).fill(0);
				}

				for (let currentDay = 0; currentDay < noDays; ++currentDay) {
					let data = LEGENDS[legend].data[currentDay];
					if (data) {
						if ((currentDay - i) % DAYS_IN_WEEK === 0) {
							for (let k = 0; k < HOURS_IN_DAY; ++k) {
								if (data[k]) {
									data[k].forEach((val) => {
										++hourFreq[i][k][val];
									});
								}
							}
						}
					}
				}
			}
		} else {
			for (let j = 0; LEGENDS[legend].data[PERIODS[period].start(j)]; ++j) {
				hourFreq[j] = [];

				for (let i = 0; i < HOURS_IN_DAY; ++i) {
					hourFreq[j][i] = Array(LEGENDS[legend].len).fill(0);

					for (let currentDay = PERIODS[period].start(j);
						currentDay < PERIODS[period].start(j + 1);
						++currentDay) {

						let data = LEGENDS[legend].data[currentDay];
						if (data && data[i]) {
							data[i].forEach((val) => {
								++hourFreq[j][i][val];
							});
						}
					}
				}
			}
		}

		return hourFreq;
	}

	function pie(legend, period) {
		let arr = [];
		for (let i = 0; LEGENDS[legend].data[PERIODS[period].start(i)]; ++i) {
			let aves;

			if (period === "eternity") {
				aves = LEGENDS[legend].calcAverage();
			} else if (period === "year") {
				let end = LEGENDS[legend].data[PERIODS[period].start(i + 1) - 1] ?
					PERIODS[period].start(i + 1) : noDays;

				aves = LEGENDS[legend].calcAverage(PERIODS[period].start(i), end);
			}

			const indices = sort(aves).reverse();

			arr[i] = [aves, indices];
		}

		return arr;
	}

	function timelineHour(legend, period) {
		const timelineHourArr = [];

		let currentDay;

		currentDay = PERIODS[period].offset;

		for (let i = 0; currentDay < noDays; ++i) {
			let arrHour = [];
			for (let k = 0; k < HOURS_IN_DAY; ++k) {
				arrHour[k] = [];
			}

			for (let j = 0; j < PERIODS[period].days(i); ++j, ++currentDay) {
				let data = LEGENDS[legend].data[currentDay];
				if (data) {
					for (let k = 0; k < HOURS_IN_DAY; ++k) {
						if (data[k]) {
							arrHour[k].push(...data[k]);
						}
					}
				}
			}

			timelineHourArr.push(arrHour);
		}

		return timelineHourArr;
	};

	function catFreq(legend, period) {
		function quartIdx(n) {
			const arr = [];

			function median(m) {
				return m % 2 ? (m - 1) / 2 : (m / 2 + m / 2 - 1) / 2;
			}

			arr[0] = 0;
			arr[4] = n - 1;

			arr[2] = median(n);

			if (n % 2) {
				arr[1] = median((n - 1) / 2);
				arr[3] = (n + 1) / 2 + median((n - 1) / 2);
			} else {
				arr[1] = median(n / 2);
				arr[3] = n / 2 + median(n / 2);
			}

			return arr;
		}

		const catFreq = [];
		const quarts = [];

		for (let i = 0; i < LEGENDS[legend].len; ++i) {
			catFreq[i] = [];
			quarts[i] = [];
		}

		let currentDay, complete;

		complete = true;
		currentDay = PERIODS[period].offset;

		for (let i = 0; currentDay < noDays; ++i) {
			const arrCatFreq = Array(LEGENDS[legend].len).fill(0);

			for (let j = 0; j < PERIODS[period].days(i); ++j, ++currentDay) {
				let data = LEGENDS[legend].data[currentDay];
				if (data) {
					for (let k = 0; k < HOURS_IN_DAY; ++k) {
						if (data[k]) {
							data[k].forEach((val) => {
								++arrCatFreq[val];
							});
						} else {
							complete = false;
						}
					}
				}
			}

			for (let j = 0; j < LEGENDS[legend].len; ++j) {
				catFreq[j].push(arrCatFreq[j] / PERIODS[period].days(i));
			}
		}

		if (!complete) {
			for (let i = 0; i < LEGENDS[legend].len; ++i) {
				catFreq[i].pop();
			}
		}

		for (let i = 0; i < LEGENDS[legend].len; ++i) {
			const OUTLIER = false;
			let x, j;

			catFreq[i].sort((a, b) => a - b);

			quartIdx(catFreq[i].length).forEach((idx, j) => {
				if (Number.isInteger(idx)) {
					quarts[i][j] = catFreq[i][idx];
				} else {
					quarts[i][j] = (catFreq[i][Math.ceil(idx)] + catFreq[i][Math.floor(idx)]) / 2;
				}
			});

			if (OUTLIER) {
				x = 1.5 * (quarts[i][3] - quarts[i][1]);

				for (j = 0; catFreq[i][j] < quarts[i][1] - x; ++j) {
					quarts[i].push(catFreq[i][j]);
				}
				quarts[i][0] = catFreq[i][j];

				for (j = catFreq[i].length - 1; catFreq[i][j] > quarts[i][3] + x; --j) {
					quarts[i].push(catFreq[i][j]);
				}
				quarts[i][4] = catFreq[i][j];
			}
		}
		return quarts;
	}

	/* The properties are always false by default */
	let types = {
		"hist": {
			period: ["month", "year", "weekday"],
			defPeriod: "month",
			dataFun: freq
		},
		"line": {
			period: ["month", "year"],
			defPeriod: "month",
			dataFun: freq
		},
		"timelineHour": {
			period: ["week"],
			defPeriod: "week",
			notIsolate: true,
			notTrunc: true,
			reload: true,
			infoText: {
				"colour": "#FFFFFF",
				"genModal": (modal) => {
					modal.innerText = "Each pixel represents one hour of one day. Each column represents one week. The pixels in each column are ordered by hour, and pixels with the same hour (but with different days) are ordered randomly.";
				}
			},
			dataFun: timelineHour
		},
		"hourHist": {
			period: ["year", "eternity", "weekday"],
			scroll: () => {
				if (period.is("weekday")) {
					return {
						"label": (n) => getWeekDayLabel(n),
						"lowerLimit": () => "",
						"upperLimit": () => "",
						"labelWidth": 76
					};
				}
				if (period.is("year")) {
					return scrollYear(true);
				}
			},
			defPeriod: "year",
			dataFun: hourFreq
		},
		"boxWhisk": {
			period: ["week", "month"],
			defPeriod: "month",
			notTrunc: true,
			notIsolate: true,
			sort: () => sortMean(legend.get(), period.get()),
			dataFun: catFreq,
		},
		"pie": {
			period: ["year", "eternity"],
			scroll: () => {
				if (period.is("year")) {
					return scrollYear(true);
				}
			},
			defPeriod: "year",
			notIsolate: true,
			noAxes: true,
			sort: () => sortMean(legend.get(), period.get()),
			dataFun: pie
		},
		"calendar": {
			period: ["day"],
			defPeriod: "day",
			notTrunc: true,
			noAxes: true,
			onlyIsolate: true,
			dataFun: freq
		}
	};

	$.each(types, (id, obj) => {
		obj.onlyIsolate = !!obj.onlyIsolate;
		obj.notTrunc = !!obj.notTrunc;
		obj.notIsolate = !!obj.notIsolate;
		obj.reload = !!obj.reload;
		obj.axes = !!obj.axes;
		if (!obj.infoText) {
			obj.infoText = false;
		}

		obj.scroll = obj.scroll || function () {
			return "";
		};

		obj.sort = obj.sort || function () {
			return "";
		};
	});

	return types;
};

let legendsInit = function(dataCSV) {
	let legends = {
		"default": {
			"cats": [
				{
					"id": ["i", "v"],
					"colour": transformHue(5),
					/* \xa0 is a non breaking space */
					"name": "Internet\xa0and\xa0gaming",
				},
				{
					"id": ["f"],
					"colour": transformHue(37.5),
					"name": "Film\xa0and\xa0reading",
				},
				{
					"id": ["p"],
					"colour":  transformHue(60),
					"name": "Health\xa0and\xa0duties",
				},
				{
					"id": ["c", "j"],
					"colour":  transformHue(120),
					"name": "Professional",
				},
				{
					"id": ["n", "g"],
					"colour":  transformHue(190),
					"name": "Intellectual",
				},
				{
					"id": ["o"],
					"colour": transformHue(215),
					"name": "Social",
				},
				{
					"id": ["a", "m"],
					"colour": transformHue(275),
					"name": "Music",
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
				},
			],
			"maxLabelWidth": 124
		},
		"simple": {
			"cats": [
				{
					"id": ["v", "i", "f", "w", "r"],
					"colour": transformHue(5),
					"name": "Leisure"
				},
				{
					"id": ["o", "l"],
					"colour": transformHue(37.5),
					"name": "Social"
				},
				{
					"id": ["n", "a", "g", "m", "k"],
					"colour": transformHue(60),
					"name": "Hobbies"
				},
				{
					"id": ["j", "c", "p", "e"],
					"colour": transformHue(120),
					"name": "Duties"
				},
				{
					"id": ["s", "w"],
					"colour": "#b3b3b3",
					"name": "Rest"
				}
			],
			"maxLabelWidth": 51
		}
	};

	/* Calculates average between indices x and y (excluding y) */
	function calcAverage(legend, x, y) {
		const arr = new Array(legend.len).fill(0);
		let counter = 0;
		let data = x || y ? legend.data.slice(x, y) : legend.data;

		for (let i = 0; i < data.length; ++i) {
			for (let j = 0; j < HOURS_IN_DAY; ++j) {
				if (data[i][j]) {
					data[i][j].forEach((cat) => {
						++counter;
						++arr[cat];
					});
				}
			}
		}

		return arr.map((x) => HOURS_IN_DAY * x / counter);
	}

	$.each(legends, (id, obj) => {
		obj.data = dataCSV;

		/* Replaces letters by numbers */
		obj.cats.forEach((cat, idx2) => {
			const reg = new RegExp(cat.id.join("|"), "g");
			obj.data = obj.data.replace(reg, idx2.toString());
		});

		obj.data = obj.data.split("\n");

		obj.data.pop();

		obj.data = obj.data.map((day) => day.split(",").map((hour) => {
			let exists = true;

			/* Produces array for each hour */
			let arr = hour.split("+").map((cat) => {
				let val = parseInt(cat, 10);

				if (isNaN(val)) {
					exists = false;
				}

				return parseInt(cat, 10);
			});

			if (exists) {
				return arr;
			} else {
				return "";
			}
		}));

		if (id === "default") {
			noDays = obj.data.length;

			obj.data[noDays - 1].forEach((hour, idx2) => {
				if (Number.isInteger(hour)) {
					noHours = idx2;
				}
			});
		}

		obj.len = obj.cats.length;

		/* x and y slice the data */
		obj.calcAverage = (x, y) => calcAverage(obj, x, y);
	});

	return legends;
};

/* In Date() format */
const START_DATE = [2017, 0, 1];

/* Controls the day which days the week */
function getWeekDay(n) {
	return mod(n - 1, DAYS_IN_WEEK);
}
function getWeekDayLabel(n) {
	const WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
	return WEEK_DAYS[mod(n + 1, DAYS_IN_WEEK)];
}

const MONTHS = [
	{
		"name": "January",
		"len": () => 31
	},
	{
		"name": "February",
		"len": (leap) => leap ? 29 : 28
	},
	{
		"name": "March",
		"len": () => 31
	},
	{
		"name": "April",
		"len": () => 30
	},
	{
		"name": "May",
		"len": () => 31
	},
	{
		"name": "June",
		"len": () => 30
	},
	{
		"name": "July",
		"len": () => 31
	},
	{
		"name": "August",
		"len": () => 31
	},
	{
		"name": "September",
		"len": () => 30
	},
	{
		"name": "October",
		"len": () => 31
	},
	{
		"name": "November",
		"len": () => 30
	},
	{
		"name": "December",
		"len": () => 31
	}
];

function formatDate(days) {
	const date = new Date(
		START_DATE[0],
		START_DATE[1],
		START_DATE[2] + days
	);

	let suffix;

	switch (date.getDate() % 10) {
		case 1:
			suffix = "<sup>st</sup>";
			break;
		case 2:
			suffix = "<sup>nd</sup>";
			break;
		case 3:
			suffix = "<sup>rd</sup>";
			break;
		default:
			suffix = "<sup>th</sup>";
	}

	return `${date.getDate()}${suffix} ${MONTHS[date.getMonth()].name.slice(0, 3)} ${date.getFullYear()}`;
}

function periodInit() {
	/* Calculates if a year is a leap year. Does not work for years like 2100 etc. */
	let leap = (year) => !(year % 4);

	let pObj = {
		"week": {
			"name": "Week",

			/* Offset due to the first week starting on the second day of 2017 */
			"offset": 1,

			/* Number of days in 1 period*/
			"days": () => DAYS_IN_WEEK,

			/* toolTipTime takes an integer as argument */
			"toolTipTime": (n) => formatDate(PERIODS.week.offset + n * PERIODS.week.days())
		},
		"month": (() => {
			let year = (n) => START_DATE[0] + Math.floor(n / MONTHS_IN_YEAR);
			return {
				"name": "Month",
				"days": (month) => MONTHS[month % MONTHS_IN_YEAR].len(leap(year(month))),
				"toolTipTime": (n) => `${MONTHS[n % MONTHS_IN_YEAR].name} ${year(n)}`
			};
		})(),
		"eternity": {
			"name": "Eternity",
			"days": () => noDays,
			"toolTipTime": () => "",
			"len": () => 1,
			"notTrunc": true,
			"start": (n) => {
				if (n === 0) {
					return 0;
				} if (n === 1) {
					return noDays;
				}
			}
		},
		"day": {
			"name": "Day",
			"days": () => 1,
			"toolTipTime": (n) => formatDate(n)
		},
		"weekday": {
			"name": "Weekday",
			"days": (i) => Math.floor(noDays / DAYS_IN_WEEK) + (noDays % DAYS_IN_WEEK > i ? 1 : 0),
			"toolTipTime": (i) => getWeekDayLabel(i),
			"len": () => DAYS_IN_WEEK,
			"notTrunc": true
		},
		"year": {
			"name": "Year",
			"days": (year) => leap(year) ? 366 : 365,
			"toolTipTime": (i) => `${START_DATE[0] + i}`,
			/* Start returns the index for the first day of the given year (which starts at 0 [= 2017]). */
			"start": (year) => year * 365 + (Math.floor(year / 4))
		}
	};

	$.each(pObj, (id, obj) => {
		obj.offset = obj.offset || 0;
		obj.notTrunc = !!obj.notTrunc;

		if (!obj.len) {
			let currentDay;

			currentDay = obj.offset;

			let defData = LEGENDS.default.data;

			obj.unfinished = false;

			/* Finds the number of time periods in the data */
			for (let i = 0; ; ++i) {
				if (!defData[currentDay]) {
					obj.len = () => i;
					return;
				}

				/* If there is an unfinished time period */
				if (!defData[currentDay + obj.days(i) - 1] ||
					defData[currentDay + obj.days(i) - 1].length < HOURS_IN_DAY) {

					obj.unfinished = true;

					/* The agument of this function is a bool */
					obj.len = function(trunc = truncate.get()) {
						return trunc ? i : i + 1;
					};

					return;
				}

				currentDay += obj.days(i);
			}
		}
	});

	return pObj;
};

const FADE = 0.25;

const graphics = (() => {

	const svg = elem("chart-svg");
	const toolTip = elem("tool-tip");
	const NS = "http://www.w3.org/2000/svg";
	const SVG_SPACE = 1000;

	const LINE_WIDTH = 3;

	const R_PIE = 0.4;
	const O_PIE = 0.5;

	const DOT_R = 6;
	const DOT_PADDING = 14;

	/* Padding (in pixels) on the left and right sides of line chart */
	const LINE_PAD = 10;

	/* Box and whiskers */
	const SHADE = 0.2;

	const GRADIENT_LIMIT = 10;

	let yLimit;

	function format(x) {
		let hours = Math.floor(x);
		let mins = Math.round((x % 1) * 60);

		let hourText = hours ? `${hours} ${hours === 1 ? "hour" : "hours"}` : "";
		let divider = hours && mins ? " " : "";
		let minText = mins ? `${mins} ${mins === 1 ? "min" : "mins"}` : "";
		let noneText = !hours && !mins ? "0 hours" : "";

		return `${hourText}${divider}${minText}${noneText}`;
	}

	/* An upper bound for the y-axis value. Preferably divisible by 4. */
	function setYLimit() {
		if (type.is("line") || type.is("boxWhisk")) {
			if (period.is("day")) {
				yLimit = 20;
			} else if (period.is("week")) {
				yLimit = 16;
			} else if (period.is("month")) {
				yLimit = 12;
			}
		} else {
			yLimit = "";
		}
	}

	/* Assumes the svg is square */
	function pieCoord(frac, X) {
		let angle = (Math.PI / 2) + frac * 2 * Math.PI;

		return [X * (O_PIE + R_PIE * Math.cos(angle)), X * (O_PIE - R_PIE * Math.sin(angle))];
	}

	let comparisonLine = {
		"add": (y) => {
			const line = document.createElementNS(NS, "line");

			line.setAttribute("x1", 0);
			line.setAttribute("y1", y);
			line.setAttribute("x2", String(SVG_SPACE));
			line.setAttribute("y2", y);
			line.setAttribute("stroke", DARK_GREY);
			line.setAttribute("stroke-width", "1");
			line.setAttribute("class", "comparison-line");
			line.setAttribute("pointer-events", "none");

			svg.appendChild(line);
		},
		"remove": () => {
			if (elem("comparison-line")) {
				elem("comparison-line").remove();
			}
		}
	}

	let cover;
	const COVER_OPACITY = 0.5;

	function mouseEnter(shape) {
		const TOOL_TIP_MARGIN = [0, 6];

		if (shape === "hist") {
			return function(evt) {
				let d = evt.target.dataset;

				let cat = Number(d.cat);

				if (!type.is("timelineHour")) {
					svg.appendChild(cover);
					$(".cover").attr("opacity", COVER_OPACITY);

					svg.appendChild(evt.target);

					if (locked) {
						comparisonLine.remove();
						comparisonLine.add(evt.target.getAttribute("y"));
					}
				}

				if (type.is("hist")) {
					let t = period.is("weekday") ?
						getWeekDay(Number(d.t)) :
						Number(d.t);

					let timeLabel = period.info().toolTipTime(t);

					/* This predicts the unfinished period */
					let mult = period.info().unfinished && !truncate.get() && t === period.info().len() - 1 ?
						Number(d.totaly) / HOURS_IN_DAY :
						period.info().days(t);
					let dataLabel = `${format(d.n / mult)}/day`;

					toolTip.innerHTML = `${timeLabel}<br>${legend.info().cats[cat].name}<br>${dataLabel}`;
				} else if (type.is("timelineHour")) {
					let timeLabel = formatDate(Number(d.timelineHour1));
					let hour = Number(d.timelineHour2);
					let hourLabel = `${hour < 10 ? "0" : ""}${hour}:00`;

					toolTip.innerHTML = `${timeLabel}<br>${hourLabel}<br>${legend.info().cats[cat].name}`;
				} else if (type.is("hourHist")) {
					let hour = Number(d.t);
					let timeLabel = `${hour < 10 ? "0" : ""}${hour}:00`;

					let dataLabel;
					if (period.is("weekday")) {
						let weekDay = getWeekDay(scroll.get());
						dataLabel = `${Math.round(Number(d.n) * 100 / Number(d.totaly))}%`;
					} else {
						dataLabel = `${Math.round(Number(d.n) * 100 / Number(d.totaly))}%`;
					}
					toolTip.innerText = `${timeLabel}
						${legend.info().cats[cat].name}
						${dataLabel}`;
				}

				$(toolTip).show();

				let elemBox = evt.target.getBoundingClientRect();
				toolTip.style.left = `${elemBox.right + TOOL_TIP_MARGIN[0]}px`;
				toolTip.style.top = `${elemBox.top - toolTip.offsetHeight - TOOL_TIP_MARGIN[1]}px`;
			};
		} else if (shape === "dot") {
			return function(evt) {
				let cat = Number(evt.target.dataset.cat);
				let t = Number(evt.target.dataset.t);

				$(`.dot[data-cat = ${cat}][data-t = ${t}]`).attr("visibility", "visible");

				let timeLabel = period.info().toolTipTime(t);

				/* This predicts the unfinished period */
				let mult = period.info().unfinished && !truncate.get() && t === period.info().len() - 1 ?
					Number(evt.target.dataset.totaly) / HOURS_IN_DAY :
					period.info().days(t);
				let dataLabel = `${format(Number(evt.target.dataset.n) / mult)}/day`;

				toolTip.innerHTML = `${timeLabel}<br>${legend.info().cats[cat].name}<br>${dataLabel}`;

				$(toolTip).show();

				let elemBox = evt.target.getBoundingClientRect();
				toolTip.style.left = `${elemBox.left + elemBox.width / 2 + TOOL_TIP_MARGIN[0]}px`;
				toolTip.style.top = `${elemBox.top + elemBox.height / 2 - toolTip.offsetHeight - TOOL_TIP_MARGIN[1]}px`;

				comparisonLine.remove();
				comparisonLine.add(evt.target.getAttribute("cy"));
			};
		} else if (shape === "boxWhisk") {
			return function(evt) {
				let cat = Number(evt.target.dataset.cat);
				let catObj = legend.info().cats[cat];

				svg.appendChild(cover);
				$(".cover").attr("opacity", COVER_OPACITY);

				svg.appendChild(evt.target.parentElement);

				let arr = evt.target.dataset.arr.split(",").map((val) => `${format(Number(val))}${period.is("day") ? "" : "/day"}`);
				toolTip.innerHTML = `${catObj.name}<br>Maximum: ${arr[4]}<br>
					3<sup>rd</sup> quartile: ${arr[3]}<br>
					Median: ${arr[2]}<br>
					1<sup>st</sup> quartile: ${arr[1]}
					<br>Minimum: ${arr[0]}`;
				$(toolTip).show();

				let elemBox = elem(`max-${cat}`).getBoundingClientRect();
				toolTip.style.left = `${elemBox.right + TOOL_TIP_MARGIN[0]}px`;
				toolTip.style.top = `${elemBox.top - toolTip.offsetHeight - TOOL_TIP_MARGIN[1]}px`;
			};
		} else if (shape === "seg") {
			return function(evt) {
				let cat = Number(evt.target.dataset.cat);

				svg.appendChild(cover);
				$(".cover").attr("opacity", COVER_OPACITY);

				svg.appendChild(evt.target);

				let svgBox = elem("svg-container").getBoundingClientRect();
				let coord = pieCoord(Number(evt.target.dataset.frac), svgBox.width);

				toolTip.innerText = `${legend.info().cats[cat].name}
					${format(Number(evt.target.dataset.n))}/day`;
				$(toolTip).show();
				toolTip.style.left = `${svgBox.left + coord[0] + TOOL_TIP_MARGIN[0]}px`;
				toolTip.style.top = `${svgBox.top + coord[1] - toolTip.offsetHeight - TOOL_TIP_MARGIN[1]}px`;
			};
		} else if (shape === "calSquare") {
			return function(evt) {
				const box = document.createElementNS(NS, "rect");

				box.setAttribute("x", evt.target.dataset.x);
				box.setAttribute("y", evt.target.dataset.y);

				box.setAttribute("width", String(CAL_SIZE));
				box.setAttribute("height", String(CAL_SIZE));
				box.setAttribute("fill", "transparent");
				box.setAttribute("stroke", DARK_GREY);
				box.setAttribute("stroke-width", 4);
				box.setAttribute("stroke-linejoin", "miter");
				box.setAttribute("pointer-events", "none");
				box.setAttribute("class", "cal-square-border");

				svg.appendChild(box);

				toolTip.innerHTML = `${period.info().toolTipTime(Number(evt.target.dataset.t))}<br>${format(Number(evt.target.dataset.n))}`;

				$(toolTip).show();

				let elemBox = evt.target.getBoundingClientRect();
				toolTip.style.left = `${elemBox.right + TOOL_TIP_MARGIN[0]}px`;
				toolTip.style.top = `${elemBox.top - toolTip.offsetHeight - TOOL_TIP_MARGIN[1]}px`;
			};
		}
	}

	function mouseLeave(shape) {
		if (shape === "hist") {
			return function(evt) {
				comparisonLine.remove();

				$(".overcover").remove();
				$(".cover").attr("opacity", 0);

				$(toolTip).hide();
			};
		} else if (shape === "dot") {
			return function(evt) {
				let cat = evt.target.dataset.cat;
				let t = evt.target.dataset.t;

				$(`.dot[data-cat = ${cat}][data-t = ${t}]`).attr("visibility", "hidden");

				$(toolTip).hide();

				comparisonLine.remove();
			};
		} else if (shape === "boxWhisk") {
			return function(evt) {
				$(".overcover").remove();
				$(".cover").attr("opacity", 0);
				$(toolTip).hide();
			};
		} else if (shape === "seg") {
			return function(evt) {
				$(".overcover").remove();
				$(".cover").attr("opacity", 0);
				$(toolTip).hide();
			};
		} else if (shape === "calSquare") {
			return function(evt) {
				$(".cal-square-border").remove();
				$(toolTip).hide();
			};
		}
	}

	function drawHistElem(n, nCum, t, cat, totalX, totalY, width, timelineHour1="", timelineHour2="") {
		const box = document.createElementNS(NS, "rect");
		box.setAttribute("x", String((t + (1 - width) / 2) * SVG_SPACE / totalX) - 1);
		box.setAttribute("y", String(nCum * SVG_SPACE / totalY));

		/* + 1 ensure no gaps */
		box.setAttribute("width", String(width * SVG_SPACE / totalX + 1));
		box.setAttribute("height", String(n * SVG_SPACE / totalY + 1));
		box.setAttribute("fill", legend.info().cats[cat].colour);
		box.setAttribute("stroke-width", "0");
		box.setAttribute("pointer-events", "visible");
		box.setAttribute("data-n", String(n));
		box.setAttribute("data-ncum", String(nCum));
		box.setAttribute("data-t", String(t));
		box.setAttribute("data-cat", String(cat));
		box.setAttribute("data-totaly", String(totalY));
		box.setAttribute("data-y", String(nCum * SVG_SPACE / totalY));
		box.setAttribute("data-timeline-hour1", String(timelineHour1));
		box.setAttribute("data-timeline-hour2", String(timelineHour2));
		box.setAttribute("class", "hist");

		svg.appendChild(box);
	}

	function drawPieElem(n, nCum, cat) {
		const seg = document.createElementNS(NS, "path");

		/* - 0.05 to prevent gaps */
		seg.setAttribute("d", `
			M ${O_PIE * SVG_SPACE} ${O_PIE * SVG_SPACE}
			L ${pieCoord((nCum - n - 0.05) / HOURS_IN_DAY, SVG_SPACE).join(" ")}
			A ${R_PIE * SVG_SPACE} ${R_PIE * SVG_SPACE} 0 ${n > (HOURS_IN_DAY / 2) ? 1 : 0} 0 ${pieCoord(nCum / HOURS_IN_DAY, SVG_SPACE).join(" ")}
			Z`);
		seg.setAttribute("fill", legend.info().cats[cat].colour);
		seg.setAttribute("pointer-events", "visible");
		seg.setAttribute("data-cat", String(cat));
		seg.setAttribute("data-n", String(n));
		seg.setAttribute("data-frac", String((nCum - n / 2) / HOURS_IN_DAY));
		seg.setAttribute("class", "seg");

		svg.appendChild(seg);
	}

	function drawLineChart(cat, freqArr) {
		const line = document.createElementNS(NS, "polyline");
		const coords = [];

		/* Converting from pixels to units of svg */
		let line_pad = SVG_SPACE * LINE_PAD / elem("svg-container").getBoundingClientRect().width;

		freqArr.forEach((arr, t) => {
			if (t !== period.info().len()) { /* Truncates if necessary */
				let len = freqArr[t].reduce((a, b) => a + b, 0);
				let max_Y = yLimit * len / HOURS_IN_DAY;

				let x = line_pad + t * (SVG_SPACE - 2 * line_pad) / (period.info().len() - 1);
				let y = SVG_SPACE - arr[cat] * SVG_SPACE / max_Y;

				const dot = document.createElementNS(NS, "circle");
				dot.setAttribute("cx", String(x));
				dot.setAttribute("cy", String(y));
				dot.setAttribute("r", String(DOT_R));
				dot.setAttribute("fill", legend.info().cats[cat].colour);
				dot.setAttribute("pointer-events", "none");
				dot.setAttribute("data-t", String(t));
				dot.setAttribute("data-cat", String(cat));
				dot.setAttribute("visibility", "hidden");
				dot.setAttribute("class", "dot");

				svg.appendChild(dot);

				const padding = document.createElementNS(NS, "circle");
				padding.setAttribute("cx", String(x));
				padding.setAttribute("cy", String(y));
				padding.setAttribute("r", String(DOT_PADDING));
				padding.setAttribute("fill", legend.info().cats[cat].colour);
				padding.setAttribute("pointer-events", "all");
				padding.setAttribute("data-t", String(t));
				padding.setAttribute("data-n", String(arr[cat]));
				padding.setAttribute("data-cat", String(cat));
				padding.setAttribute("data-totaly", String(len));
				padding.setAttribute("visibility", "hidden");
				padding.setAttribute("class", "dot-padding");

				svg.appendChild(padding);

				coords[t] = `${x}
				${SVG_SPACE - freqArr[t][cat] * SVG_SPACE / max_Y}`;
			}
		});

		line.setAttribute("points", coords.join(" "));
		line.setAttribute("fill", "none");
		line.setAttribute("stroke", legend.info().cats[cat].colour);
		line.setAttribute("stroke-width", String(LINE_WIDTH));
		line.setAttribute("class", "line");
		line.setAttribute("data-cat", String(cat));

		svg.appendChild(line);
	}

	function drawBoxWhiskers(pos, cat, arr, visCats) {
		const WIDTH = 0.5;
		const PADDING = 14;

		const shape = document.createElementNS(NS, "g");
		shape.setAttribute("class", "box-whisk-whisk");
		shape.setAttribute("stroke-width", "3");
		shape.setAttribute("stroke-linecap", "square");
		shape.setAttribute("stroke-linejoin", "miter");
		shape.setAttribute("data-cat", String(cat));
		shape.setAttribute("pointer-events", "none");

		const boxUpper = document.createElementNS(NS, "rect");
		boxUpper.setAttribute("x", String((0.5 + pos - WIDTH * 0.5) * SVG_SPACE / visCats));
		boxUpper.setAttribute("y", String(SVG_SPACE - arr[3] * SVG_SPACE / yLimit));
		boxUpper.setAttribute("width", String(WIDTH * SVG_SPACE / visCats));
		boxUpper.setAttribute("height", String((arr[3] - arr[2]) * SVG_SPACE / yLimit));
		boxUpper.setAttribute("rx", 5);
		boxUpper.setAttribute("fill", legend.info().cats[cat].colour);
		boxUpper.setAttribute("class", "box-whisk-box");
		boxUpper.setAttribute("data-cat", String(cat));

		shape.appendChild(boxUpper);

		const boxUpper2 = document.createElementNS(NS, "rect");
		boxUpper2.setAttribute("x", String((0.5 + pos - WIDTH * 0.5) * SVG_SPACE / visCats));
		boxUpper2.setAttribute("y", String(5 + SVG_SPACE - arr[3] * SVG_SPACE / yLimit));
		boxUpper2.setAttribute("width", String(WIDTH * SVG_SPACE / visCats));
		boxUpper2.setAttribute("height", String((arr[3] - arr[2]) * SVG_SPACE / yLimit - 5));
		boxUpper2.setAttribute("fill", legend.info().cats[cat].colour);
		boxUpper2.setAttribute("class", "box-whisk-box");
		boxUpper2.setAttribute("data-cat", String(cat));

		shape.appendChild(boxUpper2);

		const lineMax = document.createElementNS(NS, "line");
		lineMax.setAttribute("x1", String((0.5 + pos - WIDTH * 0.5) * SVG_SPACE / visCats));
		lineMax.setAttribute("y1", String(SVG_SPACE - arr[4] * SVG_SPACE / yLimit));
		lineMax.setAttribute("x2", String((0.5 + pos + WIDTH * 0.5) * SVG_SPACE / visCats));
		lineMax.setAttribute("y2", String(SVG_SPACE - arr[4] * SVG_SPACE / yLimit));
		lineMax.setAttribute("stroke", legend.info().cats[cat].colour);
		lineMax.setAttribute("class", `max-${cat}`);

		shape.appendChild(lineMax);

		let min = arr[0];
		let max = arr[4];

		for (let i = 5; i < arr.length; ++i) {
			const circle = document.createElementNS(NS, "circle");
			circle.setAttribute("cx", String((0.5 + pos) * SVG_SPACE / visCats));
			circle.setAttribute("cy", String(SVG_SPACE - arr[i] * SVG_SPACE / yLimit));
			circle.setAttribute("r", "5");
			circle.setAttribute("fill", "transparent");

			shape.appendChild(circle);

			if (arr[i] > max) {
				max = arr[i];
			} else if (arr[i] < min) {
				min = arr[i];
			}
		}

		const whiskerMax = document.createElementNS(NS, "line");
		whiskerMax.setAttribute("x1", String((0.5 + pos) * SVG_SPACE / visCats));
		whiskerMax.setAttribute("y1", String(SVG_SPACE - arr[3] * SVG_SPACE / yLimit));
		whiskerMax.setAttribute("x2", String((0.5 + pos) * SVG_SPACE / visCats));
		whiskerMax.setAttribute("y2", String(SVG_SPACE - arr[4] * SVG_SPACE / yLimit));
		whiskerMax.setAttribute("stroke", legend.info().cats[cat].colour);

		shape.appendChild(whiskerMax);

		/* Bottom half */
		if (arr[2] > 0) {
			const boxLower = document.createElementNS(NS, "rect");
			boxLower.setAttribute("x", String((0.5 + pos - WIDTH * 0.5) * SVG_SPACE / visCats));
			boxLower.setAttribute("y", String(SVG_SPACE - arr[2] * SVG_SPACE / yLimit));
			boxLower.setAttribute("width", String(WIDTH * SVG_SPACE / visCats));
			boxLower.setAttribute("height", String((arr[2] - arr[1]) * SVG_SPACE / yLimit));
			boxLower.setAttribute("rx", arr[1] === 0 ? 0 : 5);
			boxLower.setAttribute("fill", shadeColour(legend.info().cats[cat].colour, -SHADE));
			boxLower.setAttribute("class", "box-whisk-box");
			boxLower.setAttribute("data-cat", String(cat));

			shape.appendChild(boxLower);

			const boxLower2 = document.createElementNS(NS, "rect");
			boxLower2.setAttribute("x", String((0.5 + pos - WIDTH * 0.5) * SVG_SPACE / visCats));
			boxLower2.setAttribute("y", String(SVG_SPACE - arr[2] * SVG_SPACE / yLimit));
			boxLower2.setAttribute("width", String(WIDTH * SVG_SPACE / visCats));
			boxLower2.setAttribute("height", String((arr[2] - arr[1]) * SVG_SPACE / yLimit - 5));
			boxLower2.setAttribute("fill", shadeColour(legend.info().cats[cat].colour, -SHADE));
			boxLower2.setAttribute("class", "box-whisk-box");
			boxLower2.setAttribute("data-cat", String(cat));

			shape.appendChild(boxLower2);

			const lineMin = document.createElementNS(NS, "line");
			lineMin.setAttribute("x1", String((0.5 + pos - WIDTH * 0.5) * SVG_SPACE / visCats));
			lineMin.setAttribute("y1", String(SVG_SPACE - arr[0] * SVG_SPACE / yLimit));
			lineMin.setAttribute("x2", String((0.5 + pos + WIDTH * 0.5) * SVG_SPACE / visCats));
			lineMin.setAttribute("y2", String(SVG_SPACE - arr[0] * SVG_SPACE / yLimit));
			lineMin.setAttribute("stroke", shadeColour(legend.info().cats[cat].colour, -SHADE));

			shape.appendChild(lineMin);

			const lineMedian = document.createElementNS(NS, "line");
			lineMedian.setAttribute("x1", String((0.5 + pos - WIDTH * 0.5) * SVG_SPACE / visCats));
			lineMedian.setAttribute("y1", String(SVG_SPACE - arr[2] * SVG_SPACE / yLimit));
			lineMedian.setAttribute("x2", String((0.5 + pos + WIDTH * 0.5) * SVG_SPACE / visCats));
			lineMedian.setAttribute("y2", String(SVG_SPACE - arr[2] * SVG_SPACE / yLimit));
			lineMedian.setAttribute("stroke", LIGHT_GREY);

			shape.appendChild(lineMedian);

			const whiskerMin = document.createElementNS(NS, "line");
			whiskerMin.setAttribute("x1", String((0.5 + pos) * SVG_SPACE / visCats));
			whiskerMin.setAttribute("y1", String(SVG_SPACE - arr[0] * SVG_SPACE / yLimit));
			whiskerMin.setAttribute("x2", String((0.5 + pos) * SVG_SPACE / visCats));
			whiskerMin.setAttribute("y2", String(SVG_SPACE - arr[1] * SVG_SPACE / yLimit));
			whiskerMin.setAttribute("stroke", shadeColour(legend.info().cats[cat].colour, -SHADE));

			shape.appendChild(whiskerMin);
		}

		const padding = document.createElementNS(NS, "rect");
		padding.setAttribute("x", String((0.5 + pos - WIDTH * 0.5) * SVG_SPACE / visCats) - PADDING);
		padding.setAttribute("y", String(SVG_SPACE - max * SVG_SPACE / yLimit - PADDING));
		padding.setAttribute("width", String(2 * PADDING + WIDTH * SVG_SPACE / visCats));
		padding.setAttribute("height", String((max - min) * SVG_SPACE / yLimit + 2 * PADDING + LINE_WIDTH));
		padding.setAttribute("opacity", "0");
		padding.setAttribute("class", "box-whisk");
		padding.setAttribute("data-cat", String(cat));
		padding.setAttribute("data-arr", String(arr));
		padding.setAttribute("pointer-events", "all");

		shape.appendChild(padding);

		svg.appendChild(shape);
	}

	let calHelper = [];

	const PAD_LR = 4;
	const PAD_TB = 4;
	const GRID_SIZE = 54 + 2 * PAD_TB;
	const CAL_SIZE = SVG_SPACE / GRID_SIZE;

	const MAX_SHADE = 0.5;

	/* n = -1 means the day hasn't happened yet */
	function drawCalendar(year, m, dayOfMonth, cat, day, n, leap, week, min, max) {
		let dayOfWeek = getWeekDay(day);

		/* Gradient with minimum = white, maximum ~ MAX_SHADE */
		const activeColour = shadeColour(legend.info().cats[cat].colour, ((1 + MAX_SHADE) * n - max - MAX_SHADE * min) / (min - max));
		const inactiveColour = "rgba(0, 0, 0, 0)";

		let spaceInBetween = (GRID_SIZE - 2 * PAD_LR - 7 * PERIODS.year.len(false)) / (PERIODS.year.len(false) - 1);

		let x = (PAD_LR + (year * (DAYS_IN_WEEK + spaceInBetween)) + dayOfWeek) * CAL_SIZE;
		let y = (PAD_TB + week) * CAL_SIZE;

		const box = document.createElementNS(NS, "rect");

		box.setAttribute("x", String(x));
		box.setAttribute("y", String(y));

		box.setAttribute("width", String(CAL_SIZE + 1));
		box.setAttribute("height", String(CAL_SIZE + 1));
		box.setAttribute("fill", n < 0 ? inactiveColour : activeColour);
		box.setAttribute("pointer-events", n < 0 ? "none" : "visible");
		box.setAttribute("class", "calSquare");
		box.setAttribute("data-t", String(day));
		box.setAttribute("data-n", String(n));
		box.setAttribute("data-x", String(x));
		box.setAttribute("data-y", String(y));

		svg.appendChild(box);

		/* calHelper[x][0]: Coordinates of the upper left corner of the first day of month
		 * calHelper[x][1]: First day of month (0 (Monday) -> 6 (Sunday))
		 * calHelper[x][2]: Last Sunday of month (0 indexed)
		 * calHelper[x][3]: Last day of month (0 indexed)
		 * calHelper[x][4]: First Monday of month (0 indexed)
		 */

		if (dayOfMonth === 0) {
			calHelper[m][0] = [x, y];
			calHelper[m][1] = dayOfWeek;

			calHelper[m][2] = 0;
		}

		if (dayOfWeek === 6) {
			if (dayOfMonth > calHelper[m][2]) {
				calHelper[m][2] = dayOfMonth;
			}
		}

		if (dayOfMonth === MONTHS[m].len(leap) - 1) {
			calHelper[m][3] = dayOfWeek;
		}

		if (dayOfWeek === 0 && !Number.isInteger(calHelper[m][4])) {
			calHelper[m][4] = dayOfMonth;
		}
	}

	function calendarMonthDesign(year, lastMonth) {
		let spaceInBetween = (GRID_SIZE - 2 * PAD_LR - 7 * PERIODS.year.len(false)) / (PERIODS.year.len(false) - 1);
		const text = document.createElementNS(NS, "text");
		text.setAttribute("x", String((3.5 + PAD_LR + (year * (DAYS_IN_WEEK + spaceInBetween))) * CAL_SIZE));
		text.setAttribute("y", String((GRID_SIZE - 1) * CAL_SIZE));
		text.setAttribute("text-anchor", "middle");
		text.setAttribute("font-size", "36");

		text.textContent = String(START_DATE[0] + year);
		svg.appendChild(text);
		/* Draws all month borders */
		for (let i = 0; i < lastMonth + 1; ++i) {
			const border = document.createElementNS(NS, "path");
			border.setAttribute("stroke", DARK_GREY);
			border.setAttribute("stroke-width", 2);
			border.setAttribute("stroke-linejoin", "miter");
			border.setAttribute("fill", "transparent");
			border.setAttribute("pointer-events", "none");
			border.setAttribute("d", `
				M ${calHelper[i][0][0]} ${calHelper[i][0][1]}
				h ${(7 - calHelper[i][1]) * CAL_SIZE}
				v ${(1 + (calHelper[i][2] - 6 + calHelper[i][1]) / 7) * CAL_SIZE}
				h ${(calHelper[i][3] - 6) * CAL_SIZE}
				v ${(calHelper[i][3] === 6 ? 0 : 1) * CAL_SIZE}
				h ${(-1 - calHelper[i][3]) * CAL_SIZE}
				v ${((calHelper[i][4] - calHelper[i][2] - 1) / 7 - (calHelper[i][3] === 6 ? 0 : 1)) * CAL_SIZE}
				h ${calHelper[i][1] * CAL_SIZE}
				z`);
			svg.appendChild(border);
		}
	}

	function drawGrid() {
		let lineLimit;

		if (type.is("hist")) {
			lineLimit = HOURS_IN_DAY;
		} else if (type.is("hourHist")) {
			lineLimit = 10;
		} else if (type.is("line") || type.is("boxWhisk")) {
			lineLimit = yLimit;
		} else {
			return;
		}

		for (let i = 1; i <= lineLimit; ++i) {
			const line = document.createElementNS(NS, "line");
			line.setAttribute("x1", "0");
			line.setAttribute("y1", String(SVG_SPACE - i * SVG_SPACE / lineLimit));
			line.setAttribute("x2", String(SVG_SPACE));
			line.setAttribute("y2", String(SVG_SPACE - i * SVG_SPACE / lineLimit));
			line.setAttribute("stroke", "#cccccc");

			svg.appendChild(line);
		}
	}

	function drawAxisLabels() {
		const vertLabel = elem("vert-label");
		const horLabel = elem("horiz-label");
		const vertScaleContainer = elem("vert-scale-container");
		const horScaleContainer = elem("hor-scale-container");
		const svgContainer = elem("svg-container");
		const span = [];

		let svgBox = svgContainer.getBoundingClientRect();

		vertScaleContainer.innerHTML = "";
		horScaleContainer.innerHTML = "";

		if (type.is("hist") || type.is("line") || type.is("timelineHour") || type.is("boxWhisk") || type.is("hourHist")) {
			let scaleTicks;

			if (type.is("hist")) {
				vertLabel.innerText = "Hours/day";
				vertLabel.style.left = `${-68}px`;

				scaleTicks = HOURS_IN_DAY;
			} if (type.is("timelineHour")) {
				vertLabel.innerText = "Hour";
				vertLabel.style.left = `${-65}px`;

				scaleTicks = HOURS_IN_DAY;
			} else if (type.is("line")) {
				vertLabel.innerText = "Hours/day";
				vertLabel.style.left = `${-68}px`;

				scaleTicks = yLimit;
			} else if (type.is("boxWhisk")) {
				vertLabel.innerText = `Hours${period.is("day") ? "" : "/day"}`;
				vertLabel.style.left = `${period.is("day") ? -53 : -68}px`;

				scaleTicks = yLimit;
			} else if (type.is("hourHist")) {
				vertLabel.innerText = "Percent";
				vertLabel.style.left = `${-59}px`;

				scaleTicks = 10;
			}

			for (let i = 0; i < scaleTicks + 1; ++i) {
				/* Maximum height of horizontal axis labels. Includes some padding. */
				const MAX_SPAN = 20;

				if (scaleTicks >= svgBox.height / MAX_SPAN && i % 2) {
					continue;
				}

				if ((scaleTicks / 2) >= svgBox.height / MAX_SPAN && (i / 2) % 2) {
					continue;
				}

				span[i] = document.createElement("span");
				let tick = document.createElement("div");

				vertScaleContainer.appendChild(span[i]);
				vertScaleContainer.appendChild(tick);

				if (type.is("hourHist")) {
					span[i].innerText = `${i * 10}`;
				} else if (type.is("timelineHour")) {
					let hour = 24 - i
					span[i].innerText = `${hour < 10 ? "0" : ""}${hour}:00`;
				} else {
					span[i].innerText = `${i}`;
				}

				/* 2 is substracted to account for the chart border */
				span[i].style.bottom = `${i * (svgBox.height - 2) / scaleTicks - span[i].offsetHeight / 2}px`;
				span[i].style.right = "7px";

				tick.style.bottom = `${i * (svgBox.height - 2) / scaleTicks - 1 - (i === scaleTicks ? 1 : 0)}px`;
				tick.style.left = "-5px";

				/* We need to line up the last tick with the chart border */
				if (i === scaleTicks) {
					/* 0.66 is substracted to account for the chart border */
					span[i].style.bottom = `${i * (svgBox.height - 0.33) / scaleTicks - span[i].offsetHeight / 2}px`;
					tick.style.bottom = `${i * (svgBox.height - 0.33) / scaleTicks - 1 - (i === scaleTicks ? 1 : 0)}px`;
				}
			}
		} else if (type.is("pie") || type.is("calendar")) {
			vertLabel.innerText = "";
			vertLabel.style.left = "";
		}

		if (type.is("hist") || type.is("line") || type.is("timelineHour")) {
			horLabel.innerText = period.info().name;

			if (period.is("weekday")) {
				for (let i = 0; i < DAYS_IN_WEEK; ++i) {
					span[i] = document.createElement("span");
					let tick = document.createElement("div");

					horScaleContainer.appendChild(span[i]);
					horScaleContainer.appendChild(tick);

					span[i].innerText = svgBox.width > 380 ?
						getWeekDayLabel(i) : getWeekDayLabel(i).slice(0, 3);

					span[i].style.bottom = `-${span[i].offsetHeight}px`;
					span[i].style.left = `${(i + 0.5) * svgBox.width / DAYS_IN_WEEK - span[i].offsetWidth / 2}px`;

					tick.style.bottom = "-5px";
					tick.style.left = `${(i + 0.5) * svgBox.width / DAYS_IN_WEEK}px`;
				}
			} else {
				/* The maximum width of a horizontal axis label */
				const MAX_SPAN = 60;
				let scaleTicks = period.is("year") ? 2 : Math.ceil(svgBox.width / MAX_SPAN);
				for (let i = 0; i < scaleTicks; ++i) {
					span[i] = document.createElement("span");
					let tick = document.createElement("div");

					horScaleContainer.appendChild(span[i]);
					horScaleContainer.appendChild(tick);

					let sum = 0;
					for (let i = 0; i < period.info().len(); ++i) {
						sum += period.info().days(i);
					}

					const date = new Date(
						START_DATE[0],
						START_DATE[1],
						START_DATE[2] + PERIODS.week.offset + Math.floor(i * sum / (scaleTicks - 1))
					);

					span[i].innerText = `${period.is("year") ? "" : MONTHS[date.getMonth()].name.slice(0, 3)+ " "}${date.getFullYear()}`;

					span[i].style.bottom = `-${span[i].offsetHeight}px`;

					let padding = type.is("line") ? LINE_PAD : 0;
					let x = padding + i * (svgBox.width - 2 * padding) / (scaleTicks - 1);
					span[i].style.left = `${x - span[i].offsetWidth / 2}px`;

					tick.style.bottom = "-5px";
					tick.style.left = `${x}px`;
				}
			}
		} else if (type.is("hourHist")) {
			horLabel.innerText = "Hour";

			span[0] = document.createElement("span");
		} else if (type.is("boxWhisk")) {
			horLabel.innerText = "Category";

			span[0] = document.createElement("span");
		} else if (type.is("pie") || type.is("calendar")) {
			horLabel.innerText = "";

			span[0] = document.createElement("span");
		}

		vertLabel.style.top = `${svgBox.height / 2 - vertLabel.offsetHeight / 2}px`;
		horLabel.style.bottom = `-${horLabel.offsetHeight + span[0].offsetHeight}px`;

		/* The rounding hides a bug where the offsetWidth of horLabel is not consistent */
		horLabel.style.left = `${Math.round(svgBox.width / 2 - horLabel.offsetWidth / 2)}px`;

		elem("svg-container-shadow").style.boxShadow = type.info().noAxes ? "inset 0 2.5px 1px -1px rgba(0, 0, 0, 0.2)" : "inset 1.5px 1.5px 1px 0 rgba(0, 0, 0, 0.2)";

		svgContainer.style.borderLeft = type.info().noAxes ? "none" : `0.66px solid ${DARK_GREY}`;
		svgContainer.style.borderBottom = type.info().noAxes ? "none" : `0.66px solid ${DARK_GREY}`;

	}

	function isolateChart() {
		if (type.is("hist") || type.is("hourHist")) {
			$(".hist").attr("visibility", "hidden");
			$(`.hist[data-cat = ${selected.get()}]`).each((idx, elem) => {
				let height = elem.getAttribute("height");
				elem.setAttribute("y", `${SVG_SPACE - height}`);
				elem.setAttribute("visibility", "visible");
			});
		} else if (type.is("line")) {
			$(`.line:not([data-cat = ${selected.get()}])`).attr("visibility", "hidden");
			$(`.dot-padding:not([data-cat = ${selected.get()}])`).attr("pointer-events", "all");
		} else if (type.is("calendar")) {
			draw();
		}
	}

	function unisolateChart(cat) {
		if (type.is("hist") || type.is("hourHist")) {
			$(`.hist[data-cat = ${cat}]`).each((idx, elem) => {
				elem.setAttribute("y", elem.dataset.y);
			});
			$(".hist").attr("visibility", "visible");
		} else if (type.is("line")) {
			$(".line").attr("visibility", "visible");
			$(".dot-padding").attr("pointer-events", "all");
		} else if (type.is("calendar")) {
			draw();
		}
	}

	/* https://stackoverflow.com/a/2450976/6536036 */
	function shuffle(array) {
		var currentIndex = array.length, temporaryValue, randomIndex;

		/* While there remain elements to shuffle... */
		while (0 !== currentIndex) {

			/* Pick a remaining element... */
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex -= 1;

			/* And swap it with the current element. */
			temporaryValue = array[currentIndex];
			array[currentIndex] = array[randomIndex];
			array[randomIndex] = temporaryValue;
		}

		return array;
	}

	function draw() {
		$(svg).empty();
		drawGrid();
		let chartData = getData();

		if (type.is("hist")) {
			for (let i = 0; i < period.info().len(); ++i) {
				let counter;

				counter = 0;

				let len = chartData[i].reduce((a, b) => a + b, 0);

				chartData[i].forEach((n, cat) => {
					if (n) {
						drawHistElem(
							n,
							counter,
							period.is("weekday") ? getWeekDay(i) : i,
							cat,
							period.info().len(),
							len,
							period.info().name === "Weekday" ? 0.6 : 1
						);
						counter += n;
					}
				});
			}
			pointer.hover(".hist", mouseEnter("hist"), mouseLeave("hist"));
		} else if (type.is("timelineHour")) {
			for (let i = 0; i < period.info().len(true); ++i) {
				for (let j = 0; j < HOURS_IN_DAY; ++j) {
					let arr = chartData[i][j];
					let indices = shuffle([...Array(arr.length).keys()]);

					arr.forEach((cat, day) => {
						drawHistElem(
							1,
							j * arr.length + indices[day],
							i,
							cat,
							period.info().len(),
							HOURS_IN_DAY * arr.length,
							1,
							period.info().offset + i * DAYS_IN_WEEK + day, /* Assumes that the period is week */
							j
						);
					});
				}
			}
			pointer.hover(".hist", mouseEnter("hist"), mouseLeave("hist"));
		} else if (type.is("line")) {
			for (let i = 0; i < legend.info().len; ++i) {
				drawLineChart(i, chartData);
			}
			pointer.hover(".dot-padding", mouseEnter("dot"), mouseLeave("dot"));
		} else if (type.is("hourHist")) {
			if (period.is("weekday")) {
				let j = getWeekDay(scroll.get());

				for (let i = 0; i < HOURS_IN_DAY; ++i) {
					let counter;

					counter = 0;

					let totalY = chartData[j][i].reduce((a, b) => a + b, 0);

					chartData[j][i].forEach((n, cat) => {
						if (n) {
							drawHistElem(n, counter, i, cat, HOURS_IN_DAY, totalY, 1);
							counter += n;
						}
					});
				}
			} else {
				let m = period.is("year") ? scroll.get() : 0;
				chartData[m].forEach((arr, i) => {
					let counter;

					counter = 0;

					let totalY = arr.reduce((a, b) => a + b, 0);

					arr.forEach((n, cat) => {
						if (n) {
							drawHistElem(n, counter, i, cat, HOURS_IN_DAY, totalY, 1);
							counter += n;
						}
					});
				});
			}
			pointer.hover(".hist", mouseEnter("hist"), mouseLeave("hist"));
		} else if (type.is("boxWhisk")) {
			const indices = type.info().sort();

			chartData.forEach((arr, cat) => {
				drawBoxWhiskers(indices.indexOf(cat), cat, arr, legend.info().len);
			});
			pointer.hover(".box-whisk", mouseEnter("boxWhisk"), mouseLeave("boxWhisk"));
		} else if (type.is("pie")) {
			let m = period.is("year") ? scroll.get() : 0;

			let aves = chartData[m][0];

			let counter;

			counter = 0;

			chartData[m][1].forEach((cat, pos) => {
				counter += aves[cat];
				drawPieElem(aves[cat], counter, cat, period.info().len());
			});
			pointer.hover(".seg", mouseEnter("seg"), mouseLeave("seg"));
		} else if (type.is("calendar")) {
			let min = 24;
			let max = 0;
			for (let i = PERIODS.year.start(0); i < noDays; ++i) {
				if (chartData[i][selected.get()] < min) {
					min = chartData[i][selected.get()];
				} else if (chartData[i][selected.get()] > max) {
					max = chartData[i][selected.get()];
				}
			}

			for (let year = 0; year < PERIODS.year.len(false); ++year) {
				let m = 0;
				let dayOfMonth = 0;

				let leap = !((year + 1) % 4);

				let week = 0;

				for (let m = 0; m < MONTHS_IN_YEAR; ++m) {
					calHelper[m] = new Array(5);
				}

				for (let i = PERIODS.year.start(year);
					i < PERIODS.year.start(year + 1) && (i < noDays || dayOfMonth !== MONTHS[m].len(leap));
					++i, ++dayOfMonth) {

					if (i !== PERIODS.year.start(year) && getWeekDay(i) === 0) {
						++week;
					}

					if (dayOfMonth === MONTHS[m].len(leap)) {
						dayOfMonth = 0;
						m = m + 1 % MONTHS_IN_YEAR;
					}

					drawCalendar(
						year,
						m,
						dayOfMonth,
						selected.get(),
						i,
						i < period.info().len() ? chartData[i][selected.get()] : -1,
						leap,
						week,
						min,
						max
					);
				}

				calendarMonthDesign(year, m);
			}
			pointer.hover(".calSquare", mouseEnter("calSquare"), mouseLeave("calSquare"));
		}

		drawAxisLabels();
		$(toolTip).hide();

		/* Used for setting opacity of the chart */
		cover = document.createElementNS(NS, "rect");

		cover.setAttribute("x", 0);
		cover.setAttribute("y", 0);
		cover.setAttribute("width", SVG_SPACE);
		cover.setAttribute("height", SVG_SPACE);
		cover.setAttribute("fill", LIGHT_GREY);
		cover.setAttribute("opacity", 0);
		cover.setAttribute("class", "cover");
		cover.setAttribute("pointer-events", "none");

		svg.appendChild(cover);
	}

	return {
		draw,
		drawAxisLabels,
		isolateChart,
		setYLimit,
		unisolateChart
	};
})();

let locked;

const chart = (() => {

	/* Draws the chart, selecting a category if necessary */
	function drawChart() {
		graphics.draw();
		if (locked) {
			graphics.isolateChart();
			isolateVisual();
		}
	}

	/* This "visual" function deal with the legend visual effects */
	function isolateVisual() {
		let cat = selected.get();
		$(`.legend-button[data-cat = ${cat}]`).css({
			"background-color": legend.info().cats[cat].colour,
			"color": LIGHT_GREY
		});
		$(`.legend-button[data-cat = ${cat}] .legend-square`).css("background-color", LIGHT_GREY);
	}

	function highlightVisual(cat) {
		$(`.legend-button[data-cat = ${cat}]`).css({
			"background-color": shadeColour(legend.info().cats[cat].colour, 0.75),
			"color": ""
		});
		$(`.legend-button[data-cat = ${cat}] .legend-square`).css("background-color", legend.info().cats[cat].colour);
	}

	function normalVisual(cat) {
		$(`.legend-button[data-cat = ${cat}]`).css({
			"background-color": LIGHT_GREY,
			"color": ""
		});
		$(`.legend-button[data-cat = ${cat}] .legend-square`).css("background-color", legend.info().cats[cat].colour);
	}

	function legendClick(evt) {
		let cat = Number(evt.target.dataset.cat);

		/* If the chart cannot be isolated */
		if (type.info().notIsolate) {
			return;
		}

		/* If the chart is isolated on the selected category */
		if (locked && selected.get() === cat) {
			if (type.info().onlyIsolate) {
				return;
			}

			if(!(matchMedia("(hover: none)").matches)) {
				highlightVisual(cat);
			} else {
				normalVisual(cat);
			}

			graphics.unisolateChart(cat);

			locked = false;
		} else {

			/* If the chart is isolated on a different category */
			if (locked) {
				normalVisual(selected.get());

				graphics.unisolateChart(selected.get());
			}

			selected.set(cat);
			isolateVisual();
			locked = true;
			graphics.isolateChart();
		}
	}

	/* Creates sorted legend */
	function createLegend() {
		elem("legend-container").innerHTML = "";

		let indices = type.info().sort();

		if (!indices) {
			indices = [];
			for (let i = 0; i < legend.info().len; ++i) {
				indices[i] = i;
			}
		}

		for (let i = 0; i < legend.info().len; ++i) {
			const button = document.createElement("div");
			const square = document.createElement("div");
			const label = document.createElement("span");

			button.dataset.cat = indices[i];
			button.className = "legend-button";

			/* 27 is left padding and button width. 8 is right padding */
			button.style.width = `${27 + legend.info().maxLabelWidth + 8}px`;

			square.className = "legend-square";
			square.style.background = legend.info().cats[indices[i]].colour;

			label.className = "legend-label";
			label.innerText = legend.info().cats[indices[i]].name;

			button.appendChild(square);
			button.appendChild(label);
			elem("legend-container").appendChild(button);
		}
		/*
		if(!(matchMedia("(hover: none)").matches)) {
			$(".legend-button").hover(legendEnter, legendLeave);
		} else {
			$(".legend-button").on("touchstart", (evt) => {
				legendEnter(evt);
				evt.preventDefault();
			});
			$(".legend-button").on("touchend touchcancel", (evt) => {
				legendLeave(evt);
				evt.preventDefault();
			});
		}*/

		pointer.hover(".legend-button", legendEnter, legendLeave);

		pointer.click(".legend-button", legendClick);

		if (type.info().notIsolate) {
			$(".legend-button").removeClass("legend-clickable");
		} else {
			$(".legend-button").addClass("legend-clickable");
			if (type.info().onlyIsolate) {
				$(`.legend-button[data-cat = ${selected.get()}]`).removeClass("legend-clickable");
			}
		}
	}

	function legendEnter(evt) {
		let cat = Number(evt.target.dataset.cat);

		if (type.info().notIsolate) {
			return;
		}

		if (locked && selected.get() === cat) {
			$(`.legend-button[data-cat = ${cat}]`).css("background-color", shadeColour(legend.info().cats[cat].colour, 0.2));
		} else {
			highlightVisual(cat);
		}
	}

	function legendLeave(evt) {
		let cat = Number(evt.target.dataset.cat);

		if (type.info().notIsolate) {
			return;
		}

		if (locked && selected.get() === cat) {
			$(`.legend-button[data-cat = ${cat}]`).css("background-color", legend.info().cats[cat].colour);
		} else {
			normalVisual(cat);
		}
	}

	function showHideScroll() {
		$(".scroll-container").css("visibility", "hidden");

		scroll.set(0);

		if (type.info().scroll()) {
			$(".scroll-container").css("visibility", "visible");

			$(".scroll-left").removeClass("scroll-disabled");
			$(".scroll-right").removeClass("scroll-disabled");

			$(".scroll-label").css("width", `${type.info().scroll().labelWidth}px`);
			elem("scroll-label").innerText = type.info().scroll().label(scroll.get());

			if (type.info().scroll().lowerLimit() === 0) {
				$(".scroll-left").addClass("scroll-disabled");
			}

			if (type.info().scroll().upperLimit() === 0) {
				$(".scroll-right").addClass("scroll-disabled");
			}
		}
	}

	function legendLayout() {
		let legendCont = elem("legend-container");

		if (window.matchMedia("(min-width: 576px)").matches) {
			let positionTop = elem("eh-header-container").getBoundingClientRect().height
				+ Number($(".eh-header-container").css("margin-bottom").slice(0, -2))
				+ Number($(".svg-container").css("margin-top").slice(0, -2));

			positionTop += (elem("chart-svg").getBoundingClientRect().height - legendCont.getBoundingClientRect().height) / 2;
			legendCont.style.top = `${positionTop}px`;
		} else {
			legendCont.style.top = "0";
		}
	}

	/* x = 1 or -1 */
	function scrollStep(x) {
		scroll.set(scroll.get() + x);
		$(".scroll-left").removeClass("scroll-disabled");
		$(".scroll-right").removeClass("scroll-disabled");

		if (scroll.get() === type.info().scroll().lowerLimit()) {
			$(".scroll-left").addClass("scroll-disabled");
		}

		if (scroll.get() === type.info().scroll().upperLimit()) {
			$(".scroll-right").addClass("scroll-disabled");
		}

		elem("scroll-label").innerText = type.info().scroll().label(scroll.get());

		createLegend();

		drawChart();
	}

	function settingsInit() {
		legend.change = (id) => {
			legend.set(id);

			if (type.info()) {
				/* Unlocks the chart */
				locked = false;
				selected.set("");

				if (type.info().onlyIsolate) {
					$(`.legend-button[data-cat = 0]`).css({
						"background-color": legend.info().cats[0].colour,
						"color": LIGHT_GREY
					});
					$(`.legend-button[data-cat = 0] .legend-square`).css("background-color", LIGHT_GREY);
					locked = true;
					selected.set(0);
				}

				createLegend();
				legendLayout();
			}

			graphics.setYLimit();

			$(".key-select div").removeClass("select-selected");
			$(`.key-select div[data-legend = ${id}]`).addClass("select-selected");
		};

		truncate.change = (bool) => {
			truncate.set(bool);

			showHideScroll();

			if (bool) {
				$(".truncate").removeClass("checked");
			} else {
				$(".truncate").addClass("checked");
			}

			if (type.info().scroll() && type.info().scroll().truncate) {
				if (bool) {
					if (scroll.get() === type.info().scroll().upperLimit()) {
						$(".scroll-right").addClass("scroll-disabled");
					} else if (scroll.get() === type.info().scroll().upperLimit() + 1) {
						scrollStep(-1);
					}
				} else {
					if (scroll.get() === type.info().scroll().upperLimit() - 1) {
						$(".scroll-right").removeClass("scroll-disabled");
					}
				}
			}
		};

		type.change = (id) => {
			type.set(id);

			$(".period-select .select-option").addClass("select-disabled");
			$.each(type.info().period, (i, val) => {
				$(`.period-select div[data-period = ${val}]`).removeClass("select-disabled");
			});

			if (type.info().period.length <= 1) {
				$(".period-container").addClass("menu-disabled");
			} else {
				$(".period-container").removeClass("menu-disabled");
			}

			$(".period-select hr").css("display", type.info().period.includes("weekday") ? "block" : "none");

			period.set(type.info().defPeriod);
			$(".period-select div").removeClass("select-selected");
			$(`.period-select div[data-period = ${type.info().defPeriod}]`).addClass("select-selected");

			/* Unlocks the chart */
			locked = false;
			selected.set("");

			if (type.info().onlyIsolate) {
				$(`.legend-button[data-cat = 0]`).css({
					"background-color": legend.info().cats[0].colour,
					"color": LIGHT_GREY
				});
				$(`.legend-button[data-cat = 0] .legend-square`).css("background-color", LIGHT_GREY);
				locked = true;
				selected.set(0);
			}

			createLegend();

			showHideScroll();
			showHideSettings();
			graphics.setYLimit();
			if (type.info().infoText) {
				type.info().infoText.genModal(elem("info-modal-content"));
			}


			$(".type-select div").removeClass("select-selected");
			$(`.type-select div[data-type = ${id}]`).addClass("select-selected");
		};

		period.change = (id) => {
			period.set(id);

			showHideScroll();

			createLegend();

			$(".period-select div").removeClass("select-selected");
			$(`.period-select div[data-period = ${id}]`).addClass("select-selected");

			showHideSettings();
			graphics.setYLimit();
		};
	}

	function showHideSettings() {
		elem("truncate-container").style.display = type.info().notTrunc || period.info().notTrunc ? "none" : "block";
		elem("reload").style.display = !type.info().reload ? "none" : "block";
		elem("info").style.display = !type.info().infoText ? "none" : "block";

		if ((type.info().notTrunc || period.info().notTrunc) && !type.info().reload && !type.info().infoText) {
			$(".settings-container").addClass("menu-disabled");
		} else {
			$(".settings-container").removeClass("menu-disabled");
		}
	}

	function init() {
		settingsInit();

		legend.change(defaultChart[0]);
		type.change(defaultChart[1]);
		period.change(defaultChart[2]);
		truncate.change(defaultChart[3]);

		/* The following functions need to be called again */
		createLegend();
		legendLayout();

		pointer.click(".type-select div", (evt) => {
			if (!$(evt.target).hasClass("select-selected")) {
				type.change(evt.target.dataset.type);

				drawChart();

				menu.exitMenu();
			}
		});

		pointer.hover(".type-select div", (evt) => {
			if (!$(evt.target).hasClass("select-selected")) {
				$(evt.target).addClass("select-option-clickable");
			}
		}, (evt) => {
			$(evt.target).removeClass("select-option-clickable");
		});

		pointer.click(".period-select div", (evt) => {
			if (!$(evt.target).hasClass("select-selected")) {
				period.change(evt.target.dataset.period);

				drawChart();

				menu.exitMenu();
			}
		});

		pointer.hover(".period-select div", (evt) => {
			if (!$(evt.target).hasClass("select-selected")) {
				$(evt.target).addClass("select-option-clickable");
			}
		}, (evt) => {
			$(evt.target).removeClass("select-option-clickable");
		});

		pointer.click(".scroll-left", (evt) => {
			if (!$(evt.target).hasClass("scroll-disabled")) {
				scrollStep(-1);
			}
		});

		pointer.hover(".scroll-left", (evt) => {
			if (!$(evt.target).hasClass("scroll-disabled")) {
				$(evt.target).addClass("scroll-clickable");
			}
		}, (evt) => {
			$(evt.target).removeClass("scroll-clickable");
		});

		pointer.click(".scroll-right", (evt) => {
			if (!$(evt.target).hasClass("scroll-disabled")) {
				scrollStep(1);
			}
		});

		pointer.hover(".scroll-right", (evt) => {
			if (!$(evt.target).hasClass("scroll-disabled")) {
				$(evt.target).addClass("scroll-clickable");
			}
		}, (evt) => {
			$(evt.target).removeClass("scroll-clickable");
		});

		pointer.click(".truncate", (evt) => {
			truncate.change($(evt.target).hasClass("checked"));

			drawChart();

			menu.exitMenu();
		});

		pointer.hover(".truncate", (evt) => {
			$(evt.target).addClass("sett-button-clickable");
		}, (evt) => {
			$(evt.target).removeClass("sett-button-clickable");
		});

		pointer.click(".key-select div", (evt) => {
			if (!$(evt.target).hasClass("select-selected")) {
				legend.change(evt.target.dataset.legend);

				drawChart();

				menu.exitMenu();
			}
		});

		pointer.hover(".key-select div", (evt) => {
			if (!$(evt.target).hasClass("select-selected")) {
				$(evt.target).addClass("select-option-clickable");
			}
		}, (evt) => {
			$(evt.target).removeClass("select-option-clickable");
		});

		pointer.click(".info", (evt) => {
			$(".info-modal").show();
			$(".info-modal-overlay").show();

			menu.exitMenu();
		});

		pointer.hover(".info", (evt) => {
			$(evt.target).addClass("select-option-clickable");
		}, (evt) => {
			$(evt.target).removeClass("select-option-clickable");
		});

		pointer.click(".close-info", (evt) => {
			$(".info-modal").hide();
			$(".info-modal-overlay").hide();
		});

		pointer.hover(".close-info", (evt) => {
			$(evt.target).addClass("close-info-clickable");
		}, (evt) => {
			$(evt.target).removeClass("close-info-clickable");
		});

		pointer.click(".reload", (evt) => {
			drawChart();

			menu.exitMenu();
		});

		pointer.hover(".reload", (evt) => {
			$(evt.target).addClass("select-option-clickable");
		}, (evt) => {
			$(evt.target).removeClass("select-option-clickable");
		});

		window.addEventListener("resize", (evt) => {
			legendLayout();
			graphics.drawAxisLabels();
		});

		drawChart();
	}

	return init;
})();

/* This function improves menu navigation by keeping the menus open when the cursor is in between the button and the menu */
let menu = (() => {
	let safe = false;
	let lock = "";
	let enterMenuContent = false;
	let inOtherButton = false;

	function exitMenu() {
		$(".menu-content").hide();
		$(".hide-border").hide();
		$(".menu-button").removeClass("menu-visible");
		$(".menu-button").removeClass("menu-locked");
		$(document).unbind("mousemove");
		safe = false;
	}

	function enterMenu(container, hover=true) {
		safe = true;
		$(container.children[1]).show();
		$(container.children[0]).addClass("menu-visible");

		if (hover) {
			$(document).mousemove(safeZone(container));
		} else {
			$(container.children[0]).addClass("menu-locked");
		}
	}

	function safeZone(container) {
		return function(evt2) {
			if (lock) {
				return;
			}

			let buttonRect = container.children[0].getBoundingClientRect();

			let inButton = evt2.clientY + 1 >= buttonRect.top
				&& evt2.clientX - 1 <= buttonRect.right
				&& evt2.clientY - 5 <= buttonRect.bottom /* We use 5 here for Edge */
				&& evt2.clientX + 1 >= buttonRect.left;

			safe = inButton || enterMenuContent;

			if (!safe) {
				exitMenu();
				if (inOtherButton) {
					hoverButton(inOtherButton);
				}
			}

			inOtherButton = "";
		};
	}

	function hoverButton(evt) {
		let container = evt.target.parentElement;
		if ($(container).hasClass("menu-disabled") || lock) {
			return;
		}

		if (safe) {
			inOtherButton = evt;
		} else {
			exitMenu();
			enterMenu(container);
		}
	}

	function menuEvents() {
		if (matchMedia("(hover: none)").matches) {
			$(".menu-button").click((evt) => {
				if ($(evt.target.parentElement).hasClass("menu-disabled")) {
					return;
				}
				let newlock;

				if (lock) {
					exitMenu();
					$(".menu-button").removeClass("menu-locked");
					newlock = "";
				}
				if (!lock || evt.target.parentElement.dataset.cont !== lock) {
					enterMenu(evt.target.parentElement, false);
					newlock = evt.target.parentElement.dataset.cont;
				}

				lock = newlock;
			});
		} else {
			$(".menu-button").mousemove(hoverButton);
		}

		$("body").click((evt) => {
			if (lock && !$(evt.target).parents(`.${lock}-container`).length) {
				exitMenu();
				$(".menu-button").removeClass("menu-locked");
				lock = "";
			}
		});
		$(".menu-content").hover((evt) => {
				enterMenuContent = true;
			}, (evt) => {
				enterMenuContent = false;
			});
	}

	return {
		menuEvents,
		exitMenu
	};
})();

function createSettings() {
	function setting(obj) {
		if (obj) {
			return () => {
				let prop;

				return {
					"is": (id) => prop === id,
					"set": (id) => {
						prop = id;
					},
					"get": () => prop,
					"info": () => obj[prop]
				};
			};
		}
		return () => {
			let prop;

			return {
				"get": () => prop,
				"set": (id) => {
					prop = id;
				}
			};
		};
	}

	period = setting(PERIODS)();
	legend = setting(LEGENDS)();
	type = setting(TYPES)();
	truncate = setting()();
	selected = setting()();
	scroll = setting()();
}

function cacheCharts() {
	getData = (() => {
		let obj = {};
		Object.keys(TYPES).forEach((key) => {
			obj[key] = {};
			Object.keys(LEGENDS).forEach((legend) => {
				obj[key][legend] = {};
				TYPES[key].period.forEach((period) => {
					obj[key][legend][period] = TYPES[key].dataFun(legend, period);
				});
			});
		});

		return () => obj[type.get()][legend.get()][period.get()];
	})();
}

let init = function(dataCSV) {
	TYPES = typesInit();
	LEGENDS = legendsInit(dataCSV);
	PERIODS = periodInit();

	createSettings();

	/* Create default chart */
	getData = () => TYPES[defaultChart[1]].dataFun(defaultChart[0], defaultChart[2]);
	chart();

	/* Prevents elements appearing before chart is created */
	$(".menu-container").css("visibility", "visible");
	$(".svg-container").css("visibility", "visible");
	$(".svg-container-shadow").css("visibility", "visible");

	menu.menuEvents();

	cacheCharts();
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
