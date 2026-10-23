import { loadTickets, saveTickets, Ticket } from "./data.js";
import { ClassifiedTicket, isValidTicketClassification, isValidTicketStatus, releaseStats, TicketClassification, updateClassification } from "./logic.js";

// https://stackoverflow.com/questions/50851045/typescript-generics-return-instance-of-class-parameter
// new (data: any) => T is something that makes instances of type T, which would be the class itself.
// So if type gets the argument HTMLInputElement, then it has type new (data: any) => HTMLInputElement.
// That would in turn make T be HTMLInputElement, and the return type of this function would be HTMLInputElement.
export function getValidatedElement<T extends Element>(query: string, type: new (data: any) => T): T {
	const el = document.querySelector(query);
	if (!el) throw new Error(`Element not found for query: ${query}`);
	if (!(el instanceof type)) throw new Error(`Element for query ${query} is not of type ${type.name}`);
	return el;
}

const ticketList = getValidatedElement("#ticketList", HTMLElement);
const workHours = getValidatedElement("#workHours", HTMLElement);
const releaseDecision = getValidatedElement("#decision", HTMLElement);
const idSearchInput = getValidatedElement("#idSearch", HTMLElement);
const filterSelect = getValidatedElement("#filterStatus", HTMLSelectElement);
const addTicketButton = getValidatedElement("#addTicket", HTMLButtonElement);
const sortSelect = getValidatedElement("#sortBy", HTMLSelectElement);
const formElements = {
	modal: getValidatedElement("#ticketModal", HTMLElement),
	close: getValidatedElement("#closeModal", HTMLElement),
	modalTitle: getValidatedElement("#ticketModalTitle", HTMLElement),
	form: getValidatedElement("#ticketEdit", HTMLFormElement),
	idInput: getValidatedElement("#ticketId", HTMLInputElement),
	titleInput: getValidatedElement("#ticketTitle", HTMLInputElement),
	severityInput: getValidatedElement("#ticketSeverity", HTMLInputElement),
	statusInput: getValidatedElement("#ticketStatus", HTMLSelectElement),
	ownerInput: getValidatedElement("#ticketOwner", HTMLInputElement),
	hoursInput: getValidatedElement("#ticketHours", HTMLInputElement),
	vipInput: getValidatedElement("#ticketCustomerVip", HTMLInputElement),
	blockedInput: getValidatedElement("#ticketBlocked", HTMLInputElement),
	saveButton: getValidatedElement("#ticketSave", HTMLInputElement),
	error: getValidatedElement("#ticketError", HTMLElement),
	deleteButton: getValidatedElement("#ticketDelete", HTMLButtonElement),
}

type SortOption = "severity" | "id" | "hours" | "classification";

const SORT_OPTIONS: SortOption[] = ["severity", "id", "hours", "classification"];
function isValidSortOption(value: unknown): value is SortOption {
	if (typeof value !== "string") return false;
	return SORT_OPTIONS.includes(value as SortOption);
}

const classificationOrder: Record<TicketClassification, number> = {
	"RELEASE_BLOCKER": 0,
	"PRIORITY": 1,
	"UNASSIGNED": 2,
	"ACTIVE": 3,
	"DONE": 4,
}

const sortMethods: Record<SortOption, (a: ClassifiedTicket, b: ClassifiedTicket) => number> = {
	"id": (a, b) => a.id - b.id,
	"severity": (a, b) => b.severity - a.severity,
	"hours": (a, b) => b.remainingHours - a.remainingHours,
	"classification": (a, b) => classificationOrder[a.classification] - classificationOrder[b.classification],
}

type State = {
	search: string | null;
	filter: TicketClassification | null;
	sort: SortOption;
	tickets: ClassifiedTicket[];
	showingTicket: {
		id: number | null;
		create: boolean;
	}
}

const state: State = {
	search: null,
	filter: null,
	sort: "severity",
	tickets: loadTickets(),
	showingTicket: {
		id: null,
		create: false,
	}
}

// Returns a new array with the items sorted into buckets based on the provided bucket functions.
// Each bucket function should return true for items that belong in that bucket.
// On item will be placed in the first matching bucket only.
// Items that do not match any bucket will be placed at the end of the array.
// The buckets should be in the order they should be sorted.
// Also returns the index of the last item of each bucket, so that the caller can know where the buckets end.
function bucketSort<T>(arr: T[], buckets: ((item: T) => boolean)[]): { arr: T[], bucketEnds: number[] } {
	const bucketed: T[][] = buckets.map(() => []);
	const unfound: T[] = [];
	for (const item of arr) {
		let bucketedFlag = false;
		for (let i = 0; i < buckets.length; i++) {
			if (buckets[i](item)) {
				bucketed[i].push(item);
				bucketedFlag = true;
				break;
			}
		}
		if (!bucketedFlag) {
			unfound.push(item);
		}
	}
	let bucketEnds: number[] = [];
	for (let i = 0; i < bucketed.length; i++) {
		if (i === 0) {
			bucketEnds.push(bucketed[i].length - 1);
			continue;
		}
		bucketEnds.push(bucketEnds[i - 1] + bucketed[i].length);
	}
	return { arr: bucketed.flat().concat(unfound), bucketEnds };
}

