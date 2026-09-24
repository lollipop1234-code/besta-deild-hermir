import type { CalendarBlock, FormatPreset, Round, Team } from "@/lib/types";

export type Pairing = { home: string; away: string };
export type PairingRound = { number: number; pairings: Pairing[]; stage: "regular" | "split" };

export function formatMetrics(preset: FormatPreset) {
  if (preset === "double-14") {
    return { teams: 14, gamesPerTeam: 26, totalGames: 182, rounds: 26, homeRange: "13 / 13" };
  }
  return { teams: 12, gamesPerTeam: 27, totalGames: 162, rounds: 27, homeRange: "13–14 / 13–14" };
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
  protectFifaWindows: boolean,
): { rounds: Round[]; shortfall: number } {
  const required = formatMetrics(preset).rounds;
  const hardBlocks = protectFifaWindows ? blocks.filter((block) => block.kind === "fifa" && block.hard) : [];
  const dates: Round[] = [];
  let cursor = nextSaturday(seasonStart);

  while (iso(cursor) <= seasonEnd && dates.length < required) {
    const value = iso(cursor);
    const blocked = hardBlocks.some((block) => inBlock(value, block));
    if (!blocked) {
      dates.push({ number: dates.length + 1, date: value, label: dateLabel(value) });
    }
    cursor = addDays(cursor, 7);
  }

  return { rounds: dates, shortfall: Math.max(0, required - dates.length) };
}

export function buildDoubleRoundRobin(teams: Team[]): PairingRound[] {
  if (teams.length < 2 || teams.length % 2 !== 0) return [];

  const ids = teams.map((team) => team.id);
  const fixed = ids[0]!;
  let rotating = ids.slice(1);
  const firstHalf: PairingRound[] = [];

  for (let round = 0; round < ids.length - 1; round += 1) {
    const order = [fixed, ...rotating];
    const pairings: Pairing[] = [];

    for (let i = 0; i < order.length / 2; i += 1) {
      const left = order[i]!;
      const right = order[order.length - 1 - i]!;
      const flip = (round + i) % 2 === 1;
      pairings.push(flip ? { home: right, away: left } : { home: left, away: right });
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

export function buildPairingRounds(preset: FormatPreset, teams: Team[]) {
  const regular = buildDoubleRoundRobin(teams);
  if (preset === "double-14") return regular;

  return [
    ...regular,
    ...Array.from({ length: 5 }, (_, index) => ({
      number: regular.length + index + 1,
      stage: "split" as const,
      pairings: [] as Pairing[],
    })),
  ];
}

export function teamNameMap(teams: Team[]) {
  return Object.fromEntries(teams.map((team) => [team.id, team.name]));
}
