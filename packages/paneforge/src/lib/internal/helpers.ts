import type { EnvironmentState } from "svelte-toolbelt";
import type { Direction, DragState, PaneConstraints, PaneData, ResizeEvent } from "./types.js";
import { calculateAriaValues } from "./utils/aria.js";
import { assert } from "./utils/assert.js";
import { areNumbersAlmostEqual } from "./utils/compare.js";
import { isBrowser, isHTMLElement, isKeyDown, isMouseEvent, isTouchEvent } from "./utils/is.js";
import { resizePane } from "./utils/resize.js";

export function noop() {}

export function updateResizeHandleAriaValues({
	groupId,
	layout,
	paneDataArray,
	getDoc,
}: {
	groupId: string;
	layout: number[];
	paneDataArray: PaneData[];
	getDoc: EnvironmentState["getDoc"];
}) {
	const resizeHandleElements = getResizeHandleElementsForGroup(groupId, getDoc);

	for (let index = 0; index < paneDataArray.length - 1; index++) {
		const { valueMax, valueMin, valueNow } = calculateAriaValues({
			layout,
			panesArray: paneDataArray,
			pivotIndices: [index, index + 1],
		});

		const resizeHandleEl = resizeHandleElements[index];

		if (isHTMLElement(resizeHandleEl)) {
			const paneData = paneDataArray[index];

			resizeHandleEl.setAttribute("aria-controls", paneData.id);
			resizeHandleEl.setAttribute("aria-valuemax", `${Math.round(valueMax)}`);
			resizeHandleEl.setAttribute("aria-valuemin", `${Math.round(valueMin)}`);
			resizeHandleEl.setAttribute(
				"aria-valuenow",
				valueNow != null ? `${Math.round(valueNow)}` : ""
			);
		}
	}

	return () => {
		resizeHandleElements.forEach((resizeHandleElement) => {
			resizeHandleElement.removeAttribute("aria-controls");
			resizeHandleElement.removeAttribute("aria-valuemax");
			resizeHandleElement.removeAttribute("aria-valuemin");
			resizeHandleElement.removeAttribute("aria-valuenow");
		});
	};
}

export function getResizeHandleElementsForGroup(
	groupId: string,
	getDoc: EnvironmentState["getDoc"]
): HTMLElement[] {
	if (!isBrowser) return [];
	const doc = getDoc();
	return Array.from(
		doc.querySelectorAll(`[data-pane-resizer-id][data-pane-group-id="${groupId}"]`)
	);
}

export function getResizeHandleElementIndex(
	groupId: string,
	id: string,
	getDoc: EnvironmentState["getDoc"]
): number | null {
	if (!isBrowser) return null;
	const handles = getResizeHandleElementsForGroup(groupId, getDoc);
	const index = handles.findIndex((handle) => handle.getAttribute("data-pane-resizer-id") === id);
	return index ?? null;
}

export function getPivotIndices(
	groupId: string,
	dragHandleId: string,
	getDoc: EnvironmentState["getDoc"]
): [indexBefore: number, indexAfter: number] {
	const index = getResizeHandleElementIndex(groupId, dragHandleId, getDoc);

	return index != null ? [index, index + 1] : [-1, -1];
}

export function paneDataHelper(paneDataArray: PaneData[], paneData: PaneData, layout: number[]) {
	const paneConstraintsArray = paneDataArray.map((paneData) => paneData.constraints);

	const paneIndex = findPaneDataIndex(paneDataArray, paneData);
	const paneConstraints = paneConstraintsArray[paneIndex];

	const isLastPane = paneIndex === paneDataArray.length - 1;
	const pivotIndices = isLastPane ? [paneIndex - 1, paneIndex] : [paneIndex, paneIndex + 1];

	const paneSize = layout[paneIndex];

	return {
		...paneConstraints,
		paneSize,
		pivotIndices,
	};
}

export function findPaneDataIndex(paneDataArray: readonly PaneData[], paneData: PaneData) {
	return paneDataArray.findIndex((prevPaneData) => prevPaneData.id === paneData.id);
}

