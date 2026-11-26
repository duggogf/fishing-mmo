# Little Ocean — 06 Harbour Hangout Multiplayer (PAPER PROTOTYPE)

> **Status**: In Design · **Author**: network-programmer (agent A4, technical-director remit) for owner
> **Last Updated**: 2026-11-26 · **Last Verified**: 2026-11-26 · **Implements Pillar**: P4 Together, never required (P1, P2 support)

## Summary

**CONFIRMED (owner D3)**: The prototype does not implement any networking. This doc is the paper spec for the harbour room
(capacity, matching, presence, interpolation, chat, shared encounter ping, bandwidth, hosting cost), a **paper test protocol**
that checks H3 ("Harbour hangout feels alive") without code, and the **code seams** the solo build must keep so networking can be added later.

> **Quick reference**: Layer `Feature` · Priority `MVP (paper)` · Key deps: 02 Sailing (BoatSpeed), 03 World (harbour, encounter lanes), 07 Persistence (block list), 10 UI (chat/ping mock-ups)

## Overview

Up to 8 captains share a *harbour room* (`RoomId`). Each client simulates its own boat locally and sends a small `PresenceSnapshot`
5 times a second. A lightweight relay forwards the room's snapshots, and each client draws remote boats `InterpDelayMs` (450 ms) in the past
using interpolation. Text chat goes to everyone in the room. A room timer on the relay sometimes fires one `EncounterPing` (a passing whale pod),
and every client runs the same whale path from the seed in the ping. Nothing that affects progress (catch, `Shells`, `CargoLoad`, upgrades) is ever sent.
Without a connection the game is the complete solo game (P4).

## Player Fantasy

"The harbour feels alive. There are other little boats coming and going, someone says 'whales off the north buoy!',
and I can choose to sail over, or not." Others are good company and never an obligation: no party, no waiting, no competition.

## Detailed Design

### Core Rules

1. **CONFIRMED (brief §10, §12)**: Local boat movement never waits on the network. `IPresenceService` calls are fire-and-forget and must not block.
2. **CONFIRMED (brief §5, §12)**: Only cosmetic presence data is synced. Economy, catch and progress stay client-local and are never sent.
3. **PROPOSED**: Room `HardCap` = 8 and `SoftCap` = 6. Why: the harbour has 8 berths (A2, 00 §5), chat stays readable (about 16 msgs/min at 8 players), and 8 keeps per-player bandwidth under budget (see Formulas).
4. **PROPOSED, matching rules** (one room covers the whole prototype map, so "nearby" means the same harbour). Rules are applied in order:
   a. A valid `RejoinToken` (less than 120 s old) and a free slot: rejoin the same `RoomId`.
   b. A Steam friend is in a room with a free slot: join that room. Players can opt out of this in settings.
   c. Otherwise, the room with the most players that is still below `SoftCap`, same `ProtocolVersion`. Filling rooms first makes the harbour feel busy.
   d. Otherwise, any room below `HardCap`. e. Otherwise, create a new room.
   f. **Rebalance only while docked**: if a room has had 1 player for 5 min or more, that player is quietly moved to a fuller room the next time they dock. Boats never vanish at sea.
5. **PROPOSED, presence states** (3-bit field in `PresenceSnapshot.Flags`): `Connecting`, `Docked`, `Sailing`, `Compact` (`ViewMode`=Compact),
   `Away` (no input for 300 s and not Compact), `Stale` (receiver-side only: no data for 3 s), `Gone`. The state maps from the local `PhaseKey`:
   Docked/Selling → `Docked`; Sailing/Returning → `Sailing`; Compact → `Compact`.
6. **PROPOSED, chat**: room-wide text, max 140 characters (≤280 B UTF-8). Rate limit is a token bucket: capacity 3, refills 1 token per 2 s.
   The same text sent 3 times within 30 s is dropped. A word filter runs on the relay (and in the client for instant feedback); matches are replaced with `***`.
   **Mute** hides a player for this session. **Block** hides chat and boat name label and is saved locally in `PlayerProgress.BlockedPlayerIds` (07).
   No chat history is kept beyond the session. Reporting is POST-PROTOTYPE (`IChatService::Report` stub).
