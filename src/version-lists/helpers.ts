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

export function validateNodeList(list: Entry[]) {
    for (let i = 0; i < list.length; ++i) {
        if (i < list.length - 1 && list[i].timestamp >= list[i + 1].timestamp) throw new Error(`List entries are out of order chronlogically (indices ${i}-${i + 1}).`);
    }
}

export function getLatestVersions(list: Entry[], date: Date) : {releaseEntry: Entry | null, snapshotEntry: Entry | null} {
    if (!list || !date) return {releaseEntry: null, snapshotEntry: null};

    let latestIndex: number;
    for (latestIndex = 0; latestIndex < list.length && date < list[latestIndex].timestamp; ++latestIndex);
    if (latestIndex >= list.length) return {releaseEntry: null, snapshotEntry: null};


    // // list[i] <= date < list[i - 1]
    // let latestIndex = 0, earliestIndex = list.length - 1;
    // let found = false;
    // while (latestIndex < earliestIndex) {
    //     const middleIndex = Math.floor((latestIndex + earliestIndex)/2);
    //     console.log([latestIndex, earliestIndex, middleIndex]);
    //     if (date < list[middleIndex].timestamp) {
    //         latestIndex = middleIndex + 1;
    //         continue;
    //     }
    //     if (middleIndex > 0) {
    //         if (list[middleIndex - 1].timestamp <= date) {
    //             earliestIndex = middleIndex - 1;
    //             continue;
    //         }
    //     }
    //     latestIndex = middleIndex;
    //     found = true;
    //     break;
    // }
    // if (!found) return null;

    const snapshotEntry = list[latestIndex];
    while (latestIndex < list.length && list[latestIndex].snapshot) ++latestIndex;
    const releaseEntry = latestIndex >= list.length ? null : list[latestIndex];
    return {releaseEntry: releaseEntry, snapshotEntry: snapshotEntry};
}