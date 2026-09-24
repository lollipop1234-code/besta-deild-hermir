import { describe, expect, it } from "vitest";

import type { PairingRound } from "./simulator";
import { findScheduleRepair } from "./schedule-repair";
import { buildTeamLoadEvents, fixtureKey } from "./team-load";
import type { CalendarBlock, Round, Team } from "./types";

const teams: Team[] = [
  { id: "a", name: "A", venue: "A-völlur", surface: "artificial", floodlights: true, europePath: "none" },
  { id: "b", name: "B", venue: "B-völlur", surface: "artificial", floodlights: true, europePath: "none" },
  { id: "c", name: "C", venue: "C-völlur", surface: "artificial", floodlights: true, europePath: "none" },
  { id: "d", name: "D", venue: "D-völlur", surface: "artificial", floodlights: true, europePath: "none" },
];

const rounds: PairingRound[] = [
  { number: 1, stage: "regular", pairings: [{ home: "a", away: "b" }, { home: "c", away: "d" }] },
  { number: 2, stage: "regular", pairings: [{ home: "c", away: "a" }, { home: "b", away: "d" }] },
];

const roundDates: Round[] = [
  { number: 1, date: "2027-04-17", label: "17. apr." },
  { number: 2, date: "2027-04-24", label: "24. apr." },
];

const names = Object.fromEntries(teams.map((team) => [team.id, team.name]));

function baseInput() {
  return {
    team: teams[0]!,
    teams,
    pairingRounds: rounds,
    roundDates,
    teamNames: names,
    springEuropeTeamId: "a",
    springEuropeDates: [{ date: "2027-04-15", label: "UECL 8-liða" }],
    uefaWindow: undefined,
    includeUefaScenario: false,
    fixtureDateOverrides: {},
    calendarBlocks: [] as CalendarBlock[],
    avoidFifaWindows: true,
    seasonStart: "2027-04-10",
    seasonEnd: "2027-10-23",
  };
}

describe("schedule repair", () => {
  it("moves a Saturday league match to Sunday when that fixes confirmed rest and does not hurt the opponent", () => {
    const suggestion = findScheduleRepair(baseInput());

    expect(suggestion).not.toBeNull();
    expect(suggestion?.basis).toBe("confirmed");
    expect(suggestion?.originalDate).toBe("2027-04-17");
    expect(suggestion?.proposedDate).toBe("2027-04-18");
    expect(suggestion?.beforeSelected.belowMinimumCount).toBe(1);
    expect(suggestion?.afterSelected.belowMinimumCount).toBe(0);
    expect(suggestion?.afterOpponent.belowMinimumCount).toBe(0);
  });

  it("skips a blocked candidate date and finds the next safe option", () => {
    const blockedSunday: CalendarBlock = {
      id: "blocked-sunday",
      label: "Lokað",
      start: "2027-04-18",
      end: "2027-04-18",
      kind: "cup",
      constraint: "blackout",
      confidence: "official",
      note: "test",
    };

    const suggestion = findScheduleRepair({ ...baseInput(), calendarBlocks: [blockedSunday] });
    expect(suggestion?.proposedDate).toBe("2027-04-19");
  });

  it("treats a provisional UEFA collision as a scenario repair, not a confirmed rule breach", () => {
    const conferenceTeams = teams.map((team) => team.id === "a" ? { ...team, europePath: "conference" as const } : team);
    const uefaWindow: CalendarBlock = {
      id: "uefa-window",
      label: "UEFA sviðsmynd",
      start: "2027-07-08",
      end: "2027-07-08",
      kind: "uefa",
      constraint: "info",
      confidence: "provisional",
      note: "test",
    };
    const summerRounds: PairingRound[] = [
      { number: 1, stage: "regular", pairings: [{ home: "a", away: "b" }, { home: "c", away: "d" }] },
    ];
    const summerDates: Round[] = [{ number: 1, date: "2027-07-10", label: "10. júl." }];

    const suggestion = findScheduleRepair({
      ...baseInput(),
      team: conferenceTeams[0]!,
      teams: conferenceTeams,
      pairingRounds: summerRounds,
      roundDates: summerDates,
      springEuropeTeamId: "none",
      springEuropeDates: [],
      uefaWindow,
      includeUefaScenario: true,
      seasonStart: "2027-07-01",
    });

    expect(suggestion?.basis).toBe("scenario");
    expect(suggestion?.proposedDate).toBe("2027-07-11");
    expect(suggestion?.beforeSelected.belowMinimumCount).toBe(0);
    expect(suggestion?.beforeSelected.scenarioRiskCount).toBe(1);
    expect(suggestion?.afterSelected.scenarioRiskCount).toBe(0);
  });

  it("applies an accepted fixture-date override to both teams' load timelines", () => {
    const id = fixtureKey(1, "a", "b");
    const overrides = { [id]: "2027-04-18" };

    const eventsA = buildTeamLoadEvents({
      team: teams[0]!,
      pairingRounds: rounds,
      roundDates,
      teamNames: names,
      springEuropeTeamId: "none",
      springEuropeDates: [],
      includeUefaScenario: false,
      fixtureDateOverrides: overrides,
    });
    const eventsB = buildTeamLoadEvents({
      team: teams[1]!,
      pairingRounds: rounds,
      roundDates,
      teamNames: names,
      springEuropeTeamId: "none",
      springEuropeDates: [],
      includeUefaScenario: false,
      fixtureDateOverrides: overrides,
    });

    expect(eventsA.find((event) => event.round === 1)?.date).toBe("2027-04-18");
    expect(eventsB.find((event) => event.round === 1)?.date).toBe("2027-04-18");
  });
});
