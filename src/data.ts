import { updateClassification } from "./logic.js";

export type TicketStatus = "open" | "testing" | "done";

export interface Ticket {
	id: number;
	title: string;
	severity: number;
	status: TicketStatus;
	owner: string | null;
	remainingHours: number;
	customerVip: boolean;
	blocked: boolean;
}

const BASE_TICKETS: Ticket[] = [
	{ id: 101, title: "Login outage", severity: 5, status: "open", owner: "Ava", remainingHours: 6, customerVip: true, blocked: false },
	{ id: 102, title: "Export slow", severity: 3, status: "open", owner: "Noah", remainingHours: 4, customerVip: false, blocked: false },
	{ id: 103, title: "Payment error", severity: 5, status: "testing", owner: "Ava", remainingHours: 9, customerVip: true, blocked: true },
	{ id: 104, title: "Avatar upload", severity: 2, status: "done", owner: "Mira", remainingHours: 3, customerVip: false, blocked: false },
	{ id: 105, title: "Search ranking", severity: 3, status: "open", owner: "Noah", remainingHours: 7, customerVip: true, blocked: false },
	{ id: 106, title: "Role permissions", severity: 4, status: "testing", owner: "Leo", remainingHours: 8, customerVip: false, blocked: false },
	{ id: 107, title: "Email delay", severity: 2, status: "open", owner: null, remainingHours: 2, customerVip: true, blocked: false },
	{ id: 108, title: "Backup failure", severity: 5, status: "open", owner: "Mira", remainingHours: 10, customerVip: false, blocked: true },
	{ id: 109, title: "Report totals", severity: 3, status: "done", owner: "Leo", remainingHours: 5, customerVip: false, blocked: false },
	{ id: 110, title: "Session timeout", severity: 4, status: "open", owner: "Ava", remainingHours: 6, customerVip: false, blocked: false },
	{ id: 111, title: "Mobile menu", severity: 1, status: "done", owner: "Noah", remainingHours: 2, customerVip: false, blocked: false },
	{ id: 112, title: "Invoice mismatch", severity: 4, status: "testing", owner: null, remainingHours: 7, customerVip: true, blocked: false }
];

export function loadTickets() {
	const dataString = localStorage.getItem("tickets");
	if (!dataString) {
		return BASE_TICKETS.map((t) => updateClassification(t));
	}
	// FIXME: Currently no validation of localStorage data.
	const ticketData = JSON.parse(dataString) as Ticket[] | null;
	if (ticketData) {
		return ticketData.map((t) => updateClassification(t));
	}
	return BASE_TICKETS.map((t) => updateClassification(t));
}

export function saveTickets(tickets: Ticket[]) {
	const toSave = tickets.map(ticket => {
		return { ...ticket, classification: undefined };
	});
	localStorage.setItem("tickets", JSON.stringify(toSave));
}
