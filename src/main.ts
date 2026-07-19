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
	platformForm.addEventListener("input", function(){updateDatetimeResolution(); updateSanpshotOutput(); recalculate();});

	const dateForm = ElementUtils.getElementOrThrow<HTMLInputElement>("#datetime-form");
	dateForm.addEventListener("input", function(){recalculate();});

	const utcOffsetForm = ElementUtils.getElementOrThrow<HTMLInputElement>("#utc-offset-form");
	utcOffsetForm.addEventListener("input", function(){updateRangeOutput(); recalculate();});

	// Call functions to initialize the page on the current date/time.
	updateDatetimeResolution();
	updateSanpshotOutput();
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

function updateSanpshotOutput(): void {
	const snapshotBox = ElementUtils.getElementOrThrow<HTMLInputElement>("#snapshot-box");

	// Get current list's resolution
	const versionList = getListFromForm();
	if (versionList && versionList.metadata.includes("snapshot")) snapshotBox.classList.remove("hidden");
	else snapshotBox.classList.add("hidden");
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
	const releaseOutput = ElementUtils.getElementOrThrow("#release");
	const releaseTimeOutput = ElementUtils.getElementOrThrow("#release-time");
	const snapshotOutput = ElementUtils.getElementOrThrow("#snapshot");
	const snapshotTimeOutput = ElementUtils.getElementOrThrow("#snapshot-time");
	const sourcesOutput = ElementUtils.getElementOrThrow("#sources-list");

	const list = getListFromForm();
	if (!list) {
		releaseOutput.innerText = `[Invalid platform]`;
		releaseTimeOutput.innerText = "";
		snapshotOutput.innerText = `[Invalid platform]`;
		snapshotTimeOutput.innerText = "";
		return;
	}
	// console.log(list.metadata);

	if (!list.sources || !list.sources.length) sourcesOutput.innerHTML = "[None]";
	else {
		sourcesOutput.innerHTML = "";
		for (const source of list.sources) {
			sourcesOutput.innerHTML += `<li>${VersionListMethods.printLinkable(source)}</li>`;
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
	
	const {releaseEntry, snapshotEntry} = VersionListMethods.getLatestVersionsOn(list, datetime);
	if (!releaseEntry) {
		releaseOutput.innerText = `[None existed]`;
		releaseTimeOutput.innerText = "";
	} else {
		releaseOutput.innerHTML = VersionListMethods.printLinkable(releaseEntry);
		releaseTimeOutput.innerText = `~ ${list.highResolution ? DateUtils.extractDateAndTime(releaseEntry.timestamp, true) + " UTC" : DateUtils.extractDate(releaseEntry.timestamp)}`;
	}
	if (!snapshotEntry) {
		snapshotOutput.innerText = `[None existed]`;
		snapshotTimeOutput.innerText = "";
	} else {
		snapshotOutput.innerHTML = VersionListMethods.printLinkable(snapshotEntry);
		snapshotTimeOutput.innerText = `~ ${list.highResolution ? DateUtils.extractDateAndTime(snapshotEntry.timestamp, true) + " UTC" : DateUtils.extractDate(snapshotEntry.timestamp)}`;
	}
}

window.addEventListener("DOMContentLoaded", initialize);