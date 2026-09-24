import { describe, expect, it } from "vitest";

import { buildWeekHeatmap } from "./playground-heatmap";
import type { CalendarBlock, Round } from "./types";
import type { TeamLoadEvent } from "./team-load";

const rounds: Round[] = [
  { number: 1, date: "2027-04-10", label: "10. apr." },
  { number: 2, date: "2027-04-17", label: "17. apr." },
];

const fifa: CalendarBlock = {
  id: "fifa",
  label: "FIFA",
  start: "2027-04-18",
  end: "2027-04-20",
  kind: "fifa",
  constraint: "avoid",
  confidence: "official",
  note: "test",
};

const events: TeamLoadEvent[] = [
  { id: "b1", date: "2027-04-10", kind: "besta", certainty: "scheduled", label: "Besta", detail: "test", round: 1 },
  { id: "u1", date: "2027-04-15", kind: "uefa-scenario", certainty: "scenario", label: "UEFA", detail: "test" },
  { id: "c1", date: "2027-04-17", kind: "cup-scenario", certainty: "scenario", label: "Bikar", detail: "test" },
];

describe("fixture heatmap", () => {
  it("groups league and team load into seven-day cells", () => {
    const weeks = buildWeekHeatmap({
      seasonStart: "2027-04-10",
      seasonEnd: "2027-04-23",
      rounds,
      calendarBlocks: [fifa],
      teamEvents: events,
    });

    expect(weeks).toHaveLength(2);
    expect(weeks[0]!.roundNumbers).toEqual([1]);
    expect(weeks[0]!.signals).toContain("league");
    expect(weeks[0]!.signals).toContain("uefa");
    expect(weeks[1]!.roundNumbers).toEqual([2]);
    expect(weeks[1]!.signals).toContain("cup");
    expect(weeks[1]!.signals).toContain("fifa");
  });

  it("marks a week tight when three selected-team events land in it", () => {
    const denseEvents: TeamLoadEvent[] = [
      { id: "a", date: "2027-05-01", kind: "besta", certainty: "scheduled", label: "A", detail: "A" },
      { id: "b", date: "2027-05-04", kind: "uefa-scenario", certainty: "scenario", label: "B", detail: "B" },
      { id: "c", date: "2027-05-07", kind: "cup-scenario", certainty: "scenario", label: "C", detail: "C" },
    ];

    const [week] = buildWeekHeatmap({
      seasonStart: "2027-05-01",
      seasonEnd: "2027-05-07",
      rounds: [],
      calendarBlocks: [],
      teamEvents: denseEvents,
    });

    expect(week?.signals).toContain("tight");
    expect(week?.eventCount).toBe(3);
  });
});
