import { Ticket, TicketStatus } from "./data";

export type TicketClassification = "DONE" | "RELEASE_BLOCKER" | "PRIORITY" | "UNASSIGNED" | "ACTIVE";

export interface ClassifiedTicket extends Ticket {
	classification: TicketClassification;
}

export function calssifyTicket(ticket: Ticket): TicketClassification {
	if (ticket.status === "done") return "DONE";
	if (ticket.blocked && ticket.severity >= 4) return "RELEASE_BLOCKER";
	if (ticket.severity >= 5) return "RELEASE_BLOCKER";
	if (ticket.owner === null) return "UNASSIGNED";
	if (ticket.customerVip && ticket.severity >= 3) return "PRIORITY";
	return "ACTIVE";
}

export function updateClassification(ticket: Ticket, update = false): ClassifiedTicket {
	// FIXME: A bit cheated here, but we want to turn the ticket object into a ClassifiedTicket in place.
	const newTicket = (update ? ticket : { ...ticket }) as ClassifiedTicket;
	newTicket.classification = calssifyTicket(newTicket);
	return newTicket;
}

export function isValidTicketStatus(value: unknown): value is TicketStatus {
	if (typeof value !== "string") return false;
	return (["open", "testing", "done"] as TicketStatus[]).includes(value as TicketStatus);
}

export function isValidTicketClassification(value: unknown): value is TicketClassification {
	if (typeof value !== "string") return false;
	return (["DONE", "RELEASE_BLOCKER", "PRIORITY", "UNASSIGNED", "ACTIVE"] as TicketClassification[]).includes(value as TicketClassification);
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
