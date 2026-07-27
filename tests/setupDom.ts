import { Window } from "happy-dom";

const window = new Window({
	url: "http://localhost/",
});

Object.assign(globalThis, {
	window,
	document: window.document,
	HTMLElement: window.HTMLElement,
	HTMLButtonElement: window.HTMLButtonElement,
	HTMLInputElement: window.HTMLInputElement,
	HTMLTextAreaElement: window.HTMLTextAreaElement,
	Node: window.Node,
	Event: window.Event,
	MouseEvent: window.MouseEvent,
	KeyboardEvent: window.KeyboardEvent,
	PointerEvent: window.PointerEvent,
	Range: window.Range,
	getComputedStyle: window.getComputedStyle.bind(window),
	requestAnimationFrame: window.requestAnimationFrame.bind(window),
	cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
});

Object.defineProperty(globalThis, "navigator", {
	value: window.navigator,
	configurable: true,
});

window.matchMedia ??= () =>
	({
		matches: false,
		addEventListener: () => undefined,
		removeEventListener: () => undefined,
	}) as MediaQueryList;