// Layout should be pre-converted into percentages
export function callPaneCallbacks(
	paneArray: PaneData[],
	layout: number[],
	paneIdToLastNotifiedSizeMap: Record<string, number>
) {
	for (let index = 0; index < layout.length - 1; index++) {
		const size = layout[index];
		const paneData = paneArray[index];
		assert(paneData);

		const { callbacks, constraints, id: paneId } = paneData;
		const { collapsedSize = 0, collapsible } = constraints;

		const lastNotifiedSize = paneIdToLastNotifiedSizeMap[paneId];
		// invert the logic from below

		if (!(lastNotifiedSize == null || size !== lastNotifiedSize)) return;
		paneIdToLastNotifiedSizeMap[paneId] = size;

		const { onCollapse, onExpand, onResize } = callbacks;

		onResize?.(size, lastNotifiedSize);

		if (collapsible && (onCollapse || onExpand)) {
			if (
				onExpand &&
				(lastNotifiedSize == null || lastNotifiedSize === collapsedSize) &&
				size !== collapsedSize
			) {
				onExpand();
			}

			if (
				onCollapse &&
				(lastNotifiedSize == null || lastNotifiedSize !== collapsedSize) &&
				size === collapsedSize
			) {
				onCollapse();
			}
		}
	}
}

export function getUnsafeDefaultLayout({ paneDataArray }: { paneDataArray: PaneData[] }): number[] {
	const layout = Array<number>(paneDataArray.length);

	const paneConstraintsArray = paneDataArray.map((paneData) => paneData.constraints);

	let numPanesWithSizes = 0;
	let remainingSize = 100;

	// Distribute default sizes first
	for (let index = 0; index < paneDataArray.length; index++) {
		const paneConstraints = paneConstraintsArray[index];
		assert(paneConstraints);
		const { defaultSize } = paneConstraints;

		if (defaultSize != null) {
			numPanesWithSizes++;
			layout[index] = defaultSize;
			remainingSize -= defaultSize;
		}
	}

	// Remaining size should be distributed evenly between panes without default sizes
	for (let index = 0; index < paneDataArray.length; index++) {
		const paneConstraints = paneConstraintsArray[index];
		assert(paneConstraints);
		const { defaultSize } = paneConstraints;

		if (defaultSize != null) {
			continue;
		}

		const numRemainingPanes = paneDataArray.length - numPanesWithSizes;
		const size = remainingSize / numRemainingPanes;

		numPanesWithSizes++;
		layout[index] = size;
		remainingSize -= size;
	}

	return layout;
}

// All units must be in percentages
export function validatePaneGroupLayout({
	layout: prevLayout,
	paneConstraints,
}: {
	layout: number[];
	paneConstraints: PaneConstraints[];
}): number[] {
	const nextLayout = [...prevLayout];
	const nextLayoutTotalSize = nextLayout.reduce(
		(accumulated, current) => accumulated + current,
		0
	);

	// Validate layout expectations
	if (nextLayout.length !== paneConstraints.length) {
		throw new Error(
			`Invalid ${paneConstraints.length} pane layout: ${nextLayout
				.map((size) => `${size}%`)
				.join(", ")}`
		);
	} else if (!areNumbersAlmostEqual(nextLayoutTotalSize, 100)) {
		for (let index = 0; index < paneConstraints.length; index++) {
			const unsafeSize = nextLayout[index];
			assert(unsafeSize != null);
			const safeSize = (100 / nextLayoutTotalSize) * unsafeSize;
			nextLayout[index] = safeSize;
		}
	}

	let remainingSize = 0;

	// First pass: Validate the proposed layout given each pane's constraints
	for (let index = 0; index < paneConstraints.length; index++) {
		const unsafeSize = nextLayout[index];
		assert(unsafeSize != null);

		const safeSize = resizePane({
			paneConstraints,
			paneIndex: index,
			initialSize: unsafeSize,
		});

		if (unsafeSize !== safeSize) {
			remainingSize += unsafeSize - safeSize;

			nextLayout[index] = safeSize;
		}
	}

	// If there is additional, left over space, assign it to any pane(s) that permits it
	// (It's not worth taking multiple additional passes to evenly distribute)
	if (!areNumbersAlmostEqual(remainingSize, 0)) {
		for (let index = 0; index < paneConstraints.length; index++) {
			const prevSize = nextLayout[index];
			assert(prevSize != null);
			const unsafeSize = prevSize + remainingSize;
			const safeSize = resizePane({
				paneConstraints,
				paneIndex: index,
				initialSize: unsafeSize,
			});

			if (prevSize !== safeSize) {
				remainingSize -= safeSize - prevSize;
				nextLayout[index] = safeSize;

				// Once we've used up the remainder, bail
				if (areNumbersAlmostEqual(remainingSize, 0)) {
					break;
				}
			}
		}
	}

	return nextLayout;
}

