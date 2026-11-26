# Game Design Document --- Concept Brief

**Working title:** TBD\
**Genre:** Cozy Multiplayer Ocean Exploration / Idle Simulation\
**Platform:** PC (Steam)\
**Business model:** Premium, one-time purchase\
**Target audience:** Players who enjoy cozy games, exploration, social
hangouts, idle progression, and ambient experiences.

------------------------------------------------------------------------

# Instructions for Claude

You are receiving this document as the foundational concept brief for a
game that will be developed into a complete Game Design Document (GDD).

Your task is to expand this brief into a structured, detailed,
production-oriented GDD. Develop the missing mechanics, systems,
balancing, technical specifications, progression calculations, and
implementation considerations.

## Important instructions

1.  **Preserve the game's identity.** This is a cozy multiplayer ocean
    exploration and social game with automated fishing. It is not a
    conventional fishing simulator, idle tycoon, survival game, or
    competitive MMO.
2.  **Treat the design constraints in Section 12 as hard constraints.**
    Do not introduce mechanics that contradict them. If you believe a
    constraint should be reconsidered, explain why and present it as an
    optional alternative rather than silently changing the design.
3.  **Distinguish confirmed decisions from proposals.** The brief
    contains established decisions and areas deliberately left open.
    Clearly label newly proposed mechanics and assumptions.
4.  **Do not invent false certainty.** Where data is unavailable, state
    assumptions, provide reasonable starting estimates, and explain how
    they should be validated through prototyping and playtesting.
5.  **Include concrete calculations.** For progression, fishing, crew
    efficiency, cargo capacity, equipment costs, regional access, drop
    rates, player capacity, bandwidth, server costs, and other relevant
    systems, provide formulas, sample values, and worked examples.
6.  **Design for a solo or very small development team.** Prefer systems
    that are achievable, modular, easy to maintain, and inexpensive to
    operate. Avoid unnecessary technical complexity.
7.  **Consider offline and online behavior separately.** Single-player
    must remain playable without an internet connection, but
    online-exclusive Steam collectible drops require server
    authorization. There is no offline fishing or background production.
8.  **Be explicit about dependencies and edge cases.** Cover save
    conflicts, reconnection, duplicate reward claims, Steam Inventory
    failures, interrupted redemption, cheating, matchmaking, and server
    outages.
9.  **Avoid feature creep.** Prioritize a viable first release. Separate
    MVP, post-launch additions, and speculative ideas.
10. **Do not write only high-level descriptions.** Specify player-facing
    behavior, system rules, inputs, outputs, state changes, failure
    cases, and implementation requirements wherever appropriate.

## Recommended GDD structure

Expand the brief into sections such as:

-   Executive summary and product vision
-   Target audience, player fantasy, and design pillars
-   Core gameplay loop and session structure
-   Sailing, navigation, and boat handling
-   Ocean world structure, regions, biomes, and points of interest
-   Weather, ocean conditions, and environmental simulation
-   Automated fishing system and fish ecology
-   Crew hiring, progression, and management
-   Ships, equipment, upgrades, and content gating
-   Economy, vendors, currencies, and progression balance
-   Legendary fish and rare environmental encounters
-   Multiplayer architecture, matchmaking, social systems, and chat
-   Player presence, remote boat synchronization, and network behavior
-   Offline mode, local saves, cloud saves, and persistence
-   Steam Inventory drops, eligibility validation, and item redemption
-   Cosmetics and ship customization
-   Compact desktop companion mode and ambient audio
-   UI/UX and accessibility
-   Monetization and Steam release considerations
-   Technical architecture and hosting strategy
-   Security, anti-cheat, moderation, and operational concerns
-   MVP scope, development roadmap, risks, and open questions

You may reorganize this structure if a better one improves clarity.

------------------------------------------------------------------------

# 1. Game Vision

A cozy multiplayer ocean exploration game where players own and
customize their boats, hire automated fishing crews, explore a vast
continuous ocean, discover unusual places, and socialize with other
sailors.

The game should feel like a relaxing ocean vacation rather than a
demanding management simulator or competitive MMO.

