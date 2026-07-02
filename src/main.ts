import {getElementOrNull, getElementOrThrow} from "./util.js"
import {Entry, getLatestVersions} from "./version-lists/helpers.js";
import {JAVA_VERSIONS} from "./version-lists/java.js"


function initialize(): void {
	const platformForm = getElementOrThrow<HTMLInputElement>("#platform-form");
	platformForm.addEventListener("input", function(){recalculate();});

	const dateForm = getElementOrThrow<HTMLInputElement>("#datetime-form");
	dateForm.addEventListener("input", function(){recalculate();});

	const utcOffsetForm = getElementOrThrow<HTMLInputElement>("#utc-offset-form");
	utcOffsetForm.addEventListener("input", function(){recalculate(); updateRangeOutput();});

	setFormsWithCurrentDatetime(dateForm, utcOffsetForm);
	updateRangeOutput();
	recalculate();
}

function updateRangeOutput(): void {
	const utcOffsetForm = getElementOrThrow<HTMLInputElement>("#utc-offset-form");
	const currentUtcOffsetOutput = getElementOrThrow<HTMLDataElement>("#current-utc-offset");

	currentUtcOffsetOutput.innerHTML = `(${utcOffsetForm.value})`;
}

function setFormsWithCurrentDatetime(dateForm: HTMLInputElement, utcOffsetForm: HTMLInputElement): void {
	let currentDatetime = new Date();
	utcOffsetForm.value = (Math.round(-currentDatetime.getTimezoneOffset()/15)/4).toString();
	currentDatetime.setMinutes(currentDatetime.getMinutes() - currentDatetime.getTimezoneOffset());
	dateForm.value = currentDatetime.toISOString().slice(0, 16);
}

function getDatetimeFromForm(): Date | null {
	const dateForm = getElementOrNull<HTMLInputElement>("#datetime-form");
	if (!dateForm) return null;
	const utcOffsetForm = getElementOrNull<HTMLInputElement>("#utc-offset-form");
	if (!utcOffsetForm) return null;
	
	let datetime = new Date(dateForm.value + "Z");
	datetime.setUTCMinutes(datetime.getUTCMinutes() - 60*Number(utcOffsetForm.value));
	return datetime;
}

function getListFromForm(): Entry[] | null {
	const platformForm = getElementOrNull<HTMLInputElement>("#platform-form");
	if (!platformForm) return null;
	
	switch (platformForm.value) {
		case "Java": return JAVA_VERSIONS;
		default: return null;
	}
}

function recalculate(): void {
	const releaseOutput = getElementOrThrow("#latest-release");
	const snapshotOutput = getElementOrThrow("#latest-snapshot");

	const list = getListFromForm();
	if (!list) {
		releaseOutput.innerHTML = `Latest release: [Invalid platform provided.]`;
		snapshotOutput.innerHTML = `Latest snapshot: [Invalid platform provided.]`;
		return;
	}

	const datetime = getDatetimeFromForm();
	if (!datetime || isNaN(datetime.getTime())) {
		releaseOutput.innerHTML = `Latest release: [Invalid date/time provided.]`;
		snapshotOutput.innerHTML = `Latest snapshot: [Invalid date/time provided.]`;
		return;
	}
	// console.log(datetime.toISOString());
	
	const {releaseEntry, snapshotEntry} = getLatestVersions(JAVA_VERSIONS, datetime);
	releaseOutput.innerHTML = releaseEntry ?
		`Latest release: ${releaseEntry.name} (released approximately around ${releaseEntry.timestamp.toUTCString()})` :
		`Latest release: [No releases existed for the provided platform on this date.]`;
	snapshotOutput.innerHTML = snapshotEntry ?
		`Latest snapshot: ${snapshotEntry.name} (released approximately around ${snapshotEntry.timestamp.toUTCString()})` :
		`Latest snapshot: [No snapshots existed for the provided platform on this date.]`;
}

window.addEventListener("DOMContentLoaded", initialize);