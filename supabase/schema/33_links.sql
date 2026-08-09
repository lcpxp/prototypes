-- ------------------------------------------------------------------
-- 33_links.sql - The knowledge graph: typed, dated, owner-confirmed
-- links between anything the system knows.
--
-- Why this exists. work_items.relates_to_id was one nullable uuid doing
-- four jobs. On 2026-08-09 its 35 rows broke down as 8 duplicate_of
-- (retired rows whose resolution reads "Duplicate: merged into..."),
-- 6 part_of (the Daopay/automation-sweep components, deliberately NOT
-- parent_id because that rolls up onto the strategic gantt), 1
-- supersedes, and ~20 genuine associations. Four meanings, one column,
-- a ceiling of one relationship per row, and direction meaning
-- something different depending on which of the four you happened to
-- be looking at. Telling them apart meant reading prose.
--
-- Two live failures it caused, both still in the data when this was
-- written: "Currency Swap on summary page" sat on the Next band as
-- status=idea with a resolution that read "Duplicate: description
-- migrated onto the pre-existing ...", and "Terminal financing admin
-- toggles (enable / disable)" was dropped as a duplicate with its
-- survivor named only in prose and relates_to_id null.
--
-- And there was no way at all to record that two rows are NOT the same,
-- so adjudicated non-matches - "Automate enrolling partners to Unity"
-- versus "...to LaunchPad", "VFS partner flow" versus "Xolvis partner
-- flow" - were re-examined at every review. distinct_from is what turns
-- the owner's domain judgement into data instead of prose he restates.
--
-- Shape decisions, each with its reason:
--   * POLYMORPHIC, so capabilities, notes, terms and documents join the
--     same graph as work items. "How does this feature work" has to
--     reach a capability, not just a roadmap row.
--   * BI-TEMPORAL. A link is closed, never deleted, so the graph
--     answers what was believed and when.
--   * KINDS AS DATA, grouped on the W3C SKOS split between hierarchical
--     and associative relations (www.w3.org/TR/skos-reference), which
--     is also where the clash rule below comes from.
-- ------------------------------------------------------------------

-- ---------------------------------------------------------------
-- link_entity_types: which tables may be linked, and under which type
-- key. Postgres cannot foreign-key a polymorphic column, so this
-- registry plus the validation trigger below IS the integrity
-- mechanism: an unknown type key, or a type key pointing at a row that
-- does not exist, is refused at write time rather than discovered
-- later as a dangling edge.
-- ---------------------------------------------------------------

create table if not exists public.link_entity_types (
  key        text primary key,
  table_name text not null,
  label      text not null,
  sort_order integer not null default 100
);

insert into public.link_entity_types (key, table_name, label, sort_order) values
  ('work_item',  'work_items',           'Work item',       10),
  ('note',       'work_notes',           'Note',            20),
  ('capability', 'product_capabilities', 'Capability',      30),
  ('term',       'domain_terms',         'Glossary term',   40),
  ('document',   'work_documents',       'Source document', 50),
  ('stage',      'journey_stages',       'Journey stage',   60),
  ('area',       'work_areas',           'Filing area',     70)
on conflict (key) do nothing;

-- ---------------------------------------------------------------
-- link_kinds: the vocabulary, as data so the docs and the test suite
-- can be checked against it rather than against someone's memory.
--
-- `is_symmetric` kinds store ONE row in canonical endpoint order (the
-- trigger below enforces it), so a pair can never be recorded twice
-- facing opposite ways. Directional kinds read forward with `label`
-- and backward with `inverse_label` - the knowledge_graph view emits
-- both, so no consumer needs to know which way a row was stored.
-- ---------------------------------------------------------------

create table if not exists public.link_kinds (
  key           text primary key,
  label         text not null,
  inverse_label text not null,
  family        text not null
    check (family in ('equivalence', 'hierarchy', 'association', 'sequence', 'knowledge')),
  -- Named is_symmetric, not symmetric: SYMMETRIC is a Postgres reserved
  -- word (BETWEEN SYMMETRIC) and an unquoted column of that name is a
  -- syntax error.
  is_symmetric  boolean not null default false,
  description   text not null,
  sort_order    integer not null default 100
);

insert into public.link_kinds
  (key, label, inverse_label, family, is_symmetric, description, sort_order) values
  ('duplicate_of',  'Duplicate of',  'Has duplicate',  'equivalence', false,
   'Same work, recorded twice. The FROM row is the one retired; the constraint below requires it to be status=dropped.', 10),
  ('supersedes',    'Supersedes',    'Superseded by',  'equivalence', false,
   'The FROM row replaces the TO row: same territory, but the newer framing is the live one.', 20),
  ('part_of',       'Part of',       'Includes',       'hierarchy',   false,
   'The FROM row is a component of the TO row. Unlike parent_id this does NOT roll up onto the gantt, so a coordination row never lights up a strategic workstream.', 30),
  ('blocks',        'Blocks',        'Blocked by',     'sequence',    false,
   'The FROM row must land before the TO row can proceed. Replaces the empty work_item_dependencies table.', 40),
  ('relates_to',    'Related to',    'Related to',     'association', true,
   'Genuinely distinct but adjacent. The default association; costs nothing to record and it is how the next session learns two pieces of work touch.', 50),
  ('distinct_from', 'Distinct from', 'Distinct from',  'association', true,
   'Adjudicated as NOT the same work. Suppresses the pair from future candidate lists; the note carries the reason.', 60),
  ('about',         'About',         'Described by',   'knowledge',   false,
   'The FROM row - a note, document, term or capability - describes the TO row.', 70),
  ('affects',       'Affects',       'Affected by',    'knowledge',   false,
   'Delivering the FROM work item changed the TO capability. This is what makes "how does this feature work now" answerable by traversal rather than by memory.', 80)
