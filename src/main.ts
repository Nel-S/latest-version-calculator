import {DatetimeWithMemory} from "./datememory.js";
import {DateUtils, ElementUtils, URLUtils} from "./util.js"
import {type VersionList, VersionListMethods, versionListSchema} from "./lists.js";

const datetimeWithMemory = new DatetimeWithMemory(
	"#datetime-form",
	"#utc-offset-form",
	".input-utc-hires"
)

async function initialize(): Promise<void> {
	// Reset list cache.
	await caches.delete("chronological-calculator-list-cache");

	// Add event listeners.
	const listForm = ElementUtils.getElementOrThrow<HTMLInputElement>("#list-form");
	listForm.addEventListener("input", async function(){await respondToNewList();});

	const listURLForm = ElementUtils.getElementOrThrow<HTMLInputElement>("#list-form-url");
	listURLForm.addEventListener("change", async function(){await updatePageForList();});

	const listFileUploadForm = ElementUtils.getElementOrThrow<HTMLInputElement>("#list-form-file-upload");
	listFileUploadForm.addEventListener("change", async function(){await updatePageForList();});

	const dateForm = ElementUtils.getElementOrThrow<HTMLInputElement>("#datetime-form");
	dateForm.addEventListener("input", async function(){await recalculate();});

	const utcOffsetForm = ElementUtils.getElementOrThrow<HTMLInputElement>("#utc-offset-form");
	utcOffsetForm.addEventListener("input", async function(){updateRangeOutput(); await recalculate();});

	// Call functions to initialize the page on the current list, date, and time.
	await respondToNewList();
	updateRangeOutput();
}

// Function to run whenever the selected list changes.
async function respondToNewList(): Promise<void> {
	/* Check if a Custom option was selected (in which case input elements' visibilities need
	   to be updated, but otherwise a recalculation doesn't need to be performed). */
	const urlUnhidden = updateURLVisibility();
	const fileUploadUnhidden = updateFileUploadVisibility();
	if (urlUnhidden || fileUploadUnhidden) {
		blankOutputs(`[Waiting${urlUnhidden ? " for URL" : fileUploadUnhidden ? " for file upload" : ""}...]`);
		return;
	}
	// Otherwise, perform a recalculation.
	await updatePageForList();
}

function blankOutputs(message: string = "") {
	const outputContainer = ElementUtils.getElementOrThrow<HTMLInputElement>("#output-container");
	outputContainer.innerHTML = `
		<div class="list-name">
			${message}
		</div>
	`;

	const listLastUpdatedBox = ElementUtils.getElementOrThrow<HTMLInputElement>("#list-last-updated");
	listLastUpdatedBox.innerText = "";
}

async function updatePageForList(): Promise<void> {
	const list = await getListFromForm(true);
	if (!list) {
		blankOutputs(`[Invalid list]`);
		return;
	}

	updateOutputBoxes(list);
	updateDatetimeResolution(list);
	updateListLastUpdateField(list);
	await recalculate(list);
}

// Update the UTC offset output to match the corresponding slider's value.
function updateRangeOutput(): boolean {
	// Get elements
	const utcOffsetForm = ElementUtils.getElementOrThrow<HTMLInputElement>("#utc-offset-form");
	const currentUtcOffsetOutput = ElementUtils.getElementOrThrow<HTMLDataElement>("#current-utc-offset");

	currentUtcOffsetOutput.innerText = `(UTC${Number(utcOffsetForm.value) > 0 ? "+" : ""}${utcOffsetForm.value != "0" ? utcOffsetForm.value : ""})`;
	return true;
}

// Update the datetime resolution to match the current version list.
function updateDatetimeResolution(list: VersionList): boolean {
	if (list && list.highResolution) {
		datetimeWithMemory.toHighResolution();
		return true;
	}
	datetimeWithMemory.toLowResolution();
	return false;
}

function updateURLVisibility(): boolean {
	const listForm = ElementUtils.getElementOrNull<HTMLInputElement>("#list-form");
	const listURLForm = ElementUtils.getElementOrThrow<HTMLInputElement>("#list-form-url");

	if (listForm && listForm.value === "From URL") {
		listURLForm.classList.remove("hidden");
		return true;
	}
	listURLForm.classList.add("hidden");
	return false;
}

function updateFileUploadVisibility(): boolean {
	const listForm = ElementUtils.getElementOrNull<HTMLInputElement>("#list-form");
	const listFileUploadForm = ElementUtils.getElementOrThrow<HTMLInputElement>("#list-form-file-upload");

	if (listForm && listForm.value === "From File Upload") {
		listFileUploadForm.classList.remove("hidden");
		return true;
	}
	listFileUploadForm.classList.add("hidden");
	return false;
}

