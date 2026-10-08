# Plans

## Top area: Release Summary

- Release blockers
- Priority tickets
- Unassigned tickets
- Work hours left
- Release decision (BLOCK, REVIEW, RELEASE)

## Tickets list

- Each ticket
- Ticket classification

### Ticket

id: number,
title: string,
severity: number
status: "open" | "testing" | "done",
owner: string | null,
remainingHours: number,
customerVip: bool,
blocked: bool

## Rules

done => DONE
blocked & severity >= 4 => BLOCK
severity >= 5 => BLOCK
!owner => UNASSIGNED
VIP & severity >= 3 => PRIORITY
else => ACTIVE

ANY BLOCK => BLOCK
ANY UNASSIGNED | totalHours > 35 => REVIEW
else => RELEASE

## Features

- [X] Search for ticket by id
- [ ] Open ticket details. Possibly editing them.
- [ ] Add tickets. (Save interface as editing?)
- [ ] Save tickets
- [X] Filter tickets
- [ ] Delete tickets
