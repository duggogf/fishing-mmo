# Little Ocean — 07 Persistence, Offline Rules and Service Stubs

> **Status**: In Design · **Author**: network-programmer (agent A4, technical-director remit) for owner
> **Last Updated**: 2026-11-26 · **Last Verified**: 2026-11-26 · **Implements Pillar**: P4 (solo complete, offline-capable), P2/brief §12 (no offline fishing)

## Summary

The prototype has one local save slot holding `PlayerProgress`. It has a schema version, autosaves on events plus every 60 s, and survives
corruption through atomic writes and 2 rotating backups. The game is fully playable offline. **Fishing only happens while the game runs**, and the
design enforces this: the game never computes elapsed time at load. `ICloudSaveService` and `IRareDropService` exist only as stubs that return
"not implemented"/"ineligible". The Steam Inventory redemption flow is designed on paper only.

> **Quick reference**: Layer `Foundation` · Priority `MVP` · Key deps: 01/04/05/11 (fields), 06 (`BlockedPlayerIds`), 08 (Compact quit/suspend)

## Overview

**CONFIRMED (brief §10, 00 §3)**: local-first. All progress lives in a UE5 `USaveGame` subclass `ULoSaveGame` (verify), written by a
`ULoSaveSubsystem : UGameInstanceSubsystem` (verify) through `UGameplayStatics::AsyncSaveGameToSlot` (verify). No server is ever needed for the solo loop.
**CONFIRMED (owner D3)**: no live services are built. Cloud save and rare drops are interface stubs.

## Player Fantasy

"My boat is exactly where I left it, with the same fish in the hold. Nothing was lost and nothing magically appeared."
The game is calm and trustworthy: closing it is safe and never punishes you, and opening it never shows a "while you were away" chore screen.

## Detailed Design

### Core Rules

1. **PROPOSED, single slot** `LittleOcean_Slot0` in the UE default `Saved/SaveGames/` under the user's local app data (verify path for shipping builds).
2. **PROPOSED, schema `PlayerProgress` v1** (field names follow §6 where they exist):

| Field | Type | Notes |
|---|---|---|
| `SchemaVersion` | int32 | = 1. Bumped on any breaking change |
| `SaveCounter` | int64 | +1 per successful write. Used for backup ordering and future cloud conflict |
| `SavedAtUtc` | FDateTime | Display only. **Never used for gameplay** (Rule 6) |
| `Shells` | int32 | ≥ 0 |
| `ActiveHull` | FName `HullId` | `Skiff` (start) or `Cutter` (doc 11, D9) |
| `OwnedHulls` | TArray<FName `HullId`> | always contains `Skiff` |
| `OwnedItems` | TArray<FName `ItemId`> | e.g. `FishCrate`, `FishHold`, `Bunk`, `Keel` (D1, D9); unique, bought once; unfitted = in the shed |
| `Fitting` | TMap<FName SlotId, FName `ItemId`> | slot → item on the `ActiveHull` (e.g. `S1`→`FishCrate`, `M1`→`FishHold`, `Keel`→`Keel`); must satisfy 11 F1 |
| `Cosmetics` | {OwnedIds TArray<FName>, Applied TMap<Part, FName>, Decor TMap<DecorPoint, FName>, BoatName FString ≤16} | Paint · Decor (doc 11); bought or discovery-earned |
| `Crew` | TArray<{`CrewSlot` int8, CrewId FName, Name FString, `Efficiency` float, bAshore bool}> | 2–3 named crew (D4); hired crew list; `bAshore` = waiting at the Inn (no berth, doc 04) |
| `Cargo` | TArray<{`SpeciesId` FName, Count int16}> | Σ Count = `CargoLoad` ≤ `CargoCapacity` |
| `JournalSeen` | TArray<FName> | SpeciesIds, DiscoveryIds, `EncounterId`s |
| `Position` | {`RegionId`, X, Y float m, Heading deg, bDocked} | Restore point |
| ~~`PaintColour`~~ | — | Replaced by `Cosmetics.Applied` (D9); 06 reads hull/sail/pennant from there |
| `BlockedPlayerIds` | TArray<uint64> | ≤ 200, from 06 |
| `UnlockedCosmeticIds` | TArray<FName> | Empty in prototype. Future offline mirror of Steam (Rule 11) |
| `PlaySeconds` | int64 | Telemetry/display only |

   Settings (audio, keybinds, `ViewMode` preference) live in `UGameUserSettings` (verify), not in the save, so a corrupt save never resets settings.
3. **PROPOSED, autosave triggers** (write only when dirty): sell, purchase (item/hull/cosmetic), Shipyard Done (fit/paint change), crew hire, journal entry, dock/undock, `RegionId` change,
   `ViewMode` change, graceful quit, window minimise, and every `AutosaveIntervalS` = 60 s while sailing. Purchases and sales save *immediately*, so Shells spent are never lost.