// Regarding the return type. The tickets are sorted so that one matching the id is first, and ones not matching text are last.
// normalFrom is the index of the first not-highlighted ticket. unfoundFrom is the index of the first ticket that does not match the search text.
// If no ticket matches then this will be higher then the length of the tickets array.
function applySearch<T extends Ticket>(tickets: T[], search: string | null): { tickets: T[], normalFrom: number, unfoundFrom: number } {
	if (search === null) return { tickets, normalFrom: 0, unfoundFrom: tickets.length };
	const exactBucket = (t: T) => exactMatchSearch(t, search);
	const matchBucket = (t: T) => matchesSearch(t, search);
	const { arr: sortedTickets, bucketEnds } = bucketSort(tickets, [exactBucket, matchBucket]);
	const normalFrom = bucketEnds[0] + 1; // First index of the second bucket (matchesSearch)
	const unfoundFrom = bucketEnds[1] + 1; // First index of the third bucket (not matching)
	return { tickets: sortedTickets, normalFrom, unfoundFrom };
}

function exactMatchSearch(ticket: Ticket, search: string): boolean {
	if (ticket.id.toString() === search) return true;
	if (`#${ticket.id}` === search) return true;
	if (ticket.title.toLowerCase() === search.toLowerCase()) return true;
	if (ticket.owner && ticket.owner.toLowerCase() === search.toLowerCase()) return true;
	if (ticket.status.toLowerCase() === search.toLowerCase()) return true;
	return false;
}

function matchesSearch(ticket: Ticket, search: string): boolean {
	if (!search) return true;
	if (ticket.title.toLowerCase().includes(search.toLowerCase())) return true;
	if (ticket.owner && ticket.owner.toLowerCase().includes(search.toLowerCase())) return true;
	if (ticket.status.toLowerCase().includes(search.toLowerCase())) return true;
	if (ticket.id.toString().includes(search)) return true;
	if (`#${ticket.id}`.startsWith(search)) return true;
	return false;
}

function applyFilter<T extends ClassifiedTicket>(tickets: T[], filter: TicketClassification | null): T[] {
	if (!filter) return tickets;
	return tickets.filter(ticket => ticket.classification === filter);
}

function ticketElement(ticket: ClassifiedTicket, className = "") {
	const article = document.createElement("article");
	const idSpan = article.appendChild(document.createElement("span"));
	const titleSpan = article.appendChild(document.createElement("span"));
	const severitySpan = article.appendChild(document.createElement("span"));
	const timeSpan = article.appendChild(document.createElement("span"));
	const classificationSpan = article.appendChild(document.createElement("span"));

	article.className = "ticket " + className;
	article.id = `ticket-${ticket.id}`;
	article.dataset.id = `${ticket.id}`;

	idSpan.classList.add("ticket-id");
	idSpan.textContent = `#${ticket.id}`;

	titleSpan.classList.add("ticket-title");
	titleSpan.textContent = ticket.title;

	severitySpan.classList.add("ticket-severity");
	severitySpan.textContent = `Severity: ${ticket.severity}`;

	timeSpan.classList.add("ticket-time");
	timeSpan.textContent = `${ticket.remainingHours}h`;

	classificationSpan.classList.add("ticket-classification");
	classificationSpan.textContent = ticket.classification;

	return article;
}

function updateFormError(message: string) {
	formElements.error.textContent = message;
}

function closeTicketWindow() {
	state.showingTicket.id = null;
	state.showingTicket.create = false;
	formElements.modal.classList.add("hidden");
}

function displayTicket(ticket: Ticket | null = null) {
	if (state.showingTicket.id !== null) return; // Should not override existing ticket.

	const maxExisting = state.tickets.length > 0 ? Math.max(...state.tickets.map(t => t.id)) : 0;
	const id = ticket?.id ?? maxExisting + 1;

	formElements.modal.classList.remove("hidden");
	formElements.modalTitle.textContent = ticket === null ? "Create Ticket" : `Edit Ticket #${ticket.id}`;
	formElements.idInput.value = `${id}`;
	formElements.titleInput.value = ticket?.title ?? "";
	formElements.severityInput.value = `${ticket?.severity ?? 1}`;
	formElements.statusInput.value = ticket?.status ?? "open";
	formElements.ownerInput.value = ticket?.owner ?? "";
	formElements.hoursInput.value = `${ticket?.remainingHours ?? 0}`;
	formElements.vipInput.checked = ticket?.customerVip ?? false;
	formElements.blockedInput.checked = ticket?.blocked ?? false;

	formElements.saveButton.value = ticket === null ? "Create Ticket" : "Save Changes";
	formElements.deleteButton.disabled = ticket === null;
	if (ticket === null) formElements.deleteButton.classList.add("hidden");
	else formElements.deleteButton.classList.remove("hidden");

	updateFormError("");

	state.showingTicket.id = id;
	state.showingTicket.create = ticket === null;
}

