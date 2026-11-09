# Pathle — safe cosmetic and reward save migration contract

Date: 2026-11-09. Scope: future work for **Pathle DEV 1.5.57+**.

## Verified current behavior

- Official Daily Adventure and Treasure Hunt progression, the Luminous Pearl, chests,
  guides and sound preferences are stored through `PathleStorage` in IndexedDB.
- Retired localStorage keys `pathle_haiko_equipment_v12`,
  `pathle_cosmetic_inventory_v121` and `pathle_cosmetic_season_v121` are
  read and safely normalized by `js/game.js`; their data is **not** used to
  render the active Haiko outfit or assign the current Luminous Pearl reward.
- `beginCosmeticSeason` and `equipCosmetic` are currently internal,
  uncalled helpers. The gold-glasses and captain's-chair IDs represent retired
  prototype items. They must **not** become official rewards merely because
  those strings exist in an old localStorage record.
- As of DEV 1.5.56, malformed legacy cosmetic records do not block startup,
  rotate IndexedDB snapshots or cause localStorage to be overwritten.

## Required future data model

When new wearable cosmetics are actually released, introduce a versioned,
validated extension within the existing IndexedDB save, for example
`extensions.haikoCosmeticsV1`. Keep the existing shared save schema compatible
until a separately justified schema upgrade is necessary.

Proposed shape (design only; not activated in 1.5.57):

```json
{
  "version": 1,
  "activeSeason": "ocean",
  "inventory": {"ocean": [], "space": []},
  "equipped": {"glasses": null, "hat": null, "handItem": null, "sceneItem": null},
  "legacyImportVersion": 0
}
```

Validation requirements:

1. IDs must be valid catalog IDs, belong to the correct season and have no duplicates.
2. An equipped ID must be owned and match its designated equipment slot.
3. A retired prototype ID must never be imported automatically as earned content.
4. Trophy/reward entitlement must originate from trusted existing IndexedDB
   collection/chest records or from new verified award actions, never solely
   from a localStorage inventory string.
5. Ownership, equipped selection and relevant unlock changes must be committed
   together using `PathleStorage.update` on the newest snapshot.
6. New version data must not silently replace an unknown newer extension.
7. Define season-reset semantics explicitly before activating a new season:
   a seasonal outfit may reset while permanent collectibles remain available.

## Rollout (separate implementation, after the catalog is approved)

1. Implement a pure cosmetic validator/normalizer with thorough unit tests.
2. Register the new official cosmetic catalog and decide the first earnable item.
3. Add the optional extension with an idempotent initialize-or-update operation.
4. Read localStorage as **non-authoritative compatibility input** only;
   never clear or overwrite its keys during initialization or migration.
5. If any legacy selection is recognized and its ownership is independently
   verified, import the selection in one atomic save update. Otherwise keep
   default appearance; do not grant items.
6. Add startup, interruption, write-failure, replay, seasonal-reset, offline,
   future-save and rollback tests. Verify Luminous Pearl and Treasure Hunt
   progress are unchanged.
7. Only after successful browser and real Android tests enable the new
   cosmetic UI and then retire dead prototype helpers.

## Release gate

A migration is **not** ready simply because IndexedDB tests pass. The official
reward list, entitlement rules, visuals and season semantics must be approved
first. Browser tests must compare previous and current records; Android checks
must verify reopening the game and app-switch interruptions. Keep a rollback
commit and avoid touching `main` before release approval.

## Current decision

**Do not migrate retired prototype cosmetics in DEV 1.5.57.** Their keys are
not an authoritative player inventory. The safest current improvement is to
preserve them untouched, protect startup from malformed values and implement
the validated destination only when usable, earned cosmetics are introduced.
