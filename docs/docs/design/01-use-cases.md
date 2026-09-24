[← Back to index](README.md)

# 1 · Use Cases

Answers one question: **who can do what?**

Circles are actors, rectangles are actions, and the dashed frame is the system boundary.

```mermaid
flowchart RL
  guest(("Guest")):::actor
  member(("Member")):::actor
  coord(("Outing coordinator")):::actor
  owner(("Circle owner")):::actor

  subgraph sys["Thouq"]
    direction RL
    u1["Register an account"]
    u2["Sign in"]
    u3["Open an invite link"]
    u4["Join a circle"]
    u5["Set preferences"]
    u6["Browse experiences"]
    u7["Generate the plan"]
    u8["Confirm attendance"]
    u9["Open a decision round"]
    u10["Cast a vote"]
    u11["Settle a tie by draw"]
    u12["Create a circle"]
    u13["Remove a member"]
    u14["Transfer ownership"]
    u15["Archive the circle"]
  end

  guest --- u1
  guest --- u3
  guest --- u5
  member --- u2
  member --- u4
  member --- u5
  member --- u6
  member --- u8
  member --- u10
  coord --- u7
  coord --- u9
  coord --- u11
  owner --- u12
  owner --- u13
  owner --- u14
  owner --- u15

  u4 -.->|requires| u2
  u7 -.->|requires| u5
  u10 -.->|requires| u9

  classDef actor fill:#E8EEF4,stroke:#1C4E72,stroke-width:1.5px,color:#131B26;
  style sys fill:#FBFCFD,stroke:#1C4E72,stroke-dasharray:4 3
```

## The four actors

An actor here is not an imagined persona. It is **a distinct way the system identifies a caller and authorises the request**. There are four because the code contains four separate checks.

| Actor | How the system identifies them | Where in the code |
|---|---|---|
| Guest | Invite code in the URL, no account | `groups.invite_code`, `members.token_hash` |
| Member | Bearer session token, SHA-256 hashed at rest | `account_sessions`, `features/accounts/access.py` |
| Outing coordinator | Caller's member id matches the coordinator column | `outings.coordinator_id` |
| Circle owner | Caller's account id matches the owner column | `circles.owner_id` |

One person often holds several roles at once. They are drawn separately because the authorisation checks read from different columns, and each check can fail independently.

## Include relationships

The dashed arrows are `«include»`: the first action cannot run without the second, and the constraint is enforced server-side rather than only in the UI.

| Action | Requires | Why the constraint exists |
|---|---|---|
| Join a circle | Sign in | Membership binds to an account id in `circle_members.account_id` |
| Generate the plan | Set preferences | The planner reads every attending member's preferences to evaluate each experience |
| Cast a vote | Open a decision round | `votes` carries a foreign key into `round_options`, so a vote without a round cannot be written |

## A note on 404 versus 403

Where a caller has no relationship to a resource at all, the API returns **404**, not 403. `circle_access` raises "not available to your account" whether the circle is missing or the caller simply is not a member. This is deliberate: a 403 would confirm that a given circle id exists, which lets an attacker enumerate resources. 403 is reserved for cases where membership is already established but the specific action needs a higher role.

## What was left out

The repository exposes 47 API routes. Fifteen actions remain after removing:

- `GET` routes that read without changing state.
- Undo actions such as withdrawing a vote or cancelling a round, which are implementation details of an existing use case rather than use cases of their own.
