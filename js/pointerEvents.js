export function pointerEvents(){
	let touchedElem;
	/* Clicking for mouse and touch devices */
	/* f: function on click */
	/* g: function on pre-click (e.g. buttons out in active state) */
	/* h: reverts g */
	function click(sel, f, g, h) {
		if (g === undefined) {
			g = () => { return; };
		}
		
		if (h === undefined) {
			h = () => { return; };
		}
		
		$(sel).on("pointerdown", (evt) => {
			touchedElem = evt.target;
			g(evt);
		});		
		$(sel).on("pointerout", (evt) => {
			touchedElem = "";
			h(evt);
		});
		$(sel).on("pointerup", (evt) => {
			if (evt.target === touchedElem) {
				f(evt);
			}
			touchedElem = "";
			h(evt);
		});
	}

	function hover(sel, f1, f2) {
		$(sel)
			.on("pointerenter", f1)
			.on("pointerout", f2);
	}

	return {
		click,
		hover
	};
}