7. **PROPOSED, encounter ping**: the relay owns the room timer. Clients never trigger encounters, so nobody can farm them. Flow:
   1) The timer fires when the room has ≥2 players: first fire at U(240, 480) s after the room is created, then every U(900, 1500) s (gap > `EncounterDurationS`).
   2) The relay picks an `EncounterId` (prototype: `WhalePodPassing` only), a `LaneId` (spawn lanes owned by A2), and a `Seed`.
   3) It broadcasts `EncounterPing` reliably (or unreliably 3 times, at 0/200/400 ms). 4) Each client dedupes by `EncounterInstanceId` (keeps the last 16 IDs).
   5) Each client simulates the pod locally on 03's `E_WhalePod` lane (y = 350, x −700 → 700 at 2 m/s): `PodPos(t) = Lane.Start + (Lane.End − Lane.Start) × t / DurationS`, `DurationS` = 1400 / 2 = 700 s. The seed varies breach timings only.
   6) UI: compass marker, distance in m, and remaining time (doc 10), plus a system chat line ("Whales sighted near <landmark>").
   7) **Latecomers** get active pings in their join-state message only if `Remaining ≥ 20 s`. 8) At expiry the pod dives (ink VFX) and the marker clears.
   9) **No competition**: every boat within `JournalRadiusM` = 300 m at any moment during the encounter gets the local journal "seen" entry. There is no "first" and no reward race (brief §7).
8. **PROPOSED, relay validation** (agree with security-engineer): drop any snapshot that implies speed > 1.5 × `MaxBoatSpeed` (1.5 × 6.17 = 9.26 m/s) + 2 m slack. Clamp position to map bounds.
   Accept at most 2 × `SnapshotHz` packets/s per client. Log anomalies rate-limited to 1 line per client per 10 s. The only thing a cheater can fake is their own boat's position.

### States and Transitions (client connection)

`Offline` → (online services enabled, Steam reachable) → `Joining` → (JoinOk) → `InRoom` → (no packets for 3 s) → `Degraded` → (no packets for 10 s) → `Reconnecting`
(backoff 2, 4, 8, 16, 30, 30… s; uses `RejoinToken` within 120 s) → `InRoom` or (player chose "Sail solo" / version mismatch) → `Offline`.
In every state, local sailing and fishing run unchanged. Only remote boats, chat and pings appear or disappear.

### Interactions with Other Systems

| System (doc) | Direction | Contract |
|---|---|---|
| Sailing 02 | reads | Position X/Y, heading, `BoatSpeed` from local pawn at `SnapshotHz`; `MaxBoatSpeed` for validation |
| World 03 | reads | Harbour berths (8), `EncounterLane` start/end, map bounds for quantisation |
| Loop 01 / UI 10 | reads | `PhaseKey`, `ViewMode` → presence state; chat & ping widgets are mock-ups only (D3) |
| Crew 04 | none | `CatchRatePerMin` (2.5 fish/min per crew in R1, 5.0 for the starter boat; owner 04) is never sent; 06 only references it |
| Persistence 07 | writes | `BlockedPlayerIds` (local); encounter "seen" goes to journal via local event |
| Art 09 | reads | Remote boats are `ActsLayer` inked cels; 2 paint colours in `Flags` |

### Code seams the solo prototype MUST keep (PROPOSED; ~1.5 dev-days)

Gameplay code includes only these headers. A `ULoOnlineServicesSubsystem : UGameInstanceSubsystem` (UE5, verify) constructs the offline
implementations in the prototype. Adding networking later means adding an implementation, not touching gameplay code.

```cpp
class IPresenceService { public:  // never blocks; results via delegates
  virtual EPresenceConnState GetState() const = 0;                  // Offline in prototype
  virtual void RequestJoin(const FRoomJoinParams& Params) = 0;     // -> OnJoinResult(ERoomJoinResult)
  virtual void Leave() = 0;
  virtual void PublishLocal(const FPresenceSnapshot& Local) = 0;    // called at SnapshotHz
  virtual void GetRemoteBoats(double RenderTimeS, TArray<FRemoteBoatView>& Out) const = 0; };
class IChatService { public:
  virtual EChatSendResult Send(const FString& Text) = 0;  // Sent|RateLimited|Filtered|TooLong|Offline
  virtual void SetMuted(FPlayerNetId Id, bool bMuted) = 0; virtual void Report(FPlayerNetId Id) = 0; /* POST-PROTOTYPE */ };
class IEncounterBroadcast { public:
  virtual void GetActivePings(TArray<FEncounterPing>& Out) const = 0;  // FOnEncounterPing delegate for new pings
};
```
Offline no-ops: `FOfflinePresenceService` (state `Offline`, `PublishLocal` ignored, no remote boats); `FOfflineChatService` (`Send` → `Offline`, chat UI hidden);
`FOfflineEncounterBroadcast` runs a **local timer** (CONFIRMED, loop-1 ruling 5): first fire U(600, 900) s after session start, then every U(1200, 1800) s (PROPOSED; ASSUMPTION – validate by H1 "relaxing" score). It uses the same `E_WhalePod` lane and ping UI, with **no chat line**; the reward is the local journal "seen" entry only. **Optional, PROPOSED (1 dev-day)**: `FRecordedPresenceService` replays a CSV of 7 recorded paths as test doubles,
for doc 10 mock-ups and the P-OBS clip below. It is not networking (D3).

