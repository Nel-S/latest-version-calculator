import {DateUtils} from "../util";

export class Entry {
	name: string
	timestamp: Date
	snapshot: boolean

	constructor(name: string, timestamp: Date, snapshot: boolean = false) {
		this.name = name;
		this.timestamp = timestamp;
		this.snapshot = snapshot;
	}
};

export class Source {
	url: string
	label: string

	constructor(url: string, label: string = "") {
		this.url = url;
		this.label = label ? label : url;
	}

	toHTML(): string {
		return `<a href="${this.url}">${this.label}</a>`;
	}
};

export class VersionList {
	entries: Entry[]
	sources: Source[]
	highResolution: boolean

	constructor(entries: Entry[], sources: Source[], highResolution: boolean = false) {
		this.entries = entries;
		this.highResolution = highResolution;
		this.sources = sources;
	}

	validate(): void {
		for (let i = 0; i < this.entries.length; ++i) {
			if (DateUtils.isInvalid(this.entries[i].timestamp)) throw new Error(`List entry ${this.entries[i].name} has an invalid timestamp.`);
			if (i < this.entries.length - 1 && this.entries[i].timestamp < this.entries[i + 1].timestamp) throw new Error(`List entries are out of order chronlogically (indices ${this.entries[i].name}-${this.entries[i + 1].name}).`);
		}
	}

	getLatestVersionsOn(date: Date) : {releaseEntry: Entry | null, snapshotEntry: Entry | null} {
		if (!this.entries || !date) return {releaseEntry: null, snapshotEntry: null};

		// let latestIndex: number;
		// for (latestIndex = 0; latestIndex < this.entries.length && date < this.entries[latestIndex].timestamp; ++latestIndex);
		// if (latestIndex >= this.entries.length) return {releaseEntry: null, snapshotEntry: null};
		// console.log([latestIndex]);


		// Find the minimum i such that date >= this.entries[i].
		// = Either date >= this.entries[0], or for i > 1, find i such that this.entries[i - 1] > date >= this.entries[i].
		let latestIndex = 0, earliestIndex = this.entries.length - 1;
		let found = false;
		// While there's still a range of indices to check:
		while (latestIndex <= earliestIndex) {
			// Get (approximate) middle index
			const middleIndex = Math.floor((latestIndex + earliestIndex)/2);
			// console.log([latestIndex, earliestIndex, middleIndex]);
			// If not (date >= this.entries[i]), we can discard entries 0-i
			if (date < this.entries[middleIndex].timestamp) {
				latestIndex = middleIndex + 1;
				continue;
			}
			// If not (this.entries[i - 1] > date), we can discard entries i-end
			if (middleIndex > 0 && this.entries[middleIndex - 1].timestamp <= date) {
				earliestIndex = middleIndex - 1;
				continue;
			}
			// Otherwise this.entries[i - 1] > date >= this.entries[i] as desired
			latestIndex = middleIndex;
			found = true;
			break;
		}
		// console.log([latestIndex, earliestIndex, found]);
		if (!found) return {releaseEntry: null, snapshotEntry: null};

		const snapshotEntry = this.entries[latestIndex];
		while (latestIndex < this.entries.length && this.entries[latestIndex].snapshot) ++latestIndex;
		const releaseEntry = latestIndex >= this.entries.length ? null : this.entries[latestIndex];
		return {releaseEntry: releaseEntry, snapshotEntry: snapshotEntry};
	}
};