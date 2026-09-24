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

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function inBlock(date: string, block: CalendarBlock) {
  return date >= block.start && date <= block.end;
}

function nextSaturday(onOrAfter: string) {
  const date = new Date(`${onOrAfter}T12:00:00Z`);
  const day = date.getUTCDay();
  const delta = (6 - day + 7) % 7;
  return addDays(date, delta);
}

const icelandicMonths = [
  "jan.", "feb.", "mar.", "apr.", "maí", "jún.",
  "júl.", "ágú.", "sep.", "okt.", "nóv.", "des.",
];

function dateLabel(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  return `${date.getUTCDate()}. ${icelandicMonths[date.getUTCMonth()]}`;
}

export function buildRoundDates(
  preset: FormatPreset,
  seasonStart: string,
  seasonEnd: string,
  blocks: CalendarBlock[],
  avoidFifaWindows: boolean,
): { rounds: Round[]; shortfall: number } {
  const required = formatMetrics(preset).rounds;
  const dates: Round[] = [];
  let cursor = nextSaturday(seasonStart);

  while (iso(cursor) <= seasonEnd && dates.length < required) {
    const value = iso(cursor);
    const mandatoryBlackout = blocks.some(
      (block) => block.constraint === "blackout" && inBlock(value, block),
    );
    const fifaAvoidance = avoidFifaWindows && blocks.some(
      (block) => block.kind === "fifa" && block.constraint === "avoid" && inBlock(value, block),
    );

    if (!mandatoryBlackout && !fifaAvoidance) {
      dates.push({ number: dates.length + 1, date: value, label: dateLabel(value) });
    }
    cursor = addDays(cursor, 7);
  }

  return { rounds: dates, shortfall: Math.max(0, required - dates.length) };
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
    // 18 umferðir í tvöfaldri 10-liða deild. Eftir skiptingu 5/5 þarf 10
    // leikdagaglugga svo hvert lið geti spilað 8 leiki og fengið tvær bye-umferðir.
    return [...regular, ...splitPlaceholders(regular.length + 1, 10)];
  }

  // Núverandi 12 liða kerfi: 22 umferðir + 5 leikja split.
  return [...regular, ...splitPlaceholders(regular.length + 1, 5)];
}

export function teamNameMap(teams: Team[]) {
  return Object.fromEntries(teams.map((team) => [team.id, team.name]));
}
