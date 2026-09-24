import { describe, expect, it } from "vitest";

import { buildDoubleRoundRobin } from "./simulator";
import { buildQualifyingScenarioDates, buildTeamLoadEvents, summarizeTeamLoad } from "./team-load";
import type { CalendarBlock, Round, Team } from "./types";

const teams: Team[] = Array.from({ length: 10 }, (_, index) => ({
  id: `team-${index + 1}`,
  name: `Lið ${index + 1}`,
  venue: `Völlur ${index + 1}`,
  surface: "artificial",
  floodlights: true,
  europePath: index === 0 ? "champions" : "none",
}));

const uefaWindow: CalendarBlock = {
  id: "uefa-test",
  label: "UEFA",
  start: "2027-07-05",
  end: "2027-07-25",
  kind: "uefa",
  constraint: "info",
  confidence: "provisional",
  note: "test",
};

describe("team load", () => {
  it("builds domestic events for one team from the round robin", () => {
    const rounds = buildDoubleRoundRobin(teams);
    const dates: Round[] = rounds.map((round, index) => ({
      number: round.number,
      date: `2027-05-${String(index + 1).padStart(2, "0")}`,
      label: "test",
    }));

    const events = buildTeamLoadEvents({
      team: teams[0]!,
      pairingRounds: rounds,
      roundDates: dates,
      teamNames: Object.fromEntries(teams.map((team) => [team.id, team.name])),
      springEuropeTeamId: "none",
      springEuropeDates: [],
      uefaWindow: undefined,
      includeUefaScenario: false,
    });

    expect(events).toHaveLength(18);
    expect(events.every((event) => event.kind === "besta")).toBe(true);
  });

  it("marks official spring Europe separately from provisional summer scenario", () => {
    const events = buildTeamLoadEvents({
      team: teams[0]!,
      pairingRounds: [],
      roundDates: [],
      teamNames: {},
      springEuropeTeamId: teams[0]!.id,
      springEuropeDates: [{ date: "2027-04-15", label: "UECL 8-liða" }],
      uefaWindow,
      includeUefaScenario: true,
    });

    expect(events.some((event) => event.kind === "uefa-official" && event.certainty === "official")).toBe(true);
    expect(events.some((event) => event.kind === "uefa-scenario" && event.certainty === "scenario")).toBe(true);
  });

  it("uses Wednesdays for champions-path load scenarios", () => {
    const dates = buildQualifyingScenarioDates(teams[0]!, uefaWindow);
    expect(dates).toEqual(["2027-07-07", "2027-07-14", "2027-07-21"]);
  });

  it("detects a confirmed gap below the two-full-day minimum", () => {
    const summary = summarizeTeamLoad([
      { id: "a", date: "2027-05-01", kind: "besta", certainty: "scheduled", label: "A", detail: "A" },
      { id: "b", date: "2027-05-03", kind: "uefa-official", certainty: "official", label: "B", detail: "B" },
    ]);

    expect(summary.shortestFullRestDays).toBe(1);
    expect(summary.belowMinimumCount).toBe(1);
    expect(summary.scenarioRiskCount).toBe(0);
  });

  it("keeps provisional congestion separate from confirmed rule risk", () => {
    const summary = summarizeTeamLoad([
      { id: "a", date: "2027-07-10", kind: "besta", certainty: "scheduled", label: "A", detail: "A" },
      { id: "b", date: "2027-07-12", kind: "uefa-scenario", certainty: "scenario", label: "B", detail: "B" },
    ]);

    expect(summary.belowMinimumCount).toBe(0);
    expect(summary.scenarioRiskCount).toBe(1);
  });

  it("counts rolling three-matches-in-eight-days sequences", () => {
    const summary = summarizeTeamLoad([
      { id: "a", date: "2027-05-01", kind: "besta", certainty: "scheduled", label: "A", detail: "A" },
      { id: "b", date: "2027-05-04", kind: "besta", certainty: "scheduled", label: "B", detail: "B" },
      { id: "c", date: "2027-05-08", kind: "besta", certainty: "scheduled", label: "C", detail: "C" },
    ]);

    expect(summary.threeInEightCount).toBe(1);
  });
});