on conflict (key) do nothing;

-- ---------------------------------------------------------------
-- knowledge_links: one row per relationship.
-- ---------------------------------------------------------------

create table if not exists public.knowledge_links (
  id         uuid primary key default gen_random_uuid(),
  from_type  text not null references public.link_entity_types (key),
  from_id    uuid not null,
  to_type    text not null references public.link_entity_types (key),
  to_id      uuid not null,
  kind       text not null references public.link_kinds (key),
  -- Why. For distinct_from this is the whole point of the row: the
  -- owner's reason for keeping two similar things apart, recorded once
  -- instead of restated at every review.
  note       text,
  -- 'proposed' means written by a migration or an assistant and not yet
  -- owner-confirmed. Nothing is ever asserted as confirmed on the
  -- assistant's own authority.
  confidence text not null default 'proposed'
    check (confidence in ('proposed', 'confirmed')),
  -- Bi-temporal. A link is CLOSED (valid_to set), never deleted, so the
  -- graph can answer what was believed and when - the same
  -- edge-invalidation model temporal knowledge graphs use for agent
  -- memory, and the same rule as the rest of this system.
  valid_from       timestamptz not null default now(),
  valid_to         timestamptz,
  superseded_by_id uuid references public.knowledge_links (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knowledge_links_not_self
    check (not (from_type = to_type and from_id = to_id))
);

-- At most one OPEN link of a given kind between an ordered pair. A
-- closed link does not block re-opening the same judgement later, which
-- is the point of closing rather than deleting.
create unique index if not exists knowledge_links_open_uniq
  on public.knowledge_links (from_type, from_id, to_type, to_id, kind)
  where valid_to is null;

create index if not exists knowledge_links_from_idx
  on public.knowledge_links (from_type, from_id) where valid_to is null;
create index if not exists knowledge_links_to_idx
  on public.knowledge_links (to_type, to_id) where valid_to is null;
create index if not exists knowledge_links_kind_idx
  on public.knowledge_links (kind) where valid_to is null;

drop trigger if exists knowledge_links_updated_at on public.knowledge_links;
create trigger knowledge_links_updated_at
  before update on public.knowledge_links
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- Invariants. Each is a trigger rather than a convention because a
-- convention in a document is not a constraint - which is exactly how
-- a known duplicate ended up live on the Next band.
-- ---------------------------------------------------------------

-- 1. Canonicalise symmetric kinds. relates_to and distinct_from mean
--    the same thing from either end, so store ONE row in a
--    deterministic endpoint order. Without this the unique index above
--    would happily hold both A->B and B->A.
-- 2. Validate the polymorphic target against link_entity_types. At this
--    scale a dynamic exists() costs nothing.
-- 3. SKOS clash rule: a pair may not carry both a hierarchical
--    (part_of) and an associative (relates_to, distinct_from) open
--    link, and duplicate_of excludes distinct_from outright - "the same
--    work" and "adjudicated as not the same work" cannot both hold.
create or replace function public.knowledge_link_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  is_symmetric boolean;
  this_family  text;
  tbl          text;
  found        boolean;
  swap_type    text;
  swap_id      uuid;
  clash        text;
begin
  select k.is_symmetric, k.family into is_symmetric, this_family
    from public.link_kinds k where k.key = new.kind;

  -- (1) canonical order for symmetric kinds
  if is_symmetric and (new.from_type, new.from_id) > (new.to_type, new.to_id) then
    swap_type := new.from_type; swap_id := new.from_id;
    new.from_type := new.to_type; new.from_id := new.to_id;
    new.to_type := swap_type;    new.to_id := swap_id;
  end if;

  -- (2) both endpoints must exist
  select t.table_name into tbl from public.link_entity_types t where t.key = new.from_type;
  execute format('select exists (select 1 from public.%I where id = $1)', tbl)
    into found using new.from_id;
  if not found then
    raise exception using errcode = 'foreign_key_violation',
      message = format('knowledge_links.from_id %s is not a row in %s', new.from_id, tbl);
  end if;
  select t.table_name into tbl from public.link_entity_types t where t.key = new.to_type;
  execute format('select exists (select 1 from public.%I where id = $1)', tbl)
    into found using new.to_id;
  if not found then
    raise exception using errcode = 'foreign_key_violation',
      message = format('knowledge_links.to_id %s is not a row in %s', new.to_id, tbl);
  end if;

  -- (3) family clash, in either direction, among OPEN links
  if new.valid_to is null then
    select l.kind into clash
      from public.knowledge_links l
      join public.link_kinds k on k.key = l.kind
     where l.valid_to is null
       and l.id is distinct from new.id
       and ((l.from_type = new.from_type and l.from_id = new.from_id
             and l.to_type = new.to_type and l.to_id = new.to_id)
         or (l.from_type = new.to_type and l.from_id = new.to_id
             and l.to_type = new.from_type and l.to_id = new.from_id))
       and (
         (this_family = 'hierarchy'   and k.family = 'association')
         or (this_family = 'association' and k.family = 'hierarchy')
         or (new.kind = 'duplicate_of'  and l.kind = 'distinct_from')
         or (new.kind = 'distinct_from' and l.kind = 'duplicate_of')
       )
     limit 1;
    if clash is not null then
      raise exception using errcode = 'check_violation',
        message = format('link kind %s clashes with the existing %s link on this pair',
          new.kind, clash),
        hint = 'SKOS forbids a pair being both hierarchical and associative. '
          || 'Close the existing link (set valid_to) before asserting the other.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists knowledge_links_guard on public.knowledge_links;
create trigger knowledge_links_guard
  before insert or update on public.knowledge_links
  for each row execute function public.knowledge_link_guard();

-- duplicate_of implies the FROM row is retired. This is the constraint
-- that would have caught "Currency Swap on summary page" sitting live
-- on the Next band with a resolution declaring it a duplicate.
-- Deferred so a MERGE can set status and write the link in either order
-- within one transaction.
create or replace function public.knowledge_link_duplicate_dropped()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  st text;
begin
  if new.kind = 'duplicate_of' and new.to_type = 'work_item'
     and new.from_type = 'work_item' and new.valid_to is null then
    select status into st from public.work_items where id = new.from_id;
    if st is distinct from 'dropped' then
      raise exception using errcode = 'check_violation',
        message = format('duplicate_of requires the retired row to be dropped (it is %s)', st),
        hint = 'Set the duplicate to status=dropped with a resolution naming the survivor.';
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists knowledge_links_duplicate_dropped on public.knowledge_links;
create constraint trigger knowledge_links_duplicate_dropped
  after insert or update on public.knowledge_links
  deferrable initially deferred
  for each row execute function public.knowledge_link_duplicate_dropped();

-- ---------------------------------------------------------------
-- Read surfaces.
-- ---------------------------------------------------------------

-- Every OPEN link, emitted from BOTH ends with the reading that applies
-- from that end, so a consumer never has to know which way a row was
-- stored. Both branches run for every kind, including symmetric ones: a
-- symmetric link is stored once in canonical endpoint order, so if only
-- the forward branch emitted it, whichever item sorted second would
-- never see its own relationship. The two branches differ in src/dst,
-- so no row is duplicated - they are the two directions, not two copies.
drop view if exists public.knowledge_graph;
create view public.knowledge_graph
  with (security_invoker = on) as
  select l.id, l.from_type as src_type, l.from_id as src_id,
         l.to_type as dst_type, l.to_id as dst_id,
         l.kind, k.label as reads, k.family, k.is_symmetric,
         l.note, l.confidence, l.valid_from
    from public.knowledge_links l
    join public.link_kinds k on k.key = l.kind
   where l.valid_to is null
  union all
  select l.id, l.to_type, l.to_id, l.from_type, l.from_id,
         l.kind,
         -- A symmetric kind reads the same from either end ("Related
         -- to"); a directional one flips ("Part of" / "Includes").
         case when k.is_symmetric then k.label else k.inverse_label end,
         k.family, k.is_symmetric,
         l.note, l.confidence, l.valid_from
    from public.knowledge_links l
    join public.link_kinds k on k.key = l.kind
   where l.valid_to is null;

grant select on public.knowledge_graph to authenticated;

comment on view public.knowledge_graph is
  'Every open knowledge_link, emitted from both endpoints with the reading '
  'that applies from that end. One stored row, two readable directions.';

-- Links whose target row has gone. The delete guard on work_items makes
-- this hard to reach, so it is belt-and-braces rather than a live risk;
-- npm run audit surfaces it.
drop view if exists public.knowledge_links_orphans;
create view public.knowledge_links_orphans
  with (security_invoker = on) as
  select l.*, 'from' as missing_end from public.knowledge_links l
   where l.valid_to is null
     and not exists (select 1 from public.work_items w
                      where l.from_type = 'work_item' and w.id = l.from_id)
     and l.from_type = 'work_item'
  union all
  select l.*, 'to' from public.knowledge_links l
   where l.valid_to is null
     and not exists (select 1 from public.work_items w
                      where l.to_type = 'work_item' and w.id = l.to_id)
     and l.to_type = 'work_item';

grant select on public.knowledge_links_orphans to authenticated;
