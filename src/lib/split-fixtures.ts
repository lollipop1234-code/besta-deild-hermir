import type { FormatPreset } from "./types";

export type SplitGroup = "upper" | "lower";

export type SplitFixture = {
  group: SplitGroup;
  homeSeed: number;
  awaySeed: number;
};

export type SplitRoundPreview = {
  roundNumber: number;
  splitRound: number;
  fixtures: SplitFixture[];
  byes: Array<{ group: SplitGroup; seed: number }>;
};

type GroupRound = {
  pairs: Array<[number, number]>;
  bye?: number;
};

function singleRoundRobin(seeds: number[]): GroupRound[] {
  const slots: Array<number | null> = seeds.length % 2 === 0 ? [...seeds] : [...seeds, null];
  const fixed = slots[0]!;
  let rotating = slots.slice(1);
  const rounds: GroupRound[] = [];

  for (let roundIndex = 0; roundIndex < slots.length - 1; roundIndex += 1) {
    const order = [fixed, ...rotating];
    const pairs: Array<[number, number]> = [];
    let bye: number | undefined;

    for (let index = 0; index < order.length / 2; index += 1) {
      const left = order[index];
      const right = order[order.length - 1 - index];
      if (left === null && right !== null) {
        bye = right;
        continue;
      }
      if (right === null && left !== null) {
        bye = left;
        continue;
      }
      if (left === null || right === null) continue;

      pairs.push(roundIndex % 2 === 0 ? [left, right] : [right, left]);
    }

    rounds.push({ pairs, bye });
    rotating = [rotating[rotating.length - 1]!, ...rotating.slice(0, -1)];
  }

  return rounds;
}

function groupRounds(group: SplitGroup, seeds: number[], doubleRoundRobin: boolean) {
  const first = singleRoundRobin(seeds);
  const all = doubleRoundRobin
    ? [...first, ...first.map((round) => ({
      pairs: round.pairs.map(([home, away]) => [away, home] as [number, number]),
      bye: round.bye,
    }))]
    : first;

  return all.map((round) => ({
    fixtures: round.pairs.map(([homeSeed, awaySeed]) => ({ group, homeSeed, awaySeed })),
    bye: round.bye === undefined ? undefined : { group, seed: round.bye },
  }));
}

export function splitStartRound(preset: FormatPreset) {
  if (preset === "ten-split") return 19;
  if (preset === "current-12-split") return 23;
  return null;
}

export function buildSplitRoundPreviews(preset: FormatPreset): SplitRoundPreview[] {
  const start = splitStartRound(preset);
  if (start === null) return [];

  const tenTeam = preset === "ten-split";
  const upperSeeds = tenTeam ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6];
  const lowerSeeds = tenTeam ? [6, 7, 8, 9, 10] : [7, 8, 9, 10, 11, 12];
  const upper = groupRounds("upper", upperSeeds, tenTeam);
  const lower = groupRounds("lower", lowerSeeds, tenTeam);
  const roundCount = Math.max(upper.length, lower.length);

  return Array.from({ length: roundCount }, (_, index) => ({
    roundNumber: start + index,
    splitRound: index + 1,
    fixtures: [
      ...(upper[index]?.fixtures ?? []),
      ...(lower[index]?.fixtures ?? []),
    ],
    byes: [upper[index]?.bye, lower[index]?.bye].filter(
      (bye): bye is { group: SplitGroup; seed: number } => Boolean(bye),
    ),
  }));
}

export function splitPreviewForRound(preset: FormatPreset, roundNumber: number) {
  return buildSplitRoundPreviews(preset).find((round) => round.roundNumber === roundNumber) ?? null;
}
