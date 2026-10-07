import { loadTickets } from "./data.js";
import { releaseStats } from "./logic.js";

const ticketList = document.getElementById("ticketList");
const workHours = document.getElementById("workHours");
const releaseDecision = document.getElementById("decision");
const idSearchInput = document.getElementById("idSearch");
const filterSelect = document.getElementById("filterStatus");

const state = {
	search: null,
	filter: null,
	tickets: loadTickets(),
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

render()
