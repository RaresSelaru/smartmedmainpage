import assert from "node:assert/strict";
import test from "node:test";

import {
  addCivilDays,
  addCivilMonths,
  bucharestDateKey,
  bucharestWallTimeToIso,
  calendarGridKeys,
  civilDateFromKey,
  monthStartKey,
} from "./admin-calendar.ts";

test("civil calendar arithmetic stays independent from the runtime timezone", () => {
  assert.equal(addCivilDays("2026-07-31", 1), "2026-08-01");
  assert.equal(addCivilDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addCivilMonths("2026-12-01", 1), "2027-01-01");
  assert.equal(monthStartKey("2026-07-31"), "2026-07-01");
  assert.equal(civilDateFromKey("2026-02-30"), null);
});

test("calendar grid starts on Monday and contains exactly six weeks", () => {
  const grid = calendarGridKeys("2026-08-01");

  assert.equal(grid.length, 42);
  assert.equal(grid[0], "2026-07-27");
  assert.equal(grid.at(-1), "2026-09-06");
});

test("Bucharest date key follows the configured center timezone", () => {
  assert.equal(
    bucharestDateKey(new Date("2026-07-31T21:30:00.000Z")),
    "2026-08-01",
  );
});

test("wall-clock selection converts correctly in winter and summer", () => {
  assert.equal(
    bucharestWallTimeToIso("2026-01-15", "10:00"),
    "2026-01-15T08:00:00.000Z",
  );
  assert.equal(
    bucharestWallTimeToIso("2026-07-15", "10:00"),
    "2026-07-15T07:00:00.000Z",
  );
});

test("invalid and skipped wall-clock values are rejected", () => {
  assert.equal(bucharestWallTimeToIso("not-a-date", "10:00"), null);
  assert.equal(bucharestWallTimeToIso("2026-03-29", "03:30"), null);
  assert.equal(bucharestWallTimeToIso("2026-10-25", "25:00"), null);
});
