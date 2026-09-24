import type { CalendarBlock, FormatPreset, Round, Team } from "./types";

export type Pairing = { home: string; away: string };
export type PairingRound = { number: number; pairings: Pairing[]; stage: "regular" | "split" };

export function formatMetrics(preset: FormatPreset) {
  switch (preset) {
    case "ten-triple":
      return { teams: 10, gamesPerTeam: 27, totalGames: 135, rounds: 27, homeRange: "13–14 / 13–14" };
    case "ten-split":
      return { teams: 10, gamesPerTeam: 26, totalGames: 130, rounds: 28, homeRange: "13 / 13" };
    case "double-14":
      return { teams: 14, gamesPerTeam: 26, totalGames: 182, rounds: 26, homeRange: "13 / 13" };
    case "current-12-split":
    default:
      return { teams: 12, gamesPerTeam: 27, totalGames: 162, rounds: 27, homeRange: "13–14 / 13–14" };
  }
}

function dayNumber(value: string) {
  return Math.floor(new Date(`${value}T12:00:00Z`).getTime() / 86_400_000);
}

function dateFromDay(value: number) {
  return new Date(value * 86_400_000).toISOString().slice(0, 10);
}

function inBlock(date: string, block: CalendarBlock) {
  return date >= block.start && date <= block.end;
}

function isBlocked(date: string, blocks: CalendarBlock[], avoidFifaWindows: boolean) {
  return blocks.some((block) => {
    if (!inBlock(date, block)) return false;
    if (block.constraint === "blackout") return true;
    return avoidFifaWindows && block.kind === "fifa" && block.constraint === "avoid";
  });
}

function weekdayPenalty(day: number) {
  const weekday = new Date(day * 86_400_000).getUTCDay();
  if (weekday === 6) return 0;
  if (weekday === 0) return 0.35;
  if (weekday === 5) return 0.7;
  if (weekday === 3) return 0.9;
  if (weekday === 4) return 1.05;
  if (weekday === 2) return 1.25;
  return 1.5;
}

const icelandicMonths = [
  "jan.", "feb.", "mar.", "apr.", "maí", "jún.",
  "júl.", "ágú.", "sep.", "okt.", "nóv.", "des.",
];

function dateLabel(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  return `${date.getUTCDate()}. ${icelandicMonths[date.getUTCMonth()]}`;
}

function maxFittableDates(
  startDay: number,
  endDay: number,
  minGap: number,
  allowedDays: Set<number>,
) {
  let count = 0;
  let cursor = startDay;

  while (cursor <= endDay) {
    while (cursor <= endDay && !allowedDays.has(cursor)) cursor += 1;
    if (cursor > endDay) break;
    count += 1;
    cursor += minGap;
  }

  return count;
}

export function buildRoundDates(
  preset: FormatPreset,
  seasonStart: string,
  seasonEnd: string,
  blocks: CalendarBlock[],
  avoidFifaWindows: boolean,
): { rounds: Round[]; shortfall: number } {
  const required = formatMetrics(preset).rounds;
  const startDay = dayNumber(seasonStart);
  const endDay = dayNumber(seasonEnd);
  if (endDay < startDay) return { rounds: [], shortfall: required };

  // KSÍ-reglan sem hermirinn notar fyrir liðsbundið álag gerir ráð fyrir tveimur
  // heilum hvíldardögum. Því höldum við minnst þriggja almanaksdaga bili milli
  // heilla umferða. Þegar tímabilið er stytt þéttir schedulerinn mótið í stað
  // þess að halda laugardögum föstum og klippa síðustu umferðirnar af.
  const minGap = 3;
  const allowedDays = new Set<number>();
  for (let day = startDay; day <= endDay; day += 1) {
    if (!isBlocked(dateFromDay(day), blocks, avoidFifaWindows)) allowedDays.add(day);
  }

  const rounds: Round[] = [];
  let previousDay = startDay - minGap;
  const span = endDay - startDay;

  for (let index = 0; index < required; index += 1) {
    const remaining = required - index - 1;
    const earliest = Math.max(startDay, previousDay + minGap);
    if (earliest > endDay) break;

    const ideal = required === 1
      ? startDay
      : startDay + (span * index) / (required - 1);

    const candidates = Array.from(allowedDays)
      .filter((day) => day >= earliest && day <= endDay)
      .sort((a, b) => {
        const costA = Math.abs(a - ideal) + weekdayPenalty(a);
        const costB = Math.abs(b - ideal) + weekdayPenalty(b);
        return costA - costB || a - b;
      });

    const chosen = candidates.find((day) => (
      maxFittableDates(day + minGap, endDay, minGap, allowedDays) >= remaining
    ));

    if (chosen === undefined) break;

    const value = dateFromDay(chosen);
    rounds.push({ number: index + 1, date: value, label: dateLabel(value) });
    previousDay = chosen;
  }

  return { rounds, shortfall: Math.max(0, required - rounds.length) };
}