4. **PROPOSED, atomic write + backups**: serialise → write `Slot0_tmp` → reload `Slot0_tmp` and verify CRC32 → rotate `Slot0_bak1`→`bak2`, `Slot0`→`bak1`
   (rotation at most once per 10 min of play, so backups span real time) → rename `tmp`→`Slot0` (`IPlatformFile::MoveFile`, verify).
   The header wrapper stores {magic `LOSV`, `SchemaVersion`, `SaveCounter`, payload CRC32}.
5. **PROPOSED, load and recovery order**: `Slot0` → `bak1` → `bak2` → new game. A file that fails magic, CRC or deserialisation is renamed to
   `*.corrupt_<utc>` and kept, never deleted. If a backup was used: one dismissible line, "Your last save couldn't be read, so we restored the one from N minutes ago."
   **Sanitise on load**: clamp `Shells` to [0, 10,000,000]; drop unknown `HullId`/`ItemId`/`SpeciesId`/cosmetic ids and log them
   (`OwnedHulls` always keeps `Skiff`; an unknown or unowned `ActiveHull` → `Skiff`); drop `Fitting` entries whose item is not
   owned, whose slot does not exist on the hull, or whose size does not fit; if the loadout is still illegal (`Load > LoadLimit`)
   auto-move items to the shed in doc 11's order (`Keel`, `DeepHold`, then lightest-first) until legal, and log what moved;
   recompute `CargoCapacity`/`CrewBerths` (11 F2), then trim `Cargo` to `CargoCapacity`; crew beyond `CrewBerths` → `bAshore`
   (never deleted); if `Position` is outside the map → docked at Harbour.
6. **CONFIRMED (brief §5, §12, 00 §3), no offline fishing, enforced by design**:
   a. Catch accrues only inside the running game's tick (doc 04 formula), with `SimDelta = min(FrameDelta, MaxTickDt = 0.25 s)` (`MaxTickDt` owned by doc 04).
      An OS sleep, debugger pause or 10-min hitch therefore credits at most 0.25 s.
   b. Load restores `Cargo` exactly as saved. There is **no** elapsed-time computation and no "while you were away" screen. `SavedAtUtc` is never subtracted from "now".
   c. Gameplay reads no wall clock, so changing the system clock has no effect.
   d. While the game runs (full, minimised or Compact) the crew fishes, per brief §5 "while the game is running" and D2. This is bounded by
      "cargo full → fishing pauses" (04), so leaving it open gives at most one hold of fish.
7. **CONFIRMED (brief §10)**: offline means the full solo loop. Online services are the `FOffline*`/`FNull*` implementations (06, below). No feature checks for a connection.
8. **PROPOSED, versioning**: `Migrate_vN_to_vN1(FArchive&)` functions are chained from the loaded version up to current. Every version bump needs a migration and a fixture test.
   A save **newer** than the build is not loaded and not overwritten: the game shows "This save is from a newer version" and offers a new game in `Slot0_alt`.

### Service stubs (POST-PROTOTYPE; interfaces only, ~0.5 dev-day)

```cpp
class ICloudSaveService { public:  // prototype: FNullCloudSaveService -> every call returns NotImplemented
  virtual void Upload(const TArray<uint8>& Blob, int64 SaveCounter, FOnCloudResult Done) = 0;
  virtual void Download(FOnCloudDownload Done) = 0;          // Blob + RemoteSaveCounter + RemoteSavedAtUtc
  virtual void GetRemoteMeta(FOnCloudMeta Done) = 0; };
enum class ECloudResult : uint8 { Ok, Conflict, Offline, QuotaExceeded, AuthFailed, NotImplemented };

class IRareDropService { public:   // prototype: FNullRareDropService -> Ineligible_NotImplemented, never blocks the catch path
  virtual void RequestDropCheck(const FDropContext& Ctx, FOnDropResult Done) = 0;  // Ctx: RegionId, ZoneId, OnlineSessionId
  virtual void RedeemItem(uint64 SteamItemInstanceId, FOnRedeemResult Done) = 0;
  virtual void RefreshOwned(FOnOwnedItems Done) = 0; };
enum class EDropEligibility : uint8 { Eligible, Ineligible_NotImplemented, Ineligible_Offline, Ineligible_Cap, Error };
enum class ERedeemResult : uint8 { Unlocked, AlreadyUnlocked, ItemNotOwned, SteamFailed_ItemSafe, Offline, NotImplemented };
```
**Cloud save, PROPOSED post-prototype**: start with Steam Auto-Cloud configured on the save folder (verify). It needs no code, and conflicts use Steam's dialog.
Use `ICloudSaveService` only if a custom flow is ever needed. Conflict rule: never merge. Show both saves (Shells, `PlaySeconds`, date) and let the player choose.
If no choice is made, the higher `SaveCounter` wins.