function saveTicket() {
	if (state.showingTicket.id === null) return; // Should not save if no ticket is being shown.

	const title = formElements.titleInput.value.trim();
	const severity = parseInt(formElements.severityInput.value, 10);
	const status = formElements.statusInput.value;
	let owner: string | null = formElements.ownerInput.value.trim();
	const remainingHours = parseInt(formElements.hoursInput.value, 10);
	const customerVip = formElements.vipInput.checked;
	const blocked = formElements.blockedInput.checked;

	if (!title) return updateFormError("Title is required.");
	if (severity < 1 || severity > 5) return updateFormError("Severity must be between 1 and 5.");
	if (!isValidTicketStatus(status)) return updateFormError("Invalid status selected");
	if (owner === "") owner = null; // Allow empty owner to be null.
	if (remainingHours < 0) return updateFormError("Remaining hours cannot be negative.");

	const existingTicket = state.showingTicket.create ? {} : state.tickets.find(t => t.id === state.showingTicket.id);
	if (!existingTicket) return updateFormError("ERROR: Ticket not found.");

	const newData: ClassifiedTicket = {
		id: state.showingTicket.id,
		title: title,
		severity: severity,
		status: status,
		owner: owner,
		remainingHours: remainingHours,
		customerVip: customerVip,
		blocked: blocked,
		classification: "ACTIVE", // WARNING: Default classification, should be updated below.
	}

	const ticket: ClassifiedTicket = Object.assign(existingTicket, newData);
	updateClassification(ticket, true);

	if (state.showingTicket.create) {
		state.tickets.push(ticket);
	}

	saveTickets(state.tickets);

	closeTicketWindow();
}

function render() {
	ticketList.innerHTML = "";

	const { search, filter } = state;

	const tickets = state.tickets.toSorted(sortMethods[state.sort]);

	const filteredTickets = typeof search !== "number" ? applyFilter(tickets, filter) : tickets;

	const { tickets: displayTickets, normalFrom, unfoundFrom } = applySearch(filteredTickets, search);

	displayTickets.forEach((ticket, index) => {
		let className = "";
		if (index < normalFrom) {
			className = "highlight";
		}
		if (index >= unfoundFrom) {
			className = "dimmed";
		}
		ticketList.appendChild(ticketElement(ticket, className));
	});

	const stats = releaseStats(tickets);
	for (const [classification, count] of Object.entries(stats.tickets)) {
		const element = document.getElementById(`count_${classification}`);
		if (element) {
			element.textContent = `${count}`;
		}
	}

	workHours.textContent = `${stats.workHours}`;
	releaseDecision.textContent = `${stats.decision}`;
}

function deleteTicket(id: number) {
	const index = state.tickets.findIndex(t => t.id === id);
	if (index === -1) return; // Ticket not found, nothing to delete.

	state.tickets.splice(index, 1);
	saveTickets(state.tickets);
}

function updateSearch(value: string) {
	if (!value) {
		state.search = null;
		return;
	}

	state.search = value;
}

function updateFilter(value: TicketClassification | "" | null) {
	state.filter = value === "" ? null : value;
}

idSearchInput.addEventListener("input", (event) => {
	if (!(event.target instanceof HTMLInputElement)) return;
	updateSearch(event.target.value);
	render();
});

filterSelect.addEventListener("input", (event) => {
	if (!(event.target instanceof HTMLSelectElement)) return;
	const value = event.target.value;

	const isEmpty = (v: unknown): v is "" => v === "";
	if (!isEmpty(value) && !isValidTicketClassification(value)) return; // Invalid value, ignore.

	updateFilter(value);
	render();
});

sortSelect.addEventListener("input", (event) => {
	if (!(event.target instanceof HTMLSelectElement)) return;
	const value = event.target.value as SortOption;
	if (!isValidSortOption(value)) return; // Invalid value, ignore.

	state.sort = value;
	render();
});

formElements.close.addEventListener("click", () => {
	closeTicketWindow();
});

formElements.form.addEventListener("submit", (event) => {
	event.preventDefault();
	if (!state.showingTicket.id) return; // Can't save if no ticket is being shown.
	saveTicket();
	render();
});

ticketList.addEventListener("click", (event) => {
	if (!(event.target instanceof HTMLElement)) return;

	const el = event.target.closest(".ticket");
	if (!(el instanceof HTMLElement)) return;

	const ticket = state.tickets.find(t => t.id === parseInt(el.dataset.id ?? ""));
	if (!ticket) return;

	displayTicket(ticket);
});

addTicketButton.addEventListener("click", () => {
	displayTicket(null);
});

formElements.deleteButton.addEventListener("click", () => {
	if (!state.showingTicket.id) return;
	if (state.showingTicket.create) return closeTicketWindow(); // Don't delete if creating a new ticket.
	deleteTicket(state.showingTicket.id);
	closeTicketWindow();
	render()
});

render();
