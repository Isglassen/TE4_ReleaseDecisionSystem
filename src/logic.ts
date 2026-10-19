import { Ticket, TicketStatus } from "./data.js";

export type TicketClassification = "DONE" | "RELEASE_BLOCKER" | "PRIORITY" | "UNASSIGNED" | "ACTIVE";

export interface ClassifiedTicket extends Ticket {
	classification: TicketClassification;
}

export function classifyTicket(ticket: Ticket): TicketClassification {
	if (ticket.status === "done") return "DONE";
	if (ticket.blocked && ticket.severity >= 4) return "RELEASE_BLOCKER";
	if (ticket.severity >= 5) return "RELEASE_BLOCKER";
	if (ticket.owner === null) return "UNASSIGNED";
	if (ticket.customerVip && ticket.severity >= 3) return "PRIORITY";
	return "ACTIVE";
}

export function updateClassification(ticket: Ticket, update = false): ClassifiedTicket {
	return Object.assign(
		update ? ticket : { ...ticket },
		{ classification: classifyTicket(ticket) }
	);
}

const TICKET_STATUSES: TicketStatus[] = ["open", "testing", "done"];
export function isValidTicketStatus(value: unknown): value is TicketStatus {
	if (typeof value !== "string") return false;
	return (TICKET_STATUSES.includes(value as TicketStatus));
}

const TICKET_CLASSIFICATIONS: TicketClassification[] = ["DONE", "RELEASE_BLOCKER", "PRIORITY", "UNASSIGNED", "ACTIVE"];
export function isValidTicketClassification(value: unknown): value is TicketClassification {
	if (typeof value !== "string") return false;
	return (TICKET_CLASSIFICATIONS.includes(value as TicketClassification));
}

export type ReleaseDecision = "RELEASE" | "BLOCK" | "HOLD";

export type ReleaseStats = {
	tickets: Record<TicketClassification, number>;
	workHours: number;
	decision: ReleaseDecision;
}

export function releaseStats(tickets: ClassifiedTicket[]): ReleaseStats {
	let classifications = {
		"RELEASE_BLOCKER": 0,
		"PRIORITY": 0,
		"UNASSIGNED": 0,
		"ACTIVE": 0,
		"DONE": 0
	}

	let workHours = 0;

	for (const ticket of tickets) {
		if (ticket.classification in classifications) {
			classifications[ticket.classification]++;
		}
		if (ticket.status !== "done") {
			workHours += ticket.remainingHours;
		}
	}

	let decision: ReleaseDecision = "RELEASE";
	if (classifications["RELEASE_BLOCKER"] > 0) {
		decision = "BLOCK";
	} else if (workHours > 35 || classifications["UNASSIGNED"] > 0) {
		decision = "HOLD";
	}

	return {
		tickets: classifications,
		workHours,
		decision
	}
}
