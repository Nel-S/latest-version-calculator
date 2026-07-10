export class DateUtils {
	static getUTCDatetime(element: HTMLInputElement): Date | null {
		// Element.valueAsDate does not work because it is often set to null
		// even when Element.value is already a valid date.
		const datetime = new Date(element.value + "Z");
		return DateUtils.isInvalid(datetime) ? null : datetime;
	}
	static extractDate(date: Date): string {
		/* Date.toISOString will be in the format YYYY-MM-DDThh:mm:ss...
		                                          ^^^^^^^^^^
		*/
		return date.toISOString().slice(0, 10);
	}
	static extractDateAndTime(datetime: Date): string {
		/* Date.toISOString will be in the format YYYY-MM-DDThh:mm:ss...
		                                          ^^^^^^^^^^^^^^^^
		*/
		return datetime.toISOString().slice(0, 16);
	}
	static localToUTC(datetime: Date): Date {
		datetime.setMinutes(datetime.getMinutes() - datetime.getTimezoneOffset());
		return datetime;
	}
	static isInvalid(datetime: Date | null): boolean {
		return datetime == null || isNaN(datetime.getTime());
	}
}

export class ElementUtils {
	static getElementOrNull<T extends HTMLElement>(selectors: string): T | null {
		return document.querySelector<T>(selectors);
	}

	// Admittedly from Google Gemini
	static getElementOrThrow<T extends HTMLElement>(selectors: string): T {
		const element = document.querySelector<T>(selectors);
		if (!element) throw new Error(`No element with selectors \"${selectors}\" could be found.`);
		return element;
	}
}