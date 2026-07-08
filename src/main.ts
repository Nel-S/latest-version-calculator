import {getElementOrNull, getElementOrThrow} from "./util.js"
import {Entry, getLatestVersions, validateNodeList} from "./version-lists/helpers.js";
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
		case "Java":
			validateNodeList(JAVA_VERSIONS);
			return JAVA_VERSIONS;
		default: return null;
	}
}

function recalculate(): void {
	const releaseOutput = getElementOrThrow("#latest-release");
	const releaseTimeOutput = getElementOrThrow("#latest-release-time");
	const snapshotOutput = getElementOrThrow("#latest-snapshot");
	const snapshotTimeOutput = getElementOrThrow("#latest-snapshot-time");

	const list = getListFromForm();
	if (!list) {
		releaseOutput.innerHTML = `[Invalid platform provided.]`;
		releaseTimeOutput.innerHTML = "";
		snapshotOutput.innerHTML = `[Invalid platform provided.]`;
		snapshotTimeOutput.innerHTML = "";
		return;
	}

	const datetime = getDatetimeFromForm();
	if (!datetime || isNaN(datetime.getTime())) {
		releaseOutput.innerHTML = `[Invalid date/time provided.]`;
		releaseTimeOutput.innerHTML = "";
		snapshotOutput.innerHTML = `[Invalid date/time provided.]`;
		snapshotTimeOutput.innerHTML = "";
		return;
	}
	// console.log(datetime.toISOString());
	
	const {releaseEntry, snapshotEntry} = getLatestVersions(JAVA_VERSIONS, datetime);
	releaseOutput.innerHTML = releaseEntry ?
		`${releaseEntry.name}` :
		`[No releases existed for the provided platform on this date.]`;
	releaseTimeOutput.innerHTML = releaseEntry ?
		`(around ${releaseEntry.timestamp.toISOString().slice(0, 16).replace("T", " ")} UTC)` :
		"";
	snapshotOutput.innerHTML = snapshotEntry ?
		`${snapshotEntry.name}` :
		`[No snapshots existed for the provided platform on this date.]`;
	snapshotTimeOutput.innerHTML = snapshotEntry ?
		`(around ${snapshotEntry.timestamp.toISOString().slice(0, 16).replace("T", " ")} UTC)` :
		"";
}

window.addEventListener("DOMContentLoaded", initialize);