## Formulas

**F1 Interpolation delay**: `InterpDelayMs = (1 + LossTolerance) × 1000 / SnapshotHz + JitterMarginMs`. With `LossTolerance` = 1 (survive 1 lost snapshot),
`SnapshotHz` = 5, `JitterMarginMs` = 50: `2 × 200 + 50 = 450 ms`. Range: 4 Hz → 550 ms; 10 Hz → 250 ms. Render time is `ServerNow − InterpDelayMs`.
Remote boats appear about 75 + 450 = 525 ms behind real time. At `MaxBoatSpeed` 6.17 m/s (02) that is 0.525 × 6.17 = 3.2 m behind, which is invisible because boats never touch or interact.

**F2 Underrun odds (iid loss p)**: extrapolation is needed only when 2 snapshots in a row are lost: `p² = 0.02² = 0.0004` per slot.
At 5 Hz that is 300 slots/min per remote boat, so about 0.12 extrapolation events/min/boat, each ≤ 200 ms. Three in a row (`p³ = 8e-6`) happens about 0.0024/min.

**F3 Extrapolation error during a turn**: `Err ≈ v × ω × t² / 2`. `MaxBoatSpeed` v = 12 kn = 6.17 m/s (CONFIRMED, doc 02).
Turn rate at Full ω = 27°/s = 0.471 rad/s (02 F3). At `t` = 0.2 s: `6.17 × 0.471 × 0.04 / 2 = 0.058 m`. At the cap `ExtrapCapMs` = 300 ms: 0.13 m (at Slow, 2.06 m/s and 39°/s: 0.06 m). After the cap the boat holds position and keeps its local bob.

**F4 Visible pop**: camera per doc 02 (D8): 28 m spring arm, FOV 60° (horizontal) at 1920 px. Worst case is a remote boat at the player's own camera distance: `2 × 28 × tan30° / 1920 = 0.0168 m/px` (farther boats are smaller).
Corrections are blended over `CorrectionBlendMs` = 250 ms (15 frames at 60 fps). A 0.5 m error therefore moves the boat 0.033 m/frame (≈ 2.0 px), a slight glide, not a pop.
Errors over `SnapThresholdM` = 25 m snap with a fade. "Pop" means a single-frame deviation > 0.15 m (≈ 8.9 px at 28 m; was 2.4 px under the old 60 m / 90° assumption). The 0.15 m threshold stays as the P-SIM metric, but a pop is now clearly visible at close range, so the ≤ 1% pop budget matters more.

