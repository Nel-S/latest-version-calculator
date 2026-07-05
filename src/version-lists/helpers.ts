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

export function validateNodeList(list: Entry[]): void {
    for (let i = 0; i < list.length; ++i) {
        if (i < list.length - 1 && list[i].timestamp < list[i + 1].timestamp) throw new Error(`List entries are out of order chronlogically (indices ${list[i].name}-${list[i + 1].name}).`);
    }
}

export function getLatestVersions(list: Entry[], date: Date) : {releaseEntry: Entry | null, snapshotEntry: Entry | null} {
    if (!list || !date) return {releaseEntry: null, snapshotEntry: null};

    // let latestIndex: number;
    // for (latestIndex = 0; latestIndex < list.length && date < list[latestIndex].timestamp; ++latestIndex);
    // if (latestIndex >= list.length) return {releaseEntry: null, snapshotEntry: null};
    // console.log([latestIndex]);


    // Find the minimum i such that date >= list[i].
    // = Either date >= list[0], or for i > 1, find i such that list[i - 1] > date >= list[i].
    let latestIndex = 0, earliestIndex = list.length - 1;
    let found = false;
    // While there's still a range of indices to check:
    while (latestIndex <= earliestIndex) {
        // Get (approximate) middle index
        let middleIndex = Math.floor((latestIndex + earliestIndex)/2);
        // console.log([latestIndex, earliestIndex, middleIndex]);
        // If not (date >= list[i]), we can discard entries 0-i
        if (date < list[middleIndex].timestamp) {
            latestIndex = middleIndex + 1;
            continue;
        }
        // If not (list[i - 1] > date), we can discard entries i-end
        if (middleIndex > 0 && list[middleIndex - 1].timestamp <= date) {
            earliestIndex = middleIndex - 1;
            continue;
        }
        // Otherwise list[i - 1] > date >= list[i] as desired
        latestIndex = middleIndex;
        found = true;
        break;
    }
    // console.log([latestIndex, earliestIndex, found]);
    if (!found) return {releaseEntry: null, snapshotEntry: null};

    const snapshotEntry = list[latestIndex];
    while (latestIndex < list.length && list[latestIndex].snapshot) ++latestIndex;
    const releaseEntry = latestIndex >= list.length ? null : list[latestIndex];
    return {releaseEntry: releaseEntry, snapshotEntry: snapshotEntry};
}