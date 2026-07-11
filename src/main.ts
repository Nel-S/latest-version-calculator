import {DatetimeWithMemory} from "./datememory.js";
import {DateUtils, ElementUtils} from "./util.js"
import {VersionList} from "./version-lists/helpers.js";
import {JAVA_VERSION_LIST} from "./version-lists/java.js"
import {BEDROCK_VERSION_LIST} from "./version-lists/bedrock.js";

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
	platformForm.addEventListener("input", function(){updateDatetimeResolution(); recalculate();});

	const dateForm = ElementUtils.getElementOrThrow<HTMLInputElement>("#datetime-form");
	dateForm.addEventListener("input", function(){recalculate();});

	const utcOffsetForm = ElementUtils.getElementOrThrow<HTMLInputElement>("#utc-offset-form");
	utcOffsetForm.addEventListener("input", function(){updateRangeOutput(); recalculate();});

	// Call functions to initialize the page on the current date/time.
	updateDatetimeResolution();
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
	if (!versionList || versionList.highResolution) datetimeWithMemory.toHighResolution();
	else datetimeWithMemory.toLowResolution();
}

function getListFromForm(): VersionList | null {
	const platformForm = ElementUtils.getElementOrNull<HTMLInputElement>("#platform-form");
	if (!platformForm) return null;
	
	switch (platformForm.value) {
		case "Java":
			JAVA_VERSION_LIST.validate();
			return JAVA_VERSION_LIST;
		case "Bedrock":
			BEDROCK_VERSION_LIST.validate();
			return BEDROCK_VERSION_LIST;
		default:
			return null;
	}
}

function recalculate(): void {
	const releaseOutput = ElementUtils.getElementOrThrow("#latest-release");
	const releaseTimeOutput = ElementUtils.getElementOrThrow("#latest-release-time");
	const snapshotOutput = ElementUtils.getElementOrThrow("#latest-snapshot");
	const snapshotTimeOutput = ElementUtils.getElementOrThrow("#latest-snapshot-time");
	const sourcesOutput = ElementUtils.getElementOrThrow("#sources-list");

	const list = getListFromForm();
	if (!list) {
		releaseOutput.innerText = `[Invalid platform]`;
		releaseTimeOutput.innerText = "";
		snapshotOutput.innerText = `[Invalid platform]`;
		snapshotTimeOutput.innerText = "";
		return;
	}

	if (!list.sources.length) sourcesOutput.innerHTML = "[None]";
	else {
		sourcesOutput.innerHTML = "";
		for (const source of list.sources) {
			sourcesOutput.innerHTML += `<li>${source.toHTML()}</li>`;
		}
	}

	const datetime = datetimeWithMemory.read();
	if (!datetime) {
		releaseOutput.innerText = `[Invalid date/time]`;
		releaseTimeOutput.innerText = "";
		snapshotOutput.innerText = `[Invalid date/time]`;
		snapshotTimeOutput.innerText = "";
		return;
	}
	
	const {releaseEntry, snapshotEntry} = list.getLatestVersionsOn(datetime);
	releaseOutput.innerText = releaseEntry ?
		`${releaseEntry.name}` :
		`[No releases existed]`;
	releaseTimeOutput.innerText = releaseEntry ?
		`~ ${list.highResolution ? DateUtils.extractDateAndTime(releaseEntry.timestamp, true) + " UTC" : DateUtils.extractDate(releaseEntry.timestamp)}` :
		"";
	snapshotOutput.innerText = snapshotEntry ?
		`${snapshotEntry.name}` :
		`[No snapshots existed]`;
	snapshotTimeOutput.innerText = snapshotEntry ?
		`~ ${list.highResolution ? DateUtils.extractDateAndTime(snapshotEntry.timestamp, true) + " UTC" : DateUtils.extractDate(snapshotEntry.timestamp)}` :
		"";
}

window.addEventListener("DOMContentLoaded", initialize);