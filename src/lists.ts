import {z} from "zod/mini";
import {DateUtils} from "./util";

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

const sourceSchema = z.object({
	...linkableSchema.shape,
	// Names are optional in sources (defaulting to their URLs if not provided)
	name: z._default(z.optional(
		z.string("Provided name for a source is not a valid string.")
	), ""),
});
// type Source = z.infer<typeof sourceSchema>;

const entrySchema = z.catchall(
	// Base schema
	z.object({
		...linkableSchema.shape,
		timestamp: z.pipe(
			// Timestamps are originally strings...
			z.string("Provided timestamp for an entry is not a valid string."),
			// ...converted to dates...
			z.transform(
				(timestamp) => new Date(timestamp)
			)
		// ...and verified to ensure they're valid dates
		).check(
			z.refine(
				(timestamp) => !DateUtils.isInvalid(timestamp),
				"Provided timestamp for an entry does not convert to a valid date or datetime."
			)
		),
		// URLs are optional in entries
		url: z._default(z.optional(
			urlSchema
		), ""),
		// source: z._default(z.optional(
		// 	sourceSchema
		// ), null),
	}),
	// All other keys are considered metadata, and must be Boolean
	z.boolean()
);
type Entry = z.infer<typeof entrySchema>;

export const versionListSchema = z.pipe(
	// Attributes pulled from JSON
	z.object({
		entries: z.pipe(
			z.array(entrySchema),
			// Entries are sorted by time descending
			z.transform(
				(entries) => [...entries].sort(
					(a, b) => b.timestamp.getTime() - a.timestamp.getTime()
				)
			)
		),
		// Sources default to an empty list if unprovided
		sources: z._default(z.optional(
			z.array(sourceSchema)
		), []),
		// Default label to use for entries without metadata
		defaultLabel: z._default(z.optional(
			z.string("Provided name for a source is not a valid string.")
		), "entry without metadata"),
	}),
	// Derived attributes
	z.transform((data) => ({
		...data,
		// Whether version list contains timestamp data (versus only dates)
		highResolution: data.entries.some(
			(entry) => DateUtils.extractTime(entry.timestamp) != "00:00:00"
		),
		// List of metadata keys contained in version list's entries
		metadata: [...new Set(data.entries.flatMap(
			// For each entry, get keys in the entry that aren't in the entry schema
			(entry) => Object.keys(entry).filter(
				(key) => !Object.keys(entrySchema.shape).includes(key)
			)
			// Then pass through a Set to remove duplicates
		))]
	}))
);
export type VersionList = z.infer<typeof versionListSchema>;

export class VersionListMethods {

	static printLinkable<T extends Linkable>(linkable: T): string {
		if (!linkable.url) return linkable.name;
		return `<a href="${linkable.url}">${linkable.name ? linkable.name : linkable.url}</a>`;
	}

	static getLatestEntryIndexOn(list: VersionList, date: Date | null) : number | null {
		if (!list || !list.entries || !date) return null;

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
		if (!found) return null;

		return latestIndex;
	}

	static getFirstEntriesWithMetadata(list: VersionList, latestIndex: number | null = 0) : (Entry | null)[] | null {
		if (!list || !list.metadata || latestIndex === null) return null;

		// The ultimate array of first entries to be outputted.
		const firstEntries: (Entry | null)[] = new Array(list.metadata.length + 1).fill(null);
		// A "metadata -> firstEntries index" mapping, for convienence.
		const metadataIndices: {[x: string]: number} = list.metadata.reduce((accumulator: {[x: string]: number}, datum, index) => {
			accumulator[datum] = index + 1;
			return accumulator;
		}, {});
		// console.log(firstEntries, metadataIndices);
		
		// For each entry from the latest-index entry onwards, unless all first entries are found:
		for (let i = latestIndex; i < list.entries.length && firstEntries.some((entry) => entry === null); ++i) {
			// Get metadata keys in current entry
			const currentEntryMetadata = Object.keys(list.entries[i]).filter(
				(key) => list.metadata.includes(key)
			);
			// console.log(i, list.entries[i], currentEntryMetadata);
			// If none exist, the entry is a candidate for the default output box, unless an earlier
			// one's already been found for it
			if (!currentEntryMetadata.length) {
				if (firstEntries[0] === null) firstEntries[0] = list.entries[i];
			} else {
				// Otherwise, drop metadata that already has a first entry, and assign all remaining as having the current entry as their 
				currentEntryMetadata.filter((datum) => firstEntries[metadataIndices[datum]] == null).forEach((datum) => firstEntries[metadataIndices[datum]] = list.entries[i]);
			}
		}
		return firstEntries;
	}
};