**F5 Message sizes** (bytes). Header 8 = `ProtocolVersion` u8, `MsgType` u8, `Seq` u16, `ServerTimeMs` u32.
`PresenceSnapshot` 8 = `Slot` u8, `PosX` u16, `PosY` u16 (quantised over a 2048 m extent: 2048 / 65536 = 0.031 m step; covers 03's bounds x −800..800, y −200..1400 with origin offset (−1024, −324)), `Heading` u8 (1.4°),
`Speed` u8 (0.05 m/s step), `Flags` u8 (state 3b, anchored, paint, typing, 2 spare). Transport overhead `Ovh` = IPv4 20 + UDP 8 + transport 16 = 44
(ASSUMPTION; verify with chosen transport, e.g. Steam Networking Sockets). `EncounterPing` = header 8 + 17 = 25 B. Chat = header 8 + 2 + text (average 40) = 50 B.

**F6 Bandwidth per player**: `Down = SnapshotHz × (8 + 8 × (N−1) + Ovh) × 8 / 1000` kbit/s; `Up = SnapshotHz × (8 + 8 + Ovh) × 8 / 1000`.
Chat: `ChatDown = N × (1 / ChatIntervalS) × (50 + Ovh) × 8 / 1000`. Here `ChatIntervalS` = 30 (ASSUMPTION; validate by P-TAB chat counts).
**Worked, N = 8 at 5 Hz**: Down = 5 × (8 + 56 + 44) = 540 B/s = **4.32 kbit/s**. ChatDown = 8/30 × 94 × 8 / 1000 = 0.20. **Total down 4.52 kbit/s, up 2.43 kbit/s**.
At 10 Hz, down would be 8.84 kbit/s, which exceeds the `PlayerDownBudget` of 8 kbit/s. This is a second reason to choose 5 Hz.
**Per room (relay)**: egress 8 × 4.52 = **36.2 kbit/s**, ingress 8 × 2.43 = **19.4 kbit/s**. Relay packets: 8 in + 8 out × 5 Hz = 80 pps/room.

**F7 Per 1k CCU**: `Rooms = CCU / AvgFill` = 1000 / 6 = 167. Egress 1000 × 4.52 = **4.52 Mbit/s**. Relay load: 10,000 pps.
If 1k CCU is sustained for a month: 4.52e6 / 8 × 2,592,000 s = **1.46 TB/month egress**. Cost is sized to *peak* CCU (CPU) and *average* CCU (traffic).

**F8 Hosting options per 1k CCU/month** (all prices ASSUMPTION; verify against live price lists before committing):

| Option | Infra cost | Pros | Cons |
|---|---|---|---|
| A. Steam lobbies + player host via Steam Datagram Relay | **~$0** (host uplink 7 × 4.52 = 32 kbit/s) | No servers, free NAT/relay | Host migration needed; encounter timer and filter live on a client |
| **B. Own tiny relay (single non-UE binary) on 2 budget VPS (20 TB traffic included)** | **~$15–25** (on a hyperscaler at $0.09/GB: 1,464 GB × 0.09 + 2 VMs ≈ $165) | Neutral timer, server-side filter, ~10k pps fits 1 vCPU | ~8–10 dev-days relay + ops |
| C. Managed rooms SaaS (per-CCU plan) | ~$100–300 | Zero ops | Vendor lock-in, per-CCU pricing |
| D. UE dedicated server per room | ~$200–500 (167 processes × ~150 MB RAM) | Stock UE replication | Rejected: 00 §3 DO NOT BUILD, brief §10 "avoid MMO infra" |

**PROPOSED: B**, with A as the zero-cost fallback (owner Q3). At 100 CCU, B costs about $5–10 (one VPS).
Per player-hour: $20 / (1000 × 730) ≈ $0.00003. Post-prototype build estimate: ~30–35 dev-days (ASSUMPTION – validate by a 1-week spike).

## Edge Cases (failure cases)

| Case | Defined outcome |
|---|---|
| Local client loses connection | Local play continues. Remote boats hold, go `Stale` (names dimmed), then fade out over 2 s at 10 s. A small banner says "Sailing solo for now". The chat box greys out and unsent text stays in the field. Reconnect backoff per States. |
| Remote player disconnects | Their boat holds its last pose, goes `Stale` at 3 s, fades out over 2 s at 10 s. The slot is held 120 s for `RejoinToken`. A system line says "<name> drifted off". |
| Relay outage (start or mid-session) | Same as local loss for all clients, and the game never shows a modal. An active encounter keeps playing locally until expiry (its path is deterministic). Matchmaking retries every 30 s from harbour only. |
| Version mismatch | Join is rejected with `VersionMismatch`. The game shows "Update to join the harbour" and continues offline. |
| Room fills between match and join | `RoomFull` → apply the next matching rule. After 3 failures, create a new room. |
| Steam offline mode / no account | `Offline` state. Services are the no-op implementations and the solo loop is untouched. |
| Ping packet lost | Reliable channel or 3× redundancy. If all are lost, the latecomer rule still shows the ping in the next join-state. Missing a ping costs nothing (no reward race). |
| Two pings overlap | Not possible: the timer gap (≥900 s) is longer than the 700 s duration. The client still supports ≥2 pings by `EncounterInstanceId`. |
| Spam / abuse in chat | Token bucket and duplicate drop. Filtered words become `***`. The receiver can Mute/Block; Block persists locally. |
| Teleport/speed-hack snapshot | The relay drops it and logs (rate-limited). Receivers snap with a fade if the error is > 25 m. Only cosmetic data is affected. |
| Clock skew | `ClockOffset` = EWMA of (ServerTimeMs − local − RTT/2), α = 0.1. Interpolation uses server time, so local wall clock is irrelevant. |
| Player in `Compact` | Keeps sending at 5 Hz (~2.4 kbit/s, negligible for H4). Others see the "Compact" lantern icon and do not expect replies. |

## Dependencies

02 Sailing (`MaxBoatSpeed`, turn rate), 03 World (berths, `E_WhalePod` lane y = 350 at 2 m/s, map bounds x −800..800 / y −200..1400), 07 Persistence (`BlockedPlayerIds`), 10 UI (chat/ping/presence mock-ups),
09 Art (remote boat cel and ping ripple VFX). Reverse: 07 and 10 must reference this doc for those fields. Post-prototype dependencies: Steamworks (lobbies, SDR, friends), relay host (devops-engineer).

## Tuning Knobs

| Knob | Value | Safe range | Affects |
|---|---|---|---|
| `SnapshotHz` | 5 | 4–10 | Smoothness vs bandwidth (F6) |
| `InterpDelayMs` | 450 (F1) | 250–600 | Jitter tolerance vs lag behind truth |
| `ExtrapCapMs` | 300 | 150–500 | How long a boat coasts on loss |
| `CorrectionBlendMs` / `SnapThresholdM` | 250 / 25 | 150–500 / 10–50 | Pop visibility |
| `HardCap` / `SoftCap` | 8 / 6 | 4–12 / 4–HardCap | Liveliness vs chat noise |
| `EncounterGapS` | U(900, 1500), first U(240, 480); offline U(1200, 1800), first U(600, 900) | min > `EncounterDurationS` + 120 | Ping frequency (~2 per 45 min online) |
| `EncounterDurationS` / `JournalRadiusM` | 700 (lane 1400 m / 2 m/s) / 300 | ≥ 300 / 150–500 | Time to reach ping without pressure |
| Chat bucket / max chars | 3 tokens, 1 per 2 s / 140 | 2–5, 1–5 s / 100–200 | Spam vs expression |
| `StaleS` / `DisconnectGraceS` / `RejoinGraceS` | 3 / 10 / 120 | 2–5 / 5–30 / 60–300 | Disconnect feel |

## Visual/Audio Requirements

Remote boats use the same `ActsLayer` inked cel as the local boat, in 1 of 2 paint colours, with a name label in a UI token colour (09/10).
The ping ripple is a hard-edged ink ring drawn on twos on the *painted* sea surface. Whale pod = inked cels. A soft horn/whale-call stinger plays when a ping arrives (heard within 1500 m, ducked in Compact).
Fade-outs on disconnect are a 2 s alpha dissolve of the cel, with no particle "poof".

## Game Feel

Remote boats glide and never stutter. A disconnect reads as someone sailing off, not as an error. Pings are invitations: no countdown pressure colours and no "hurry" text.
**Reach check (worked)**: from the farthest R2 point (±700, 1300) to within 300 m of the lane (y = 350): (950 − 300) / 6.17 = 105 s.
Closing on the pod along the lane then takes at most 1400 m / (6.17 + 2) m/s = 171 s. Worst case ≈ 276 s, well inside the 700 s pass.
The old 180 s window would have failed this check, so the window is now the full lane pass.

## UI Requirements

Mock-ups only (D3, owned by doc 10): chat panel (140-char counter; feedback text for rate limits and `Offline`), player list with Mute/Block,
presence icons (Docked anchor, Compact lantern, Away zz), ping compass marker with distance (m) and remaining time, "Sailing solo for now" banner.

## Cross-References

00 §2 H3, §3, §6, §9 D3 · brief §6, §7, §10, §12 · 02 (`MaxBoatSpeed` 6.17 m/s, 27°/s at Full), 03 (map bounds, `E_WhalePod`), 04 (catch rates, not synced), 07, 09, 10 · `.claude/agents/ue-replication-specialist.md` (post-prototype).

## Paper Test Protocol (replaces H3 live test, owner D3)

| ID | Method (no code) | Pass if | Fail if |
|---|---|---|---|
| P-SIM | Spreadsheet: a 600 s truth path (straight, 27°/s turns, anchor stops) at 6.17 m/s inside 03's bounds, sampled at `SnapshotHz`. One-way latency 75 ms ± U(0, 30) jitter; loss 2% iid plus a burst variant (Gilbert: 1% enter, 3-packet mean burst). Render at 60 fps using F1–F4. | Underrun (extrapolating) frames ≤ 1%; frames with pop > 0.15 m ≤ 1% (i.e. ≥ 99% smooth vs the H3 90% observer bar); no hold > 1 s in iid run | Any of these is exceeded at 5 Hz *and* at 10 Hz |
| P-BW | Spreadsheet of F5–F8 for N = 2…8, Hz = 4/5/10 | ≤ 8 kbit/s down and ≤ 4 up per player at 5 Hz, N = 8; room egress ≤ 64 kbit/s; option B ≤ $100 per 1k CCU/month | Budget only met below 4 Hz |
| P-TAB | Wizard-of-Oz hangout: 6–8 testers, 30 min. Shared online whiteboard map (1 grid square = 100 m) with boat tokens each tester moves freely. A facilitator ("relay") copies positions onto the "others' view" board every 5 s. A text channel enforces 140 chars, 2 s slowmode and a word list. The facilitator posts 2 scripted whale pings (grid ref + 3-min timer). | ≥ 60% send ≥ 1 chat; ≥ 50% move toward a ping within 60 s; ≥ 60% rate "I felt other sailors around me" ≥ 4/5; ≤ 1 tester reports feeling obliged or pressured (P4) | ≥ 40% "didn't notice others", or ≥ 3 pressure complaints |
| P-WALK | Desk check of 10 scripted cases: spam burst, slur, 141-char message, block then rejoin, latecomer at 25 s and 15 s remaining, disconnect mid-ping, relay outage, version mismatch, room-full race | Every case has exactly one outcome in this doc; 0 cases lose local control | Any undefined or contradictory outcome |
| P-OBS (optional) | Clip of `FRecordedPresenceService` replay with P-SIM-perturbed samples, shown to 5 people | ≤ 1 of 5 notices jitter | ≥ 3 notice jitter |

## Acceptance Criteria

1. (H3/P-SIM) At 5 Hz, 150 ms RTT, 2% loss: ≤ 1% extrapolating frames and ≤ 1% pop frames. 2. (H3/P-BW) Per-player down ≤ 8 kbit/s at N = 8.
3. (H3/P-TAB) Chat ≥ 60%, ping response ≥ 50% within 60 s, "felt company" ≥ 60%. 4. (H3/P-WALK) 10/10 cases defined, none blocks local play.
5. (Seams) The prototype compiles and runs with only `FOffline*` services. Gameplay code has 0 includes of networking/Steam headers (grep check).
6. (Brief §12) No field in F5 carries catch, `Shells`, `CargoLoad` or upgrades (review check).

## Open Questions

1. Owner Q3: approve option B (own relay) vs A (Steam player host)? This changes moderation authority and cost (~$20 vs $0 per 1k CCU).
2. Should players be able to drop their own "sighting" marker (brief §6 "share clues")? Proposal: rate-limited 1 per 60 s, POST-PROTOTYPE.
3. Chat language buckets in matching (rule 4c) once there is a real player base?

## Interface values

| Name | Value | Unit | Label | Consumed by |
|---|---|---|---|---|
| `HardCap` / `SoftCap` | 8 / 6 | players | PROPOSED | 03 (berths), 10 |
| `SnapshotHz` | 5 | Hz | PROPOSED | 02, 08 |
| `InterpDelayMs` / `ExtrapCapMs` | 450 / 300 | ms | PROPOSED | — |
| `PresenceSnapshot` | 8 (+8 header, +44 ovh) | B | PROPOSED | — |
| Bandwidth per player (N = 8) | 4.52 down / 2.43 up | kbit/s | PROPOSED | devops |
| Bandwidth per room | 36.2 egress / 19.4 ingress | kbit/s | PROPOSED | devops |
| Cost per 1k CCU (option B) | ~$15–25 / month | USD | ASSUMPTION | owner |
| `EncounterDurationS` / `JournalRadiusM` | 700 / 300 | s / m | PROPOSED | 03, 10 |
| Chat max / rate | 140 chars / 3 burst, 1 per 2 s | — | PROPOSED | 10 |
| `BlockedPlayerIds` | ≤ 200 entries | Steam IDs | PROPOSED | 07 |
| `MaxBoatSpeed` (input) | 6.17 | m/s | CONFIRMED (02) | 02 |
| Position quantisation extent (input) | 2048 (step 0.031) | m | CONFIRMED (03 bounds) | 03 |