### Steam Inventory: eligibility and redemption idempotency (paper only, POST-PROTOTYPE)

**Eligibility options** (decide with security-engineer):
(1) Valve playtime-generator item defs, one per `RegionId` (verify `TriggerItemDrop`, `drop_interval`, `drop_max_per_window`). Valve enforces caps, so there is zero server and duplicate drops are impossible.
The risk is that the client can claim the wrong region. That is acceptable because the item is cosmetic and capped.
(2) Own eligibility service: checks `RegionId` against relay presence history from 06 (≥ N online minutes in region), then grants via the Steam Web API inventory endpoint (verify).
**PROPOSED: (1) first.** Fishing is client-simulated (brief §10), so no server can truly verify catch. Caps are the real defence.

**Redemption (consume tradable X → permanent non-tradable unlock), PROPOSED**: use a Steam Inventory **exchange recipe** X → Y,
where Y is a non-tradable "unlock" item def. Valve applies it as one atomic transaction (verify `ExchangeItems`). **Steam inventory is the source of truth.**
`UnlockedCosmeticIds` in the save is only an offline display cache, reconciled from `GetAllItems` (verify) at each online start.

| Crash / failure point | State after restart | Result |
|---|---|---|
| Before the exchange call | X owned | Nothing happened. The player can retry |
| After the call, before the callback | Exactly one of X or Y owned (atomic) | `RefreshOwned` shows unlocked (Y) or retry (X). Never both, never neither |
| Steam returns failure | X owned | `SteamFailed_ItemSafe`: "Steam couldn't finish. Your item is safe." |
| Double-click / second request | X instance already consumed | The exchange fails → refresh → `AlreadyUnlocked` |
| Offline | — | Button disabled with "Needs Steam online". The cached unlock still displays |

