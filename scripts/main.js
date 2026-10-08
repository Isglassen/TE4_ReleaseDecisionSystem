import { loadTickets, saveTickets } from "./data.js";
import { releaseStats, updateClassification } from "./logic.js";

const ticketList = document.getElementById("ticketList");
const workHours = document.getElementById("workHours");
const releaseDecision = document.getElementById("decision");
const idSearchInput = document.getElementById("idSearch");
const filterSelect = document.getElementById("filterStatus");
const addTicketButton = document.getElementById("addTicket");
const formElements = {
	modal: document.getElementById("ticketModal"),
	close: document.getElementById("closeModal"),
	modalTitle: document.getElementById("ticketModalTitle"),
	form: document.getElementById("ticketEdit"),
	idInput: document.getElementById("ticketId"),
	titleInput: document.getElementById("ticketTitle"),
	severityInput: document.getElementById("ticketSeverity"),
	statusInput: document.getElementById("ticketStatus"),
	ownerInput: document.getElementById("ticketOwner"),
	hoursInput: document.getElementById("ticketHours"),
	vipInput: document.getElementById("ticketCustomerVip"),
	blockedInput: document.getElementById("ticketBlocked"),
	saveButton: document.getElementById("ticketSave"),
	error: document.getElementById("ticketError"),
}

const state = {
	search: null,
	filter: null,
	tickets: loadTickets(),
	showingTicket: {
		id: null,
		create: false,
	}
}

function applySearch(tickets, id) {
	// Matching ticket becomes 1, non matching becomes 0. Sort descending so matching ticket is first.
	const matchFirst = tickets.toSorted((a, b) => (b.id === id) - (a.id === id))
	return matchFirst;
}

function applyFilter(tickets, filter) {
	if (!filter) return tickets;
	return tickets.filter(ticket => ticket.classification === filter);
}

function ticketElement(ticket, highlight = false) {
	const article = document.createElement("article");
	const idSpan = article.appendChild(document.createElement("span"));
	const titleSpan = article.appendChild(document.createElement("span"));
	const severitySpan = article.appendChild(document.createElement("span"));
	const timeSpan = article.appendChild(document.createElement("span"));
	const classificationSpan = article.appendChild(document.createElement("span"));

	article.classList.add("ticket");
	article.id = `ticket-${ticket.id}`;
	article.dataset.id = ticket.id;
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

function updateFormError(message) {
	ticketError.textContent = message;
}

function closeTicketWindow() {
	state.showingTicket.id = null;
	state.showingTicket.create = false;
	formElements.modal.classList.add("hidden");
}

function displayTicket(ticket = null) {
	if (state.showingTicket.id !== null) return; // Should not override existing ticket.

	const id = ticket?.id ?? Math.max(...state.tickets.map(t => t.id)) + 1;

	formElements.modal.classList.remove("hidden");
	formElements.modalTitle.textContent = ticket === null ? "Create Ticket" : `Edit Ticket #${ticket.id}`;
	formElements.idInput.value = id;
	formElements.titleInput.value = ticket?.title ?? "";
	formElements.severityInput.value = ticket?.severity ?? 1;
	formElements.statusInput.value = ticket?.status ?? "open";
	formElements.ownerInput.value = ticket?.owner ?? "";
	formElements.hoursInput.value = ticket?.remainingHours ?? 0;
	formElements.vipInput.checked = ticket?.customerVip ?? false;
	formElements.blockedInput.checked = ticket?.blocked ?? false;

	formElements.saveButton.value = ticket === null ? "Create Ticket" : "Save Changes";

	updateFormError("");

	state.showingTicket.id = id;
	state.showingTicket.create = ticket === null;
}

function saveTicket() {
	if (state.showingTicket.id === null) return; // Should not save if no ticket is being shown.

	const title = formElements.titleInput.value.trim();
	const severity = parseInt(formElements.severityInput.value, 10);
	const status = formElements.statusInput.value;
	let owner = formElements.ownerInput.value.trim();
	const remainingHours = parseInt(formElements.hoursInput.value, 10);
	const customerVip = formElements.vipInput.checked;
	const blocked = formElements.blockedInput.checked;

	if (!title) return updateFormError("Title is required.");
	if (severity < 1 || severity > 5) return updateFormError("Severity must be between 1 and 5.");
	if (!["open", "testing", "done"].includes(status)) return updateFormError("Invalid status selected");
	if (owner === "") owner = null; // Allow empty owner to be null.
	if (remainingHours < 0) return updateFormError("Remaining hours cannot be negative.");

	const ticket = state.showingTicket.create ? {} : state.tickets.find(t => t.id === state.showingTicket.id);
	ticket.id = state.showingTicket.id;
	ticket.title = title;
	ticket.severity = severity;
	ticket.status = status;
	ticket.owner = owner;
	ticket.remainingHours = remainingHours;
	ticket.customerVip = customerVip;
	ticket.blocked = blocked;

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
	const tickets = state.tickets.toSorted((a, b) => b.severity - a.severity);

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
			element.textContent = count;
		}
	}

	workHours.textContent = stats.workHours;
	releaseDecision.textContent = stats.decision;
}

// This function handles both strings, numbers and null.
// Strings get converted to numbers, or null if NaN.
function updateSearch(value) {
	let num = value !== null ? parseInt(value, 10) : null;
	if (isNaN(num)) num = null;
	state.search = num;
}

function updateFilter(value) {
	state.filter = value === "" ? null : value;
}

idSearchInput.addEventListener("input", (event) => {
	updateSearch(event.target.value);
	render();
});

filterSelect.addEventListener("input", (event) => {
	updateFilter(event.target.value);
	render();
});


formElements.close.addEventListener("click", () => {
	closeTicketWindow();
});

formElements.form.addEventListener("submit", (event) => {
	event.preventDefault();
	saveTicket();
	render();
});

ticketList.addEventListener("click", (event) => {
	const el = event.target.closest(".ticket");
	if (!el) return;

	const ticket = state.tickets.find(t => t.id === parseInt(el.dataset.id));
	if (!ticket) return;

	displayTicket(ticket);
});

addTicketButton.addEventListener("click", () => {
	displayTicket(null);
});

render()