function updateOutputBoxes(list: VersionList): boolean {
	if (!list) return false;
	const outputContainer = ElementUtils.getElementOrThrow<HTMLInputElement>("#output-container");

	outputContainer.innerHTML = "";
	for (let i = 0; i < list.metadata.length + 1; ++i) {
		outputContainer.innerHTML += `
		<div id="output-box-${i}">
			<p class="label">Latest ${!i ? list.defaultLabel : list.metadata[i-1]}:</p>
			<p class="list-name" id="output-name-${i}">[Calculating...]</p>
			<p class="subtext" id="output-time-${i}"></p>
		</div>
		`
	}
	return true;
}

function updateListLastUpdateField(list: VersionList): boolean {
	if (!list) return false;
	const listLastUpdatedBox = ElementUtils.getElementOrThrow<HTMLInputElement>("#list-last-updated");

	if (list.lastModified && DateUtils.isValid(list.lastModified)) {
		listLastUpdatedBox.innerText = `This list was last updated on ${DateUtils.extractDateAndTime(list.lastModified, true)} UTC.`;
	} else {
		listLastUpdatedBox.innerText = `This list was last updated on an unknown date.`;
	}
	return true;
}

async function getListFromForm(getLastModifed: boolean = false): Promise<VersionList | null> {
	const listForm = ElementUtils.getElementOrThrow<HTMLInputElement>("#list-form");
	const listFileUploadForm = ElementUtils.getElementOrThrow<HTMLInputElement>("#list-form-file-upload");
	
	let url = "";
	switch (listForm.value) {
		case "Java Edition":
			// TODO: Find way to replace with permalink
			url = "https://raw.githubusercontent.com/Nel-S/latest-version-calculator/refs/heads/development/preset-lists/Minecraft%20Java%20Edition%20Versions.json";
			break;
		case "Xbox 360 Edition":
			url = "https://raw.githubusercontent.com/Nel-S/latest-version-calculator/refs/heads/development/preset-lists/Minecraft%20Xbox%20360%20Versions.json";
			break;
		case "From URL":
			const listURLForm = ElementUtils.getElementOrThrow<HTMLInputElement>("#list-form-url");
			if (!listURLForm.value || !listURLForm.validity) return null;
			url = listURLForm.value;
			break;
		case "From File Upload":
			// Handled in URLUtils.queryUploadedFile
			break;
		default:
			return null;
	}

	const fetchResponse = (listForm.value == "From File Upload") ?
		await URLUtils.queryUploadedFile(listFileUploadForm.files, "chronological-calculator-list-cache") :
		await URLUtils.queryURL(url, "chronological-calculator-list-cache");
	if (!fetchResponse || !fetchResponse.ok) return null;

	// Otherwise parse list and return
	const responseJSON: JSON = await fetchResponse.json();
	if (getLastModifed) {
		if (fetchResponse.headers.has("Last-Modified")) {
			Object.assign(responseJSON, {lastModified: fetchResponse.headers.get("Last-Modified")});
		} else try {
			const urlObject = new URL(url);
			Object.assign(responseJSON, {lastModified: await URLUtils.getGithubLastCommit(urlObject)});
		} catch {
			;
		}
	}
	return versionListSchema.parse(responseJSON);
}

async function recalculate(list: VersionList | null = null): Promise<void> {
	list = await ElementUtils.asyncGetIfNullOrNull<VersionList>(list, getListFromForm, false);
	if (!list) {
		blankOutputs(`[Invalid list]`);
		return;
	}
	const datetime = datetimeWithMemory.read();
	
	const latestEntryIndex = VersionListMethods.getLatestEntryIndexOn(list, datetime);
	const latestEntriesList = VersionListMethods.getFirstEntriesWithMetadata(list, latestEntryIndex);

	for (let i = 0; i < list.metadata.length + 1; ++i) {
		const outputBoxName = ElementUtils.getElementOrThrow(`#output-name-${i}`);
		const outputBoxTime = ElementUtils.getElementOrThrow(`#output-time-${i}`);
		if (!datetime) {
			outputBoxName.innerText = `[Invalid date/time]`;
			outputBoxTime.innerText = "";
			continue;
		}

		if (!latestEntriesList) {
			outputBoxName.innerText = `[None existed]`;
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
		for (let j = 0; j < currentLatestEntry.sources.length; ++j) {
			outputBoxName.innerHTML += `<sup>${VersionListMethods.printLinkable({
				name: `[${j + 1}]`,
				url: currentLatestEntry.sources[j]
			})}</sup>`;
		}
		outputBoxTime.innerText = `~ ${list.highResolution ? DateUtils.extractDateAndTime(currentLatestEntry.timestamp, true) + " UTC" : DateUtils.extractDate(currentLatestEntry.timestamp)}`;
	}
}

window.addEventListener("DOMContentLoaded", initialize);