// TODO: Replace with zod/mini when stable
import {z} from "zod";
import {DateUtils} from "../util";

// Recommended URL parameters from Zod's documentation
const urlSchema = z.url({
  protocol: /^https?$/,
  // TODO: We may want to consider defining a whitelist
  hostname: z.regexes.domain,
  normalize: true,
  error: "Provided URL is invalid or non-HTTP/HTTPS."
});

// TODO: None of these can be converted to strictObjects without errors complaining about an unrecognized key "default". This is likely due to TypeScript's compiling. Is there any workaround?
const linkableSchema = z.object({
	name: z.string("Provided name for a linkable object is not a valid string."),
	url: urlSchema
});
type Linkable = z.infer<typeof linkableSchema>;

const entrySchema = z.object({
	...linkableSchema.shape,
	// Timestamps are originally strings, converted to dates...
	timestamp: z.string("Provided timestamp for an entry is not a valid string.").transform((timestamp) => {
		return new Date(timestamp);
	// ...and verified to ensure they're valid dates
	}).refine((timestamp) => !DateUtils.isInvalid(timestamp), "Provided timestamp for an entry is not a valid date or datetime."),
	// URLs are optional in entries
	url: urlSchema.optional().default(""),
	snapshot: z.boolean("Provided snapshot status for an entry is not a valid Boolean.").optional().default(false)
});
type Entry = z.infer<typeof entrySchema>;

const sourceSchema = z.object({
	...linkableSchema.shape,
	// Names are optional in sources (defaulting to their URLs if not provided)
	name: z.string("Provided name for a source is not a valid string.").optional().default(""),
});
// type Source = z.infer<typeof sourceSchema>;

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

	static printLinkable<T extends Linkable>(linkable: T): string {
		if (!linkable.url) return linkable.name;
		return `<a href="${linkable.url}">${linkable.name ? linkable.name : linkable.url}</a>`;
	}

	static getLatestVersionsOn(list: VersionList, date: Date) : {releaseEntry: Entry | null, snapshotEntry: Entry | null} {
		if (!list.entries || !date) return {releaseEntry: null, snapshotEntry: null};

		// Find the minimum i such that date >= list.entries[i].
		// = Either date >= list.entries[0], or for i > 1, find i such that list.entries[i - 1] > date >= list.entries[i].
		let latestIndex = 0, earliestIndex = list.entries.length - 1;
		let found = false;
		// While there's still a range of indices to check:
		while (latestIndex <= earliestIndex) {
			// Get (approximate) middle index
			const middleIndex = Math.floor((latestIndex + earliestIndex)/2);
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
		if (!found) return {releaseEntry: null, snapshotEntry: null};

		const snapshotEntry = list.entries[latestIndex];
		while (latestIndex < list.entries.length && list.entries[latestIndex].snapshot) ++latestIndex;
		const releaseEntry = latestIndex >= list.entries.length ? null : list.entries[latestIndex];
		return {releaseEntry: releaseEntry, snapshotEntry: snapshotEntry};
	}
};