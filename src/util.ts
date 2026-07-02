export function getElementOrNull<T extends HTMLElement>(selectors: string): T | null {
	return document.querySelector<T>(selectors);
}

// Admittedly from Google Gemini
export function getElementOrThrow<T extends HTMLElement>(selectors: string): T {
	const element = document.querySelector<T>(selectors);
	if (!element) throw new Error(`No element with selectors \"${selectors}\" could be found.`);
	return element;
}