function balancedOrientation(
  left: string,
  right: string,
  indexById: Map<string, number>,
  teamCount: number,
): Pairing {
  let first = left;
  let second = right;
  let firstIndex = indexById.get(first)!;
  let secondIndex = indexById.get(second)!;

  if (firstIndex > secondIndex) {
    [first, second] = [second, first];
    [firstIndex, secondIndex] = [secondIndex, firstIndex];
  }

  const distance = secondIndex - firstIndex;
  if (distance < teamCount / 2) return { home: first, away: second };
  if (distance > teamCount / 2) return { home: second, away: first };

  return firstIndex % 2 === 0
    ? { home: first, away: second }
    : { home: second, away: first };
}

export function buildDoubleRoundRobin(teams: Team[]): PairingRound[] {
  if (teams.length < 2 || teams.length % 2 !== 0) return [];

  const ids = teams.map((team) => team.id);
  const indexById = new Map(ids.map((id, index) => [id, index]));
  const fixed = ids[0]!;
  let rotating = ids.slice(1);
  const firstHalf: PairingRound[] = [];

  for (let round = 0; round < ids.length - 1; round += 1) {
    const order = [fixed, ...rotating];
    const pairings: Pairing[] = [];

    for (let i = 0; i < order.length / 2; i += 1) {
      const left = order[i]!;
      const right = order[order.length - 1 - i]!;
      pairings.push(balancedOrientation(left, right, indexById, ids.length));
    }

    firstHalf.push({ number: round + 1, pairings, stage: "regular" });
    rotating = [rotating[rotating.length - 1]!, ...rotating.slice(0, -1)];
  }

  const secondHalf = firstHalf.map((item, index) => ({
    number: firstHalf.length + index + 1,
    stage: "regular" as const,
    pairings: item.pairings.map((pair) => ({ home: pair.away, away: pair.home })),
  }));

  return [...firstHalf, ...secondHalf];
}

function splitPlaceholders(startNumber: number, count: number): PairingRound[] {
  return Array.from({ length: count }, (_, index) => ({
    number: startNumber + index,
    stage: "split" as const,
    pairings: [] as Pairing[],
  }));
}

export function buildPairingRounds(preset: FormatPreset, teams: Team[]) {
  const regular = buildDoubleRoundRobin(teams);

  if (preset === "double-14") return regular;

  if (preset === "ten-triple") {
    const firstCycle = regular.slice(0, teams.length - 1);
    const thirdCycle = firstCycle.map((item, index) => ({
      number: regular.length + index + 1,
      stage: "regular" as const,
      pairings: item.pairings.map((pair) => ({ ...pair })),
    }));
    return [...regular, ...thirdCycle];
  }

  if (preset === "ten-split") {
    return [...regular, ...splitPlaceholders(regular.length + 1, 10)];
  }

  return [...regular, ...splitPlaceholders(regular.length + 1, 5)];
}

export function teamNameMap(teams: Team[]) {
  return Object.fromEntries(teams.map((team) => [team.id, team.name]));
}
