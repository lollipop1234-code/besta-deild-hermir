import { describe, expect, it } from "vitest";

import { buildSplitRoundPreviews } from "./split-fixtures";

function appearances(rounds: ReturnType<typeof buildSplitRoundPreviews>) {
  const counts = new Map<number, number>();
  for (const round of rounds) {
    for (const fixture of round.fixtures) {
      counts.set(fixture.homeSeed, (counts.get(fixture.homeSeed) ?? 0) + 1);
      counts.set(fixture.awaySeed, (counts.get(fixture.awaySeed) ?? 0) + 1);
    }
  }
  return counts;
}

describe("split fixture previews", () => {
  it("builds the five extra rounds for the 12-team split", () => {
    const rounds = buildSplitRoundPreviews("current-12-split");
    expect(rounds).toHaveLength(5);
    expect(rounds[0]?.roundNumber).toBe(23);
    expect(rounds[4]?.roundNumber).toBe(27);
    expect(rounds.every((round) => round.fixtures.length === 6)).toBe(true);
    expect(rounds.reduce((sum, round) => sum + round.fixtures.length, 0)).toBe(30);

    const counts = appearances(rounds);
    for (let seed = 1; seed <= 12; seed += 1) expect(counts.get(seed)).toBe(5);
  });

  it("builds ten split windows with two byes for every team in the 10-team 5/5 format", () => {
    const rounds = buildSplitRoundPreviews("ten-split");
    expect(rounds).toHaveLength(10);
    expect(rounds[0]?.roundNumber).toBe(19);
    expect(rounds[9]?.roundNumber).toBe(28);
    expect(rounds.every((round) => round.fixtures.length === 4)).toBe(true);
    expect(rounds.every((round) => round.byes.length === 2)).toBe(true);
    expect(rounds.reduce((sum, round) => sum + round.fixtures.length, 0)).toBe(40);

    const counts = appearances(rounds);
    for (let seed = 1; seed <= 10; seed += 1) expect(counts.get(seed)).toBe(8);

    const byeCounts = new Map<number, number>();
    for (const round of rounds) {
      for (const bye of round.byes) byeCounts.set(bye.seed, (byeCounts.get(bye.seed) ?? 0) + 1);
    }
    for (let seed = 1; seed <= 10; seed += 1) expect(byeCounts.get(seed)).toBe(2);
  });
});
