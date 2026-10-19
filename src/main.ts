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
	search: number | null;
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

function applySearch<T extends Ticket>(tickets: T[], id: number): T[] {
	// Matching ticket becomes 1, non matching becomes 0. Sort descending so matching ticket is first.
	const matchFirst = tickets.toSorted((a, b) => +(b.id === id) - +(a.id === id))
	return matchFirst;
}

function applyFilter<T extends ClassifiedTicket>(tickets: T[], filter: TicketClassification | null): T[] {
	if (!filter) return tickets;
	return tickets.filter(ticket => ticket.classification === filter);
}

function ticketElement(ticket: ClassifiedTicket, highlight = false) {
	const article = document.createElement("article");
	const idSpan = article.appendChild(document.createElement("span"));
	const titleSpan = article.appendChild(document.createElement("span"));
	const severitySpan = article.appendChild(document.createElement("span"));
	const timeSpan = article.appendChild(document.createElement("span"));
	const classificationSpan = article.appendChild(document.createElement("span"));

	article.classList.add("ticket");
	article.id = `ticket-${ticket.id}`;
	article.dataset.id = `${ticket.id}`;
	if (highlight) article.classList.add("highlight");

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

	const id = ticket?.id ?? Math.max(...state.tickets.map(t => t.id)) + 1;

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

	// Sort tickets by severity descending.
	const tickets = state.tickets.toSorted(sortMethods[state.sort]);

	// Get the highlighted ticket first if search is not null.
	const displayTickets = search === null
		? applyFilter(tickets, filter)
		: applySearch(applyFilter(tickets, filter), search);

	displayTickets.forEach(ticket => {
		// Display ticket, if ticket id is the searched one highlight it.
		ticketList.appendChild(ticketElement(ticket, ticket.id === search));
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

// This function handles both strings, numbers and null.
// Strings get converted to numbers, or null if NaN.
function updateSearch(value: string | number | null) {
	let num: number | null = value !== null ? parseInt(`${value}`, 10) : null;
	if (num === null || isNaN(num)) num = null;
	state.search = num;
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
