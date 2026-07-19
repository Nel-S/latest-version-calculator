import {DatetimeWithMemory} from "./datememory.js";
import {DateUtils, ElementUtils} from "./util.js"
import {VersionListMethods, versionListSchema} from "./version-lists/helpers.js";
import type {VersionList} from "./version-lists/helpers.js";
import * as java_versions from "./version-lists/java.json"
import * as xbox_360_versions from "./version-lists/xbox-360.json"

const datetimeWithMemory = new DatetimeWithMemory(
	"#datetime-form",
	"#utc-offset-form",
	".input-utc-hires"
)

function initialize(): void {
	// TODO: Replace with "listening" class
	// document.querySelectorAll<HTMLInputElement>(".listener").forEach(
	// 	element => (element.addEventListener("input", function(){recalculate();}))
	// );

	// Add event listeners.
	const platformForm = ElementUtils.getElementOrThrow<HTMLInputElement>("#platform-form");
	platformForm.addEventListener("input", function(){updateDatetimeResolution(); updateOutputBoxes(); recalculate();});

	const dateForm = ElementUtils.getElementOrThrow<HTMLInputElement>("#datetime-form");
	dateForm.addEventListener("input", function(){recalculate();});

	const utcOffsetForm = ElementUtils.getElementOrThrow<HTMLInputElement>("#utc-offset-form");
	utcOffsetForm.addEventListener("input", function(){updateRangeOutput(); recalculate();});

	// Call functions to initialize the page on the current date/time.
	updateDatetimeResolution();
	updateOutputBoxes();
	updateRangeOutput();
	recalculate();
}

// Update the UTC offset output to match the corresponding slider's value.
function updateRangeOutput(): void {
	// Get elements
	const utcOffsetForm = ElementUtils.getElementOrThrow<HTMLInputElement>("#utc-offset-form");
	const currentUtcOffsetOutput = ElementUtils.getElementOrThrow<HTMLDataElement>("#current-utc-offset");

	currentUtcOffsetOutput.innerText = `(UTC${Number(utcOffsetForm.value) > 0 ? "+" : ""}${utcOffsetForm.value != "0" ? utcOffsetForm.value : ""})`;
}

// Update the datetime resolution to match the current version list.
function updateDatetimeResolution(): void {
	// Get current list's resolution
	const versionList = getListFromForm();
	if (versionList && versionList.highResolution) datetimeWithMemory.toHighResolution();
	else datetimeWithMemory.toLowResolution();
}

function updateOutputBoxes(): void {
	const outputContainer = ElementUtils.getElementOrThrow<HTMLInputElement>("#output-container");

	// Get current list
	const list = getListFromForm();
	if (!list) throw new Error("Invalid list.");

	outputContainer.innerHTML = "";
	for (let i = 0; i < list.metadata.length + 1; ++i) {
		outputContainer.innerHTML += `
		<div id="output-box-${i}">
			<p class="label">Latest ${!i ? list.defaultLabel : list.metadata[i-1]}:</p>
			<p class="version-name" id="output-name-${i}"></p>
			<p class="subtext" id="output-time-${i}"></p>
		</div>
		`
	}
}

function getListFromForm(): VersionList | null {
	const platformForm = ElementUtils.getElementOrNull<HTMLInputElement>("#platform-form");
	if (!platformForm) return null;
	
	switch (platformForm.value) {
		case "Java":
			return versionListSchema.parse(java_versions);
		case "Xbox 360":
			return versionListSchema.parse(xbox_360_versions);
		default:
			return null;
	}
}

function recalculate(): void {
	const sourcesOutput = ElementUtils.getElementOrThrow("#sources-list");

	const list = getListFromForm();

	if (!list || !list.sources || !list.sources.length) sourcesOutput.innerHTML = "[None]";
	else {
		sourcesOutput.innerHTML = "";
		for (const source of list.sources) {
			sourcesOutput.innerHTML += `<li>${VersionListMethods.printLinkable(source)}</li>`;
		}
	}

	const datetime = datetimeWithMemory.read();
	
	const latestEntryIndex = VersionListMethods.getLatestEntryIndexOn(list, datetime);
	const latestEntriesList = VersionListMethods.getFirstEntriesWithMetadata(list, latestEntryIndex);
	// console.log(latestEntryIndex, latestEntriesList);

	for (let i = 0; i < latestEntriesList.length; ++i) {
		const outputBoxName = ElementUtils.getElementOrThrow(`#output-name-${i}`);
		const outputBoxTime = ElementUtils.getElementOrThrow(`#output-time-${i}`);
		if (!list) {
			outputBoxName.innerText = `[Invalid platform]`;
			outputBoxTime.innerText = "";
		} else if (!datetime) {
			outputBoxName.innerText = `[Invalid date/time]`;
			outputBoxTime.innerText = "";
		} else if (!latestEntriesList[i]) {
			outputBoxName.innerText = `[None existed]`;
			outputBoxTime.innerText = "";
		} else {
			outputBoxName.innerHTML = VersionListMethods.printLinkable(latestEntriesList[i]);
			outputBoxTime.innerText = `~ ${list.highResolution ? DateUtils.extractDateAndTime(latestEntriesList[i].timestamp, true) + " UTC" : DateUtils.extractDate(latestEntriesList[i].timestamp)}`;
		}
	}
}

window.addEventListener("DOMContentLoaded", initialize);