// TODO: Replace with zod/mini when stable
import {z} from "zod";
import {DateUtils} from "../util";

// Recommended URL parameters from Zod's documentation
const httpUrl = z.url({
  protocol: /^https?$/,
  hostname: z.regexes.domain,
  normalize: true
});

const entrySchema = z.object({
	name: z.string(),
	// Timestamps are originally strings, converted to dates...
	timestamp: z.string().transform((timestamp) => {
		return new Date(timestamp);
	// ...and verified to ensure they're valid dates
	}).refine((timestamp) => !DateUtils.isInvalid(timestamp)),
	url: httpUrl.optional().default(""),
	snapshot: z.boolean().optional().default(false)
});
type Entry = z.infer<typeof entrySchema>;

const sourceSchema = z.object({
	url: httpUrl,
	label: z.string().optional().default("")
});
type Source = z.infer<typeof sourceSchema>;

export const versionListSchema = z.object({
	entries: z.array(entrySchema).transform((entries) => {
		return [...entries].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
	}),
	sources: z.array(sourceSchema).optional().default([]),
}).transform((data) => ({
	...data,
	highResolution: data.entries.filter((entry) => {
		return DateUtils.extractTime(entry.timestamp) != "00:00:00"
	}).length > 0,
	hasSnapshots: data.entries.filter((entry) => {
		return entry.snapshot
	}).length > 0
}));
export type VersionList = z.infer<typeof versionListSchema>;

export class VersionListMethods {
	// static validate(list: VersionList): void {
	// 	for (let i = 0; i < list.entries.length; ++i) {
	// 		if (DateUtils.isInvalid(list.entries[i].timestamp)) throw new Error(`List entry ${list.entries[i].name} has an invalid timestamp.`);
	// 		if (i < list.entries.length - 1 && list.entries[i].timestamp < list.entries[i + 1].timestamp) throw new Error(`List entries are out of order chronlogically (indices ${list.entries[i].name}-${list.entries[i + 1].name}).`);
	// 	}
	// }

	static sourceToHTML(source: Source): string {
		return `<a href="${source.url}">${source.label ? source.label : source.url}</a>`;
	}

	static getLatestVersionsOn(list: VersionList, date: Date) : {releaseEntry: Entry | null, snapshotEntry: Entry | null} {
		if (!list.entries || !date) return {releaseEntry: null, snapshotEntry: null};

		// let latestIndex: number;
		// for (latestIndex = 0; latestIndex < list.entries.length && date < list.entries[latestIndex].timestamp; ++latestIndex);
		// if (latestIndex >= list.entries.length) return {releaseEntry: null, snapshotEntry: null};
		// console.log([latestIndex]);


		// Find the minimum i such that date >= list.entries[i].
		// = Either date >= list.entries[0], or for i > 1, find i such that list.entries[i - 1] > date >= list.entries[i].
		let latestIndex = 0, earliestIndex = list.entries.length - 1;
		let found = false;
		// While there's still a range of indices to check:
		while (latestIndex <= earliestIndex) {
			// Get (approximate) middle index
			const middleIndex = Math.floor((latestIndex + earliestIndex)/2);
			// console.log([latestIndex, earliestIndex, middleIndex]);
			// If not (date >= list.entries[i]), we can discard entries 0-i
			if (date < list.entries[middleIndex].timestamp) {
				latestIndex = middleIndex + 1;
				continue;
			}
			// If not (list.entries[i - 1] > date), we can discard entries i-end
			if (middleIndex > 0 && list.entries[middleIndex - 1].timestamp <= date) {
				earliestIndex = middleIndex - 1;
				continue;
			}
			// Otherwise list.entries[i - 1] > date >= list.entries[i] as desired
			latestIndex = middleIndex;
			found = true;
			break;
		}
		// console.log([latestIndex, earliestIndex, found]);
		if (!found) return {releaseEntry: null, snapshotEntry: null};

		const snapshotEntry = list.entries[latestIndex];
		while (latestIndex < list.entries.length && list.entries[latestIndex].snapshot) ++latestIndex;
		const releaseEntry = latestIndex >= list.entries.length ? null : list.entries[latestIndex];
		return {releaseEntry: releaseEntry, snapshotEntry: snapshotEntry};
	}
};