export function getPaneGroupElement(id: string): HTMLElement | null {
	if (!isBrowser) return null;
	const element = document.querySelector(`[data-pane-group][data-pane-group-id="${id}"]`);
	if (element) {
		return element as HTMLElement;
	}
	return null;
}

export function getResizeHandleElement(id: string): HTMLElement | null {
	if (!isBrowser) return null;
	const element = document.querySelector(`[data-pane-resizer-id="${id}"]`);
	if (element) {
		return element as HTMLElement;
	}
	return null;
}

export function getDragOffsetPercentage(
	e: ResizeEvent,
	dragHandleId: string,
	dir: Direction,
	initialDragState: DragState
): number {
	const isHorizontal = dir === "horizontal";

	const handleElement = getResizeHandleElement(dragHandleId);
	assert(handleElement);

	const groupId = handleElement.getAttribute("data-pane-group-id");
	assert(groupId);

	const { initialCursorPosition } = initialDragState;

	const cursorPosition = getResizeEventCursorPosition(dir, e);

	const groupElement = getPaneGroupElement(groupId);
	assert(groupElement);

	const groupRect = groupElement.getBoundingClientRect();
	const groupSizeInPixels = isHorizontal ? groupRect.width : groupRect.height;

	const offsetPixels = cursorPosition - initialCursorPosition;
	const offsetPercentage = (offsetPixels / groupSizeInPixels) * 100;

	return offsetPercentage;
}

// https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/movementX
export function getDeltaPercentage(
	e: ResizeEvent,
	dragHandleId: string,
	dir: Direction,
	initialDragState: DragState | null,
	keyboardResizeBy: number | null
): number {
	if (isKeyDown(e)) {
		const isHorizontal = dir === "horizontal";

		let delta = 0;
		if (e.shiftKey) {
			delta = 100;
		} else if (keyboardResizeBy != null) {
			delta = keyboardResizeBy;
		} else {
			delta = 10;
		}

		let movement = 0;
		switch (e.key) {
			case "ArrowDown":
				movement = isHorizontal ? 0 : delta;
				break;
			case "ArrowLeft":
				movement = isHorizontal ? -delta : 0;
				break;
			case "ArrowRight":
				movement = isHorizontal ? delta : 0;
				break;
			case "ArrowUp":
				movement = isHorizontal ? 0 : -delta;
				break;
			case "End":
				movement = 100;
				break;
			case "Home":
				movement = -100;
				break;
		}

		return movement;
	} else {
		if (initialDragState == null) return 0;

		return getDragOffsetPercentage(e, dragHandleId, dir, initialDragState);
	}
}

export function getResizeEventCursorPosition(dir: Direction, e: ResizeEvent): number {
	const isHorizontal = dir === "horizontal";

	if (isMouseEvent(e)) {
		return isHorizontal ? e.clientX : e.clientY;
	} else if (isTouchEvent(e)) {
		const firstTouch = e.touches[0];
		assert(firstTouch);
		return isHorizontal ? firstTouch.screenX : firstTouch.screenY;
	} else {
		throw new Error(`Unsupported event type "${e.type}"`);
	}
}

export function getResizeHandlePaneIds({
	groupId,
	handleId,
	paneDataArray,
	getDoc,
}: {
	groupId: string;
	handleId: string;
	paneDataArray: PaneData[];
	getDoc: EnvironmentState["getDoc"];
}): [idBefore: string | null, idAfter: string | null] {
	const handle = getResizeHandleElement(handleId);
	const handles = getResizeHandleElementsForGroup(groupId, getDoc);
	const index = handle ? handles.indexOf(handle) : -1;

	const idBefore: string | null = paneDataArray[index]?.id ?? null;
	const idAfter: string | null = paneDataArray[index + 1]?.id ?? null;

	return [idBefore, idAfter];
}