**Core fantasy:** Own a little boat, sail wherever the ocean takes you,
discover extraordinary things, and enjoy the journey with other players.

Primary inspiration: WEBFISHING's casual social atmosphere and cozy
presentation.

# 2. Core Gameplay Loop

1.  Customize and upgrade your boat.
2.  Hire and improve automated fishing crews.
3.  Sail across the ocean and explore different regions.
4.  Your crew automatically fishes while sailing.
5.  Return to harbors and sell your catch to NPCs.
6.  Purchase better equipment, ships, and upgrades.
7.  Unlock access to more challenging ocean regions.
8.  Discover rare fish, locations, creatures, and environmental
    encounters.
9.  Socialize and share discoveries with other players.

**Important:** There is absolutely no manual fishing. Fishing is always
automated through hired crews.

# 3. Ocean and Exploration

The world consists of one continuous navigable ocean, divided into
distinct regions and biomes.

Each region features: - Unique fish species. - Distinct weather
conditions and behaviors. - Different ocean conditions and navigation
challenges. - Unique environmental discoveries. - Region-specific rare
cosmetics and encounters.

Examples of environmental conditions: - Tropical storms and squalls. -
Northern fog and snowstorms. - Arctic ice and drifting icebergs. -
Strong currents and deep-ocean winds.

Regions should transition naturally rather than feeling like
disconnected levels.

## Exploration discoveries

Players can encounter: - Uncharted islands and settlements. - Shipwrecks
and mysterious structures. - Unusual marine habitats. - Hidden caves and
formations. - Rare environmental phenomena.

Some discoveries should require specific regions, weather conditions, or
equipment.

# 4. Progression and Equipment

Progression revolves around improving the player's vessel, equipment,
and fishing crew.

Equipment should act as a content gate: players cannot simply explore
the entire world on day one.

More advanced regions require increasingly capable and expensive
equipment.

End-game content may include: - Extremely rare and legendary fish. -
Dangerous ocean conditions. - Mythical creatures such as the Kraken. -
Exceptional environmental discoveries.

Progression should provide meaningful long-term goals without becoming a
repetitive grind.

Equipment should enable exploration, not merely increase fishing
efficiency.

# 5. Fishing and Personal Economy

Fishing is entirely automated.

Players hire crews that continuously fish while the game is running.
Cargo fills over time, and players return to harbors to sell their
catch.

Economic rules: - Each player has an independent economy. - Fish are
sold exclusively to NPCs. - Upgrades and equipment are purchased from
NPCs. - No player-to-player resource or currency trading. - No shared
player-driven marketplace. - No offline fishing or offline production.

Fishing should support exploration and progression rather than become
the central source of player interaction.

# 6. Multiplayer and Social Features

The multiplayer experience is a relaxed social hangout.

Features: - Automatic nearby-player matching. - Harbors as social
gathering hubs. - Nearby player visibility and boat synchronization. -
Chat and social interaction. - Shared environmental encounters. -
Players sharing clues, sightings, and discoveries.

Players should not need parties or cooperation to progress.

No PvP, competitive MMO progression, or mandatory group activities.

Knowledge and discoveries are the primary forms of player-to-player
exchange.

# 7. Rare Environmental Encounters

The ocean should occasionally produce memorable shared experiences.

Examples: - Giant whale migrations. - Dolphin gatherings. - Aurora
events. - Bioluminescent ocean blooms. - Mysterious ghost ships. - Rare
marine migrations. - Unusual storms and atmospheric phenomena.

These encounters should encourage players to notify one another and sail
together to investigate.

Rewards may include journal entries, photographs, cosmetic discoveries,
or simply the experience itself.

Avoid competitive leaderboards and time-limited pressure.

# 8. Cosmetics and Steam Inventory

Players can customize their boats with visual items such as: - Paint
schemes. - Flags and ornaments. - Lights and decorations. - Other ship
accessories.

## Rare Steam collectibles

Rare regional cosmetics can occasionally drop through fishing.

