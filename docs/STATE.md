# Current state

Updated: 2026-07-20 (session)
Branch: claude/person-modal-upload-delay-yu0sl7

## In progress
Work-model redesign, signed off by owner. Bands stay Done/Now/Next/Later/
Parked-Backlog (dates later). Switcher becomes Workstreams (default) /
Categories / Work Items + a Department filter dropdown + Detailed toggle
(replaces Team/Exec). Workstream span = own band range else roll up from
items. Standalone items hidden from exec, sorted below workstreams
elsewhere. Small fixes = standalone "maintenance" track, tagged + soft
relates_to a workstream, kept off the strategic gantt. Roadmap Backlog
level mirrors the full backlog module (option A). Colour = department hue
-> workstream shade -> item modifier; fixes desaturated. Capture: single
item -> Parked/Backlog; PRD -> workstream + child items.

DONE this session: data backfill of area_id on 14 owner-added items;
migration 20260720130000 (roadmap_categories.owning_department seeded for
all 13 themes; work_items.relates_to_id soft link) applied live.

## Next steps
1. Colour system in assets/css/tokens.css: department base hues, category
   shades keyed off owning_department, item/fix modifiers.
2. Views (roadmap-views.js, -cascade.js, roadmap.js): switcher rename +
   department filter; ordering (workstreams above standalone); backlog
   level = all items; Fixes section; standalone hidden from exec.
3. Capture flow: /roadmap-add + playbook always set area_id + track;
   PRD breakdown -> workstream + items. Extend roadmap_current with
   owning_department / relates_to when the capture logic needs it.
4. Tests in tests/unit, CHANGELOG Unreleased line, CODEMAP regen.

## Open decisions
- Fixes grouping is derived (standalone + type bug/task/improvement); no
  explicit `track` column unless it proves fragile.
