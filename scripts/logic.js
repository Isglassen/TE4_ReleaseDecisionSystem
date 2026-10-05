export function calssifyTicket(ticket) {
	if (ticket.status === "done") return "DONE";
	if (ticket.blocked && ticket.severity >= 4) return "RELEASE_BLOCKER";
	if (ticket.severity >= 5) return "RELEASE_BLOCKER";
	if (ticket.owner === null) return "UNASSIGNED";
	if (ticket.customerVip && ticket.severity >= 3) return "PRIORITY";
	return "ACTIVE";
}

export function updateClassification(ticket) {
	return { ...ticket, classification: calssifyTicket(ticket) };
}

export function releaseStats(tickets) {
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

	let decision = "RELEASE";
	if (classifications["RELEASE_BLOCKER"] > 0) {
		decision = "BLOCK";
	} else if (workHours > 35 || classifications["UNASSIGNED"] > 0) {
		decision = "HOLD";
	}
}
