import {DatetimeWithMemory} from "./datememory.js";
import {DateUtils, ElementUtils} from "./util.js"
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
		const outputContainer = ElementUtils.getElementOrThrow<HTMLInputElement>("#output-container");
		outputContainer.innerHTML = `
			<div class="list-name">
				[Waiting${urlUnhidden ? " for URL" : fileUploadUnhidden ? " for file upload" : ""}...]
			</div>
		`;
		return;
	}
	// Otherwise, perform a recalculation.
	await updatePageForList();
}

async function updatePageForList(): Promise<void> {
	const list = await getListFromForm();
	if (!list) throw new Error("Invalid list.");

	updateOutputBoxes(list);
	updateDatetimeResolution(list);
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

async function getListFromForm(): Promise<VersionList | null> {
	const listForm = ElementUtils.getElementOrThrow<HTMLInputElement>("#list-form");
	const listFileUploadForm = ElementUtils.getElementOrThrow<HTMLInputElement>("#list-form-file-upload");
	
	let url = "";
	switch (listForm.value) {
		case "Java Edition":
			// TODO: Find way to replace with permalink
			url = "https://raw.githubusercontent.com/Nel-S/latest-version-calculator/refs/heads/development/preset-lists/java.json";
			break;
		case "Xbox 360 Edition":
			url = "https://raw.githubusercontent.com/Nel-S/latest-version-calculator/refs/heads/development/preset-lists/xbox-360.json";
			break;
		case "From URL":
			const listURLForm = ElementUtils.getElementOrThrow<HTMLInputElement>("#list-form-url");
			if (!listURLForm.value || !listURLForm.validity) return null;
			url = listURLForm.value;
			break;
		case "From File Upload":
			if (!listFileUploadForm.files) return null;
			url = `/uploaded-files/${listFileUploadForm.files[0].name}-${listFileUploadForm.files[0].size}`;
			break;
		default:
			return null;
	}

	// Check cache for URL
	const listCache = await caches.open("chronological-calculator-list-cache");
	let fetchResponse = await listCache.match(url);
	// If not present, fetch it, and cache it if it's not an error
	if (!fetchResponse) {
		if (url.startsWith("/uploaded-files/")) {
			if (!listFileUploadForm.files) return null;
			fetchResponse = new Response(await listFileUploadForm.files[0].text());
		} else try {
			fetchResponse = await fetch(url);
		} catch {
			return null;
		}
		if (fetchResponse.ok) await listCache.put(url, fetchResponse.clone());
	}
	// If the equest did error, return null
	if (!fetchResponse.ok) return null;

	// Otherwise parse list and return
	return versionListSchema.parse(await fetchResponse.json());
}

async function recalculate(list: VersionList | null = null): Promise<void> {
	const sourcesOutput = ElementUtils.getElementOrThrow("#sources-list");

	list = await ElementUtils.asyncGetIfNullOrNull<VersionList>(list, getListFromForm);
	if (!list || !list.sources || !list.sources.length) sourcesOutput.innerHTML = "[None]";
	else {
		sourcesOutput.innerHTML = "";
		for (const source of list.sources) {
			sourcesOutput.innerHTML += `<li>${VersionListMethods.printLinkable(source)}</li>`;
		}
	}

	if (!list) {
		const outputContainer = ElementUtils.getElementOrThrow("#output-container");
		outputContainer.innerHTML = `
			<div class="list-name">
				[Invalid list]
			</div>
		`;
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
		outputBoxTime.innerText = `~ ${list.highResolution ? DateUtils.extractDateAndTime(currentLatestEntry.timestamp, true) + " UTC" : DateUtils.extractDate(currentLatestEntry.timestamp)}`;
	}
}

window.addEventListener("DOMContentLoaded", initialize);