The intended flow: 1. The server validates the player's eligibility for
a rare drop. 2. The cosmetic collectible is granted directly to the
player's Steam Inventory. 3. The game displays owned Steam collectibles
in its interface. 4. Players may keep the item as a tradable/marketable
Steam collectible. 5. Alternatively, players can consume it to
permanently unlock its corresponding in-game cosmetic.

Once redeemed, the Steam item is consumed and the cosmetic becomes a
permanent, non-tradable account unlock.

The system must prevent duplicate claims, spoofed eligibility, and lost
items during failed redemption transactions.

Steam collectibles are the exception to the game's otherwise closed
player economy.

# 9. Desktop Companion Mode

The game should support a compact window mode, allowing players to
minimize the main experience into a small desktop companion.

**One fixed layout only**, to minimize development and maintenance.

The compact view should display: - A small animated ocean scene. - The
player's boat and crew. - Cargo capacity/status. - Minimal essential
controls.

Include soothing ambient audio such as: - Ocean waves. - Wind. -
Seabirds. - Rain and storms.

The game should support reduced rendering performance while in compact
mode to minimize resource consumption.

This is a game-owned compact window, not the Steam Overlay.

# 10. Technical Architecture

The game should be designed around a local-first architecture.

## Client-side simulation

-   Boat movement and sailing physics.
-   Personal fishing simulation.
-   Crew behavior.
-   Personal economy and progression.
-   Weather visuals and environmental effects.

These systems should work without an internet connection.

## Online services

-   Player presence and nearby-player matching.
-   Other players' boat positions and appearances.
-   Chat.
-   Shared environmental encounter notifications.
-   Account-related services.
-   Exclusive cosmetic eligibility validation and Steam Inventory
    integration.

The player's own boat movement must never depend on server round-trip
latency.

Use occasional position updates and client-side interpolation for remote
players rather than synchronizing every movement frame.

## Hosting philosophy

Avoid traditional MMO infrastructure.

Start with lightweight multiplayer rooms and managed hosting. Multiple
small player groups can share server processes where practical.

Scale infrastructure based on actual concurrent users rather than
building for a large MMO population from the beginning.

Single-player must remain playable without an internet connection.
Online-exclusive Steam collectibles require server authorization.

# 11. Monetization

Premium upfront purchase with a one-time payment.

Design philosophy: - No subscriptions. - No pay-to-win. - No paid
gameplay advantages. - No mandatory microtransactions. - No monetization
pressure.

Steam collectible trading is an optional player-driven cosmetic
activity, not the game's primary economy.

# 12. Core Design Principles and Restrictions

The following are fundamental design constraints:

-   Cozy, relaxing, and social atmosphere.
-   Exploration takes priority over grinding.
-   Fishing is always automated; never introduce manual fishing.
-   No offline fishing.
-   No player-to-player resource or currency trading.
-   No PvP or competitive MMO mechanics.
-   No mandatory parties or chores.
-   No unnecessary survival systems.
-   No complicated market simulation.
-   No dependence on high-frequency server synchronization for local
    gameplay.
-   Reward curiosity and exploration rather than optimization.

# 13. Areas for Further GDD Development

The following are not finalized and should be investigated and designed
in the full GDD:

1.  Detailed progression curves, equipment tiers, costs, and content
    gates.
2.  Fishing formulas, crew efficiency, fish rarity, cargo capacity, and
    balancing.
3.  Ocean dimensions, region layouts, biome transitions, and navigation
    systems.
4.  Weather simulation and its effects on navigation and fishing.
5.  Legendary fish and mythical encounter mechanics.
6.  Multiplayer room architecture, player capacity, matchmaking, and
    hosting costs.
7.  Account persistence, offline saves, cloud synchronization, and
    anti-cheat.
8.  Steam Inventory implementation, reward probabilities, eligibility,
    and redemption transactions.
9.  Desktop companion performance and window behavior.
10. Estimated development scope and solo-developer production roadmap.

**Final design direction:** Build a cozy, persistent-feeling social
ocean experience with automated fishing and meaningful exploration. The
ocean is the main attraction; fishing, progression, customization, and
multiplayer exist to make spending time there more enjoyable.
