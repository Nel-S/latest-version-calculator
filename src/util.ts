export class DateUtils {
	static getUTCDatetime(element: HTMLInputElement): Date | null {
		// Element.valueAsDate does not work because it is often set to null
		// even when Element.value is already a valid date.
		const datetime = new Date(element.value + "Z");
		return DateUtils.isValid(datetime) ? datetime : null;
	}
	static extractDate(date: Date): string {
		/* Date.toISOString will be in the format YYYY-MM-DDThh:mm:ss...
		                                          ^^^^^^^^^^
		*/
		return date.toISOString().slice(0, 10);
	}
	static extractTime(date: Date): string {
		/* Date.toISOString will be in the format YYYY-MM-DDThh:mm:ss...
		                                                     ^^^^^^^^
		*/
		return date.toISOString().slice(11, 19);
	}
	static extractDateAndTime(datetime: Date, humanReadable: boolean = false): string {
		/* Date.toISOString will be in the format YYYY-MM-DDThh:mm:ss...
		                                          ^^^^^^^^^^^^^^^^
		*/
		let newDatetime = datetime.toISOString().slice(0, 16);
		// If human readability is desired, replace T with a space
		if (humanReadable) newDatetime = newDatetime.replace("T", " ");
		return newDatetime;
	}
	static localToUTC(datetime: Date): Date {
		datetime.setMinutes(datetime.getMinutes() - datetime.getTimezoneOffset());
		return datetime;
	}
	static isValid(datetime: Date | null): boolean {
		return datetime != null && !isNaN(datetime.getTime());
	}
}

export class ElementUtils {
	static getIfNullOrNull<T>(value: T | null, getter: (...args: any[]) => T | null, ...args: any[]): T | null {
		if (value !== null) return value;
		value = getter(args);
		return value;
	}

	static getIfNullOrThrow<T>(value: T | null, getter: (...args: any[]) => T | null, ...args: any[]): T {
		if (value !== null) return value;
		value = getter(args);
		if (value === null) throw new Error(`Getter ${getter.toString()} could not update variable with a non-null value.`);
		return value;
	}

	static async asyncGetIfNullOrNull<T>(value: T | null, getter: (...args: any[]) => Promise<T | null>, ...args: any[]): Promise<T | null> {
		if (value !== null) return value;
		value = await getter(args);
		return value;
	}

	static async asyncGetIfNullOrThrow<T>(value: T | null, getter: (...args: any[]) => T | null, ...args: any[]): Promise<T> {
		if (value !== null) return value;
		value = await getter(args);
		if (value === null) throw new Error(`Getter ${getter} could not update variable with a non-null value.`);
		return value;
	}

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

export class URLUtils {
	static async queryURL(url: string, cacheName: string | null = null): Promise<Response | null> {
		let fetchResponse: Response | undefined = undefined;

		// Check cache for URL
		if (cacheName) {
			const cache = await caches.open(cacheName);
			fetchResponse = await cache.match(url);
			if (fetchResponse) return fetchResponse;
		}

		try {
			fetchResponse = await fetch(url);
		} catch {
			return null;
		}
		if (!fetchResponse.ok) return null;

		if (cacheName) {
			const cache = await caches.open(cacheName);
			await cache.put(url, fetchResponse.clone());
		}
		return fetchResponse;
	}

	static async queryUploadedFile(fileList: FileList | null, cacheName: string | null = null): Promise<Response | null> {
		if (!fileList) return null;
		const file = fileList[0];

		// Check cache for URL
		const fileHash = `${file.name}-${file.lastModified}-${file.size}`;

		// Check cache for URL
		if (cacheName) {
			const cache = await caches.open(cacheName);
			const fetchResponse = await cache.match(fileHash);
			if (fetchResponse) return fetchResponse;
		}

		const lastModifiedDatetime = new Date(file.lastModified);
		const fetchResponse = new Response(
			await file.text(),
			DateUtils.isValid(lastModifiedDatetime) ?
				{headers: {"Last-Modified": lastModifiedDatetime.toUTCString()}} :
				undefined
		);
		if (!fetchResponse.ok) return null;

		if (cacheName) {
			const cache = await caches.open(cacheName);
			await cache.put(fileHash, fetchResponse.clone());
		}
		return fetchResponse;
	}

	static async getGithubLastCommit(url: URL): Promise<string | null> {
		if (!url) return null;
		const whitelistedProtocols = new Set(["http:", "https:"]);
		if (!whitelistedProtocols.has(url.protocol)) return null;
		const whitelistedDomains = new Set(["github.com", "www.github.com", "raw.githubusercontent.com"]);
		if (!whitelistedDomains.has(url.hostname)) return null;

		// Possible formats:
		// raw.githubusercontent.com/OWNER/REPOSITORY/SHA/PATH (parameters 1, 2, 3, 4)
		// github.com/OWNER/REPOSITORY/blob/[SHA OR BRANCH]/PATH (parameters 1, 2, 4, 5)
		// raw.githubusercontent.com/OWNER/REPOSITORY/refs/heads/BRANCH/PATH (parameters 1, 2, 5, 6)
		const extraParameters = url.pathname.includes("/blob/") ? 1 :
			url.pathname.includes("/refs/heads/") ? 2 :
			0;
		const filepathParameters = url.pathname.split("/");
		if (filepathParameters.length < 5 + extraParameters) return null;
		const owner = filepathParameters[1];
		const repository = filepathParameters[2];
		const shaOrBranch = filepathParameters[3 + extraParameters];
		const path = filepathParameters.slice(4 + extraParameters).join("/");

		let response: Response;
		try {
			response = await fetch(`https://api.github.com/repos/${owner}/${repository}/commits?sha=${shaOrBranch}&path=${path}&per_page=1&page=1`)
		} catch {
			return null;
		}
		if (!response || !response.ok) return null;

		let responseJSON: any;
		try {
			responseJSON = await response.json();
		} catch {
			return null;
		}
		return responseJSON[0]?.commit?.committer?.date ?? null;
	}
}