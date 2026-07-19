import {DatetimeWithMemory} from "./datememory.js";
import {DateUtils, ElementUtils} from "./util.js"
import {type VersionList, VersionListMethods, versionListSchema} from "./lists.js";
// import * as java_versions from "../preset-lists/java.json"
// import * as xbox_360_versions from "../preset-lists/xbox-360.json"

const datetimeWithMemory = new DatetimeWithMemory(
	"#datetime-form",
	"#utc-offset-form",
	".input-utc-hires"
)

async function initialize(): Promise<void> {
	// TODO: Replace with "listening" class
	// document.querySelectorAll<HTMLInputElement>(".listener").forEach(
	// 	element => (element.addEventListener("input", function(){recalculate();}))
	// );

	// Add event listeners.
	const platformForm = ElementUtils.getElementOrThrow<HTMLInputElement>("#platform-form");
	platformForm.addEventListener("input", async function(){await updateDatetimeResolution(); await updateOutputBoxes(); await recalculate();});

	const dateForm = ElementUtils.getElementOrThrow<HTMLInputElement>("#datetime-form");
	dateForm.addEventListener("input", async function(){await recalculate();});

	const utcOffsetForm = ElementUtils.getElementOrThrow<HTMLInputElement>("#utc-offset-form");
	utcOffsetForm.addEventListener("input", async function(){updateRangeOutput(); await recalculate();});

	// Call functions to initialize the page on the current date/time.
	await updateDatetimeResolution();
	await updateOutputBoxes();
	updateRangeOutput();
	await recalculate();
}

// Update the UTC offset output to match the corresponding slider's value.
function updateRangeOutput(): void {
	// Get elements
	const utcOffsetForm = ElementUtils.getElementOrThrow<HTMLInputElement>("#utc-offset-form");
	const currentUtcOffsetOutput = ElementUtils.getElementOrThrow<HTMLDataElement>("#current-utc-offset");

	currentUtcOffsetOutput.innerText = `(UTC${Number(utcOffsetForm.value) > 0 ? "+" : ""}${utcOffsetForm.value != "0" ? utcOffsetForm.value : ""})`;
}

// Update the datetime resolution to match the current version list.
async function updateDatetimeResolution(): Promise<void> {
	// Get current list's resolution
	const versionList = await getListFromForm();
	if (versionList && versionList.highResolution) datetimeWithMemory.toHighResolution();
	else datetimeWithMemory.toLowResolution();
}

async function updateOutputBoxes(): Promise<void> {
	const outputContainer = ElementUtils.getElementOrThrow<HTMLInputElement>("#output-container");

	// Get current list
	const list = await getListFromForm();
	if (!list) throw new Error("Invalid list.");

	outputContainer.innerHTML = "";
	for (let i = 0; i < list.metadata.length + 1; ++i) {
		outputContainer.innerHTML += `
		<div id="output-box-${i}">
			<p class="label">Latest ${!i ? list.defaultLabel : list.metadata[i-1]}:</p>
			<p class="version-name" id="output-name-${i}">[Calculating...]</p>
			<p class="subtext" id="output-time-${i}"></p>
		</div>
		`
	}
}

async function getListFromForm(): Promise<VersionList | null> {
	const platformForm = ElementUtils.getElementOrNull<HTMLInputElement>("#platform-form");
	if (!platformForm) return null;
	
	let url = "";
	switch (platformForm.value) {
		case "Java Edition":
			// TODO: Find way to replace with permalink
			url = "https://raw.githubusercontent.com/Nel-S/latest-version-calculator/refs/heads/development/preset-lists/java.json";
			break;
		case "Xbox 360 Edition":
			url = "https://raw.githubusercontent.com/Nel-S/latest-version-calculator/refs/heads/development/preset-lists/xbox-360.json";
			break;
		default:
			return null;
	}

	try {
		const fetchResponse = await fetch(url);
		if (!fetchResponse.ok) return null;
		return versionListSchema.parse(await fetchResponse.json());
	} catch {
		return null;
	}
}

async function recalculate(): Promise<void> {
	const sourcesOutput = ElementUtils.getElementOrThrow("#sources-list");

	const list = await getListFromForm();
	if (!list) {
		sourcesOutput.innerText = "[Invalid list]";
		return;
	}
	const datetime = datetimeWithMemory.read();
	
	const latestEntryIndex = VersionListMethods.getLatestEntryIndexOn(list, datetime);
	const latestEntriesList = VersionListMethods.getFirstEntriesWithMetadata(list, latestEntryIndex);
	// console.log(latestEntryIndex, latestEntriesList);

	for (let i = 0; i < list.metadata.length + 1; ++i) {
		const outputBoxName = ElementUtils.getElementOrThrow(`#output-name-${i}`);
		const outputBoxTime = ElementUtils.getElementOrThrow(`#output-time-${i}`);
		if (!datetime) {
			outputBoxName.innerText = `[Invalid date/time]`;
			outputBoxTime.innerText = "";
			continue;
		}

		if (!latestEntriesList) {
			outputBoxName.innerText = `[Calculation failed]`;
			outputBoxTime.innerText = "";
			continue;
		}

		const currentLatestEntry = latestEntriesList[i];
		if (!currentLatestEntry) {
			outputBoxName.innerText = `[None existed]`;
			outputBoxTime.innerText = "";
			continue;
		}

		outputBoxName.innerHTML = VersionListMethods.printLinkable(currentLatestEntry);
		outputBoxTime.innerText = `~ ${list.highResolution ? DateUtils.extractDateAndTime(currentLatestEntry.timestamp, true) + " UTC" : DateUtils.extractDate(currentLatestEntry.timestamp)}`;
	}

	if (!list || !list.sources || !list.sources.length) sourcesOutput.innerHTML = "[None]";
	else {
		sourcesOutput.innerHTML = "";
		for (const source of list.sources) {
			sourcesOutput.innerHTML += `<li>${VersionListMethods.printLinkable(source)}</li>`;
		}
	}
}

window.addEventListener("DOMContentLoaded", initialize);