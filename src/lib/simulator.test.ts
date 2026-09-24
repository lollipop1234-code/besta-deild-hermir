import { describe, expect, it } from "vitest";

import {
  buildDoubleRoundRobin,
  buildPairingRounds,
  buildRoundDates,
  formatMetrics,
} from "./simulator";
import type { CalendarBlock, Team } from "./types";

function makeTeams(count: number): Team[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `team-${index + 1}`,
    name: `Lið ${index + 1}`,
    venue: `Völlur ${index + 1}`,
    surface: "unknown",
    floodlights: null,
    europePath: "none",
  }));
}

function teamGameCounts(rounds: ReturnType<typeof buildPairingRounds>) {
  const games = new Map<string, number>();
  const home = new Map<string, number>();
  const away = new Map<string, number>();

  for (const round of rounds) {
    for (const pair of round.pairings) {
      games.set(pair.home, (games.get(pair.home) ?? 0) + 1);
      games.set(pair.away, (games.get(pair.away) ?? 0) + 1);
      home.set(pair.home, (home.get(pair.home) ?? 0) + 1);
      away.set(pair.away, (away.get(pair.away) ?? 0) + 1);
    }
  }

  return { games, home, away };
}

function dayNumber(value: string) {
  return Math.floor(new Date(`${value}T12:00:00Z`).getTime() / 86_400_000);
}

describe("formatMetrics", () => {
  it("keeps the four playground formats internally consistent", () => {
    expect(formatMetrics("ten-triple")).toMatchObject({ teams: 10, gamesPerTeam: 27, totalGames: 135, rounds: 27 });
    expect(formatMetrics("ten-split")).toMatchObject({ teams: 10, gamesPerTeam: 26, totalGames: 130, rounds: 28 });
    expect(formatMetrics("current-12-split")).toMatchObject({ teams: 12, gamesPerTeam: 27, totalGames: 162, rounds: 27 });
    expect(formatMetrics("double-14")).toMatchObject({ teams: 14, gamesPerTeam: 26, totalGames: 182, rounds: 26 });
  });
});

describe("round robin generation", () => {
  it("creates a balanced double round robin", () => {
    const teams = makeTeams(10);
    const rounds = buildDoubleRoundRobin(teams);
    const { games, home, away } = teamGameCounts(rounds);

    expect(rounds).toHaveLength(18);
    expect(rounds.every((round) => round.pairings.length === 5)).toBe(true);

    for (const team of teams) {
      expect(games.get(team.id)).toBe(18);
      expect(home.get(team.id)).toBe(9);
      expect(away.get(team.id)).toBe(9);
    }
  });

  it("creates 27 games per team in the 10-team triple format", () => {
    const teams = makeTeams(10);
    const rounds = buildPairingRounds("ten-triple", teams);
    const { games, home, away } = teamGameCounts(rounds);

    expect(rounds).toHaveLength(27);
    for (const team of teams) {
      expect(games.get(team.id)).toBe(27);
      expect([13, 14]).toContain(home.get(team.id));
      expect([13, 14]).toContain(away.get(team.id));
    }
  });

  it("reserves 10 split windows for a 5/5 split", () => {
    const teams = makeTeams(10);
    const rounds = buildPairingRounds("ten-split", teams);

    expect(rounds).toHaveLength(28);
    expect(rounds.filter((round) => round.stage === "regular")).toHaveLength(18);
    expect(rounds.filter((round) => round.stage === "split")).toHaveLength(10);
  });
});

describe("calendar scheduling", () => {
  const fifaWindow: CalendarBlock = {
    id: "fifa-test",
    label: "FIFA",
    start: "2027-06-07",
    end: "2027-06-15",
    kind: "fifa",
    constraint: "avoid",
    confidence: "official",
    note: "test",
  };

  const blackout: CalendarBlock = {
    id: "blackout-test",
    label: "Blackout",
    start: "2027-07-01",
    end: "2027-07-07",
    kind: "cup",
    constraint: "blackout",
    confidence: "official",
    note: "test",
  };

  it("redistributes every round when the season window is shortened", () => {
    const normal = buildRoundDates("current-12-split", "2027-04-10", "2027-10-23", [], false);
    const short = buildRoundDates("current-12-split", "2027-04-10", "2027-09-18", [], false);

    expect(normal.shortfall).toBe(0);
    expect(short.shortfall).toBe(0);
    expect(short.rounds).toHaveLength(27);
    expect(short.rounds.at(-1)?.date).toBeLessThanOrEqual("2027-09-18");
    expect(short.rounds[15]?.date).not.toBe(normal.rounds[15]?.date);

    const gaps = short.rounds.slice(1).map((round, index) => (
      dayNumber(round.date) - dayNumber(short.rounds[index]!.date)
    ));
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(3);
    expect(gaps.some((gap) => gap < 7)).toBe(true);
  });

  it("only reports missing rounds when the requested window is genuinely too short", () => {
    const result = buildRoundDates("current-12-split", "2027-04-10", "2027-06-01", [], false);
    expect(result.shortfall).toBeGreaterThan(0);
    expect(result.rounds.length + result.shortfall).toBe(27);
  });

  it("avoids FIFA windows when that simulator preference is enabled", () => {
    const avoided = buildRoundDates("ten-triple", "2027-04-10", "2027-09-30", [fifaWindow], true);
    expect(avoided.shortfall).toBe(0);
    expect(avoided.rounds.some((round) => round.date >= fifaWindow.start && round.date <= fifaWindow.end)).toBe(false);
  });

  it("can use dates inside a FIFA window when avoidance is disabled", () => {
    const allowed = buildRoundDates("ten-triple", "2027-04-10", "2027-09-01", [fifaWindow], false);
    expect(allowed.shortfall).toBe(0);
    expect(allowed.rounds.some((round) => round.date >= fifaWindow.start && round.date <= fifaWindow.end)).toBe(true);
  });

  it("always respects an explicit blackout while still redistributing", () => {
    const result = buildRoundDates("ten-triple", "2027-04-10", "2027-09-20", [blackout], false);
    expect(result.shortfall).toBe(0);
    expect(result.rounds.some((round) => round.date >= blackout.start && round.date <= blackout.end)).toBe(false);
  });
});
