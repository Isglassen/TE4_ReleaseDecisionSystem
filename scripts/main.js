import { loadTickets } from "./data.js";
import { releaseStats } from "./logic.js";

const ticketList = document.getElementById("ticketList");
const workHours = document.getElementById("workHours");
const releaseDecision = document.getElementById("decision");

const tickets = loadTickets();

function ticketElement(ticket) {
	const article = document.createElement("article");
	const idSpan = article.appendChild(document.createElement("span"));
	const titleSpan = article.appendChild(document.createElement("span"));
	const severitySpan = article.appendChild(document.createElement("span"));
	const timeSpan = article.appendChild(document.createElement("span"));
	const classificationSpan = article.appendChild(document.createElement("span"));

	article.classList.add("ticket");
	article.id = `ticket-${ticket.id}`;

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

	tickets.forEach(ticket => {
		ticketList.appendChild(ticketElement(ticket));
	});

	const stats = releaseStats(tickets);
	for (const [classification, count] of Object.entries(stats.tickets)) {
		const element = document.getElementById(`count_${classification}`);
		if (element) {
			element.textContent = count;
		}
	}

	workHours.textContent = stats.workHours;
	decision.textContent = stats.decision;
}

render()