**Idempotency key** (only if option 2's own server ever grants): `GrantKey = hash(SteamId, RegionId, DropWindowStartUtc)` with a unique index.
A retry returns the stored result and never grants a second time. Ledger states: `Pending → Granted | Failed`. Failed grants are retried up to 3 times, then flagged for support.

## Formulas

**F1 Worst-case progress loss on crash** = `AutosaveIntervalS / 60 × CatchRatePerMin`. With `CatchRatePerMin` = 5.0 (starter boat in R1, 2 crew × 2.5; doc 04): 60/60 × 5.0 = **5 fish**. Shells loss = 0 (Rule 3).
**F2 Save size** ≈ header 20 + Shells 4 + hulls 3 × 12 + items 5 × 12 + fitting 6 × 24 + cosmetics (20 ids × 12 + 6 applied × 16 + name 16 = 352) + crew 3 × 33 + cargo 12 × 8 + journal 20 × 12 + position 21 + blocked 200 × 8 + misc 32 ≈ **2.7 KB** raw (was 2.2 KB before D9).
With UE property-tag overhead (×2–3, ASSUMPTION – verify by measuring) that is ≈ 5–8 KB. Writes per hour at 1 save/60 s plus events (~20) ≈ 80 → ≈ 0.5 MB/h of disk writes, which is negligible. Serialise time < 1 ms on the game thread; the write is async.
**F3 Backup coverage**: `bak2` is at most `2 × BackupRotateMinS` = 20 min old. So the worst-case corruption loss is ≤ 20 min of play, and ≤ 60 s in the normal case.
**F4 Offline-credit bound**: catch credited over any real-time gap G = `min(G, 0.25 s) × CatchRatePerMin / 60`. For G = 8 h asleep: 0.25 × 5.0 / 60 = 0.021 fish → **0**.

## Edge Cases

| Case | Outcome |
|---|---|
| Power cut mid-write | `tmp` is incomplete. `Slot0` is intact because the rename hasn't happened. The next load is clean |
| `Slot0` corrupt, `bak1` OK | `bak1` loads. Corrupt file kept as `.corrupt_<utc>`. One-line notice |
| All 3 corrupt | New game. The files are kept for support, and the notice says so. Nothing is ever silently wiped |
| Save from newer build | Read-only refusal; new game offered in `Slot0_alt` (Rule 8) |
| Disk full / write denied | Retry at the next trigger. After 3 failures, a non-modal "Couldn't save — check disk space" message. Play continues |
| Quit during Compact | Graceful quit triggers a save. A hard kill falls back to F1 |
| PC sleeps with game open | F4: no credit for sleep time. Cargo is unchanged |
| Save edited to an illegal loadout (e.g. Crate + Hold + Bunk on the Skiff, Keel on the Skiff) | Sanitise (Rule 5): invalid fits dropped, then auto-move to the shed by 11's order until `Load ≤ LoadLimit`; logged; crew beyond berths wait ashore |
| Save names an unknown `ItemId`/`HullId` (removed item, typo) | Dropped and logged; `ActiveHull` falls back to `Skiff`; no Shells refunded |
| Player edits save (Shells = 9e9) | Clamp on load. This is single-player, so there is no further enforcement. Online data never depends on save values (06 Rule 2) |
| Cloud/rare-drop stub called | `NotImplemented`/`Ineligible_NotImplemented` immediately. The UI hides these features in the prototype |

## Dependencies

01 (`PhaseKey` triggers), 04 (`Cargo`, `CatchRatePerMin`, cargo-full pause), 05 (`Shells`), 11 (`ActiveHull`, `OwnedHulls`, `OwnedItems`, `Fitting`, `Cosmetics`, sanitise order), 03 (`RegionId`, map bounds, discovery IDs), 06 (`BlockedPlayerIds`,
`FOffline*` pattern), 08 (Compact quit/minimise save), 10 (load notices). Reverse: each of those docs must name `PlayerProgress` as its persistence owner.

## Tuning Knobs

| Knob | Value | Safe range | Affects |
|---|---|---|---|
| `AutosaveIntervalS` | 60 | 30–180 | Crash loss (F1) vs disk writes |
| `BackupCount` / `BackupRotateMinS` | 2 / 10 min | 1–5 / 5–30 | Corruption recovery depth (F3) |
| `MaxTickDt` (owner 04) | 0.25 | 0.1–0.5 | Offline-credit bound (F4); hitch tolerance |
| `ShellsClampMax` | 10,000,000 | ≥ 100× max item/hull price | Sanity only |
| `BlockedPlayerIds` max | 200 | 50–1000 | Save size |

## Visual/Audio Requirements

A save is shown only by a tiny inked buoy icon (ActsLayer) bobbing for 1 s at the HUD corner. There is no spinner and no sound. Recovery notices use standard UI text (10).

## Game Feel

Saving is invisible and quitting is always safe. Loading feels like stepping back aboard, with the same view, the same hold and the same crew.

## UI Requirements

Doc 10 owns these: save-icon spot; one-line recovery notice; "newer version" dialog; disk-error toast. No cloud or inventory UI in the prototype.

## Cross-References

00 §3, §6, §9 D2/D3 · brief §5, §8, §10, §12, §13.7–13.8 · 04, 05, 06, 08, 10.

## Acceptance Criteria

1. (H1) Killing the process at a random moment loses ≤ 60 s of catch and 0 Shells from purchases or sales. Verified by 20 forced kills.
2. (H1) Corrupting `Slot0` bytes loads `bak1` with the notice. Corrupting all 3 files starts a new game and keeps the `.corrupt_*` files.
3. (§12) Save, set the system clock +8 h, load: `Cargo` is identical. Sleep the PC 1 h with the game open: `CargoLoad` gain = 0.
4. (H1/brief §10) With the network adapter disabled, the full loop (sail → fish → sell → Keel → R2) completes with no error dialogs.
5. (Seams) `FNullCloudSaveService` and `FNullRareDropService` are the only bound implementations. Gameplay code includes no Steam Inventory headers.
6. (Versioning) A v1 fixture save loads after a dummy v2 migration is added (unit test).

## Open Questions

1. Should a fully minimised (non-Compact) window keep fishing? Brief §5 says yes, "while the game is running", and this doc follows that. The owner may want only Full/Compact to fish.
2. Rare drops: Valve generator (1) vs own eligibility server (2)? Do this together with security-engineer, before any Steam Inventory work.
3. Steam Auto-Cloud as the whole cloud-save answer? It needs a Steamworks configuration check (verify).
4. ~~`CatchRatePerMin` placeholder~~ RESOLVED: uses doc 04 (2.5/min per crew; starter 5.0/min).

## Interface values

| Name | Value | Unit | Label | Consumed by |
|---|---|---|---|---|
| `PlayerProgress.SchemaVersion` | 1 | — | PROPOSED | all |
| Save slot / backups | `LittleOcean_Slot0` + 2 | files | PROPOSED | 10 |
| `AutosaveIntervalS` | 60 | s | PROPOSED | 01, 08 |
| `MaxTickDt` | 0.25 | s | PROPOSED | 04 |
| Save size | 5–8 | KB | ASSUMPTION – verify by measuring | — |
| `BlockedPlayerIds` max | 200 | entries | PROPOSED | 06 |
| `ICloudSaveService` result | NotImplemented | — | CONFIRMED (D3) stub | — |
| `IRareDropService` result | Ineligible_NotImplemented | — | CONFIRMED (00 §3) stub | 04 |
| Redemption | Steam exchange X→Y, inventory = truth | — | PROPOSED (paper) | security |
