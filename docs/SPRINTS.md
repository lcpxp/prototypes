# Sprints and dates

How the roadmap connects sprints, calendar dates, quarters and the
high-level Now / Next / Later bands. The deterministic conversions live
in `assets/js/core/sprints.js` (`App.sprints`); the looser "talk in
sprints" phrasing is translated to database edits per the ruleset at the
end of this file.

## The calendar

- A sprint is a fortnight: it **starts on a Monday and ends on the
  second Friday**. The ten working days between are the sprint; weekends
  are not worked. The next sprint starts the following Monday (a 14-day
  cadence).
- Codes are `YY-NN`: `YY` the sprint year, `NN` from `01` to `26`. After
  `26-26` the codes roll into `27-01`, and so on.
- The anchor is fixed: **sprint 26-01 starts Monday 22 December 2025.**
  Every other sprint is derived from it, so `26-16` is Mon 20 Jul 2026
  and, at the time of writing (Fri 17 Jul 2026), the current cycle is
  `26-15`.

| Code  | Starts (Mon) | Ends (Fri)   | Quarter |
|-------|--------------|--------------|---------|
| 26-01 | 22 Dec 2025  | 02 Jan 2026  | Q4 2025 |
| 26-02 | 05 Jan 2026  | 16 Jan 2026  | Q1 2026 |
| 26-03 | 19 Jan 2026  | 30 Jan 2026  | Q1 2026 |
| 26-04 | 02 Feb 2026  | 13 Feb 2026  | Q1 2026 |
| 26-05 | 16 Feb 2026  | 27 Feb 2026  | Q1 2026 |
| 26-06 | 02 Mar 2026  | 13 Mar 2026  | Q1 2026 |
| 26-07 | 16 Mar 2026  | 27 Mar 2026  | Q1 2026 |
| 26-08 | 30 Mar 2026  | 10 Apr 2026  | Q1 2026 |
| 26-09 | 13 Apr 2026  | 24 Apr 2026  | Q2 2026 |
| 26-10 | 27 Apr 2026  | 08 May 2026  | Q2 2026 |
| 26-11 | 11 May 2026  | 22 May 2026  | Q2 2026 |
| 26-12 | 25 May 2026  | 05 Jun 2026  | Q2 2026 |
| 26-13 | 08 Jun 2026  | 19 Jun 2026  | Q2 2026 |
| 26-14 | 22 Jun 2026  | 03 Jul 2026  | Q2 2026 |
| 26-15 | 06 Jul 2026  | 17 Jul 2026  | Q3 2026 |
| 26-16 | 20 Jul 2026  | 31 Jul 2026  | Q3 2026 |
| 26-17 | 03 Aug 2026  | 14 Aug 2026  | Q3 2026 |
| 26-18 | 17 Aug 2026  | 28 Aug 2026  | Q3 2026 |
| 26-19 | 31 Aug 2026  | 11 Sep 2026  | Q3 2026 |
| 26-20 | 14 Sep 2026  | 25 Sep 2026  | Q3 2026 |
| 26-21 | 28 Sep 2026  | 09 Oct 2026  | Q4 2026 |
| 26-22 | 12 Oct 2026  | 23 Oct 2026  | Q4 2026 |
| 26-23 | 26 Oct 2026  | 06 Nov 2026  | Q4 2026 |
| 26-24 | 09 Nov 2026  | 20 Nov 2026  | Q4 2026 |
| 26-25 | 23 Nov 2026  | 04 Dec 2026  | Q4 2026 |
| 26-26 | 07 Dec 2026  | 18 Dec 2026  | Q4 2026 |

## Deterministic conversions (`App.sprints`)

- `sprintToRange("26-16")` gives `{ start: "2026-07-20", end: "2026-07-31" }`.
- `dateToSprint("2026-07-17")` gives `"26-15"` (the fortnight the date
  falls in).
- `currentSprint(today)` is `dateToSprint` of today.
- `sprintToQuarter("26-16")` gives `"Q3 2026"` (the starting quarter).
- `bandForSprint(code, today)` maps a sprint to its coarse band using
  the distance table below.

## Distance to band

A sprint's high-level band is its distance in sprints from the current
one, so a precise sprint and a coarse phrase resolve the same way:

| Sprints from now | Band     |
|------------------|----------|
| this or next (<=1) | now    |
| 2-3              | next     |
| 4-6              | later    |
| 7+ or unknown    | someday  |

A run spanning several sprints uses `horizon` for the start sprint's
band and `end_horizon` for the end sprint's band, so the bar spans
columns (e.g. Now -> Next).

## Talking in sprints (translation ruleset)

When work is discussed in sprint terms, apply these edits to the
`work_items` row (and `work_item_phases` where phases are named). Store
precise sprints in `start_sprint` / `end_sprint` whenever they are known,
and always set the coarse band so the board stays readable.

- **"this sprint" / "next sprint"** -> `start_sprint` = current / current+1;
  `horizon` = `now`.
- **"in a couple of sprints" / "push it back a couple of sprints"** ->
  `start_sprint` = current + 2 or 3; band from the distance table
  (usually `next`). A bigger push (4-6 out) is `later`.
- **"it will take multiple sprints" / "from 26-16 to 26-18"** ->
  set both `start_sprint` and `end_sprint`; `horizon` = band of the
  start, `end_horizon` = band of the end (a spanning bar).
- **explicit codes** (e.g. "26-16") -> store verbatim and derive the
  band; never guess a code that was not given.
- **"delivered" / "done this sprint"** -> `status` = `done`,
  `progress` = 100.
- **unscheduled / "some day"** -> `horizon` = `someday`, no sprints.

### Progress nudges

`progress` is a coarse 0-100 the board renders as a subtle bar, snapping
to checkpoints 0 / 25 / 50 / 75 / 90 / 100. Move it by conversation,
letting the phase/stage set the sensible floor:

- "just started" -> ~25 · "halfway" -> 50 · "nearly finished" -> ~90 ·
  "done" -> 100.
- "made progress this sprint" -> advance one checkpoint from where it is.
- reaching a later phase (Build ~50, Certification ~75, Launch ~90) sets
  the floor; nudges move it within.
