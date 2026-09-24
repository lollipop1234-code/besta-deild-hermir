import { describe, expect, it } from "vitest";

import { buildDoubleRoundRobin } from "./simulator";
import { applyGrassHomePreference, kickoffForHomeTeam } from "./venue-planner";
import type { Round, Team } from "./types";

function team(id: string, surface: Team["surface"], floodlights: boolean | null): Team {
  return {
    id,
    name: id,
    venue: `${id}-völlur`,
    surface,
    floodlights,
    europePath: "none",
  };
}

describe("kickoff planning", () => {
  it("keeps an evening slot when floodlights are available", () => {
    expect(kickoffForHomeTeam(team("a", "artificial", true), "evening")).toEqual({
      time: "19:15",
      adjusted: false,
    });
  });

  it("moves a team without floodlights out of the evening slot", () => {
    const result = kickoffForHomeTeam(team("a", "grass", false), "evening");
    expect(result.time).toBe("15:00");
    expect(result.adjusted).toBe(true);
  });

  it("does not pretend unknown floodlights are verified", () => {
    const result = kickoffForHomeTeam(team("a", "grass", null), "evening");
    expect(result.time).toBe("19:15");
    expect(result.dataGap).toBe(true);
  });
});

describe("grass home preference", () => {
  it("can swap home/away between two meetings without changing balance", () => {
    const teams = [
      team("grass", "grass", true),
      team("artificial", "artificial", true),
      team("c", "artificial", true),
      team("d", "artificial", true),
    ];
    const rounds = buildDoubleRoundRobin(teams);
    const firstMeeting = rounds.find((round) =>
      round.pairings.some((pair) => new Set([pair.home, pair.away]).has("grass") && new Set([pair.home, pair.away]).has("artificial")),
    )!;
    const secondMeeting = rounds.slice(firstMeeting.number).find((round) =>
      round.pairings.some((pair) => new Set([pair.home, pair.away]).has("grass") && new Set([pair.home, pair.away]).has("artificial")),
    )!;

    const firstPair = firstMeeting.pairings.find((pair) => new Set([pair.home, pair.away]).has("grass") && new Set([pair.home, pair.away]).has("artificial"))!;
    const aprilRound = firstPair.home === "grass" ? firstMeeting.number : secondMeeting.number;
    const summerRound = firstPair.home === "grass" ? secondMeeting.number : firstMeeting.number;

    const dates: Round[] = rounds.map((round) => ({
      number: round.number,
      date: round.number === aprilRound ? "2027-04-10" : round.number === summerRound ? "2027-07-10" : "2027-06-01",
      label: "test",
    }));

    const result = applyGrassHomePreference(rounds, dates, teams, true);
    expect(result.swaps).toBe(1);

    const shoulder = result.rounds[aprilRound - 1]!.pairings.find((pair) =>
      new Set([pair.home, pair.away]).has("grass") && new Set([pair.home, pair.away]).has("artificial"),
    )!;
    expect(shoulder.home).toBe("artificial");

    const meetings = result.rounds.flatMap((round) => round.pairings).filter((pair) =>
      new Set([pair.home, pair.away]).has("grass") && new Set([pair.home, pair.away]).has("artificial"),
    );
    expect(meetings.filter((pair) => pair.home === "grass")).toHaveLength(1);
    expect(meetings.filter((pair) => pair.home === "artificial")).toHaveLength(1);
  });
});
