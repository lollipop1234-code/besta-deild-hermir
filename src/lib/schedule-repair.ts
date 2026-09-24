import type { SpringEuropeDate } from "@/data/europe-spring-2027";
import type { CupDepth } from "@/data/mjolkurbikar-template-2026";
import type { Pairing, PairingRound } from "./simulator";
import {
  buildTeamLoadEvents,
  fixtureKey,
  summarizeTeamLoad,
  visibleTeamLoadEvents,
  type FixtureDateOverrides,
  type TeamLoadSummary,
} from "./team-load";
import type { CalendarBlock, Round, Team } from "./types";

export type RepairBasis = "confirmed" | "scenario";

export type ScheduleRepairSuggestion = {
  fixtureId: string;
  round: number;
  home: string;
  away: string;
  teamId: string;
  opponentId: string;
  originalDate: string;
  proposedDate: string;
  shiftDays: number;
  basis: RepairBasis;
  beforeSelected: TeamLoadSummary;
  afterSelected: TeamLoadSummary;
  beforeOpponent: TeamLoadSummary;
  afterOpponent: TeamLoadSummary;
};

export type FindRepairInput = {
  team: Team;
  teams: Team[];
  pairingRounds: PairingRound[];
  roundDates: Round[];
  teamNames: Record<string, string>;
  springEuropeTeamId: string;
  springEuropeDates: SpringEuropeDate[];
  uefaWindow?: CalendarBlock;
  includeUefaScenario: boolean;
  cupDepthByTeam?: Record<string, CupDepth>;
  fixtureDateOverrides?: FixtureDateOverrides;
  calendarBlocks: CalendarBlock[];
  avoidFifaWindows: boolean;
  seasonStart: string;
  seasonEnd: string;
};

function dayNumber(value: string) {
  return Math.floor(new Date(`${value}T12:00:00Z`).getTime() / 86_400_000);
}

function daysBetween(a: string, b: string) {
  return dayNumber(b) - dayNumber(a);
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function inRange(value: string, start: string, end: string) {
  return value >= start && value <= end;
}

function candidateIsCalendarSafe(
  date: string,
  blocks: CalendarBlock[],
  avoidFifaWindows: boolean,
) {
  for (const block of blocks) {
    if (!inRange(date, block.start, block.end)) continue;
    if (block.constraint === "blackout") return false;
    if (avoidFifaWindows && block.kind === "fifa" && block.constraint === "avoid") return false;
  }
  return true;
}

function findPairing(rounds: PairingRound[], roundNumber: number, teamId: string) {
  const round = rounds.find((item) => item.number === roundNumber);
  if (!round) return undefined;
  const pair = round.pairings.find((candidate) => candidate.home === teamId || candidate.away === teamId);
  if (!pair) return undefined;
  return { round, pair };
}

function opponentIdFor(pair: Pairing, teamId: string) {
  return pair.home === teamId ? pair.away : pair.home;
}

function summaryForTeam(
  team: Team,
  input: FindRepairInput,
  overrides: FixtureDateOverrides,
) {
  const events = buildTeamLoadEvents({
    team,
    pairingRounds: input.pairingRounds,
    roundDates: input.roundDates,
    teamNames: input.teamNames,
    springEuropeTeamId: input.springEuropeTeamId,
    springEuropeDates: input.springEuropeDates,
    uefaWindow: input.uefaWindow,
    includeUefaScenario: input.includeUefaScenario,
    cupDepth: input.cupDepthByTeam?.[team.id] ?? "round32",
    fixtureDateOverrides: overrides,
  });
  return summarizeTeamLoad(visibleTeamLoadEvents(events, input.seasonStart, input.seasonEnd));
}

function targetRisk(summary: TeamLoadSummary) {
  const confirmed = summary.gaps.find((gap) => gap.belowKsiMinimum && (gap.from.kind === "besta" || gap.to.kind === "besta"));
  if (confirmed) return { gap: confirmed, basis: "confirmed" as const };

  const scenario = summary.gaps.find((gap) => gap.scenarioOnly && (gap.from.kind === "besta" || gap.to.kind === "besta"));
  if (scenario) return { gap: scenario, basis: "scenario" as const };

  return undefined;
}

function bestaEventFromRisk(risk: ReturnType<typeof targetRisk>) {
  if (!risk) return undefined;
  if (risk.gap.to.kind === "besta") return risk.gap.to;
  if (risk.gap.from.kind === "besta") return risk.gap.from;
  return undefined;
}

function improvesSelectedTeam(
  basis: RepairBasis,
  before: TeamLoadSummary,
  after: TeamLoadSummary,
) {
  if (after.belowMinimumCount > before.belowMinimumCount) return false;
  if (after.threeInEightCount > before.threeInEightCount) return false;

  if (basis === "confirmed") {
    return after.belowMinimumCount < before.belowMinimumCount;
  }

  return (
    after.belowMinimumCount === before.belowMinimumCount &&
    after.scenarioRiskCount < before.scenarioRiskCount
  );
}

function doesNotHarmOpponent(before: TeamLoadSummary, after: TeamLoadSummary) {
  return (
    after.belowMinimumCount <= before.belowMinimumCount &&
    after.scenarioRiskCount <= before.scenarioRiskCount &&
    after.threeInEightCount <= before.threeInEightCount
  );
}

export function findScheduleRepair(input: FindRepairInput): ScheduleRepairSuggestion | null {
  const currentOverrides = input.fixtureDateOverrides ?? {};
  const beforeSelected = summaryForTeam(input.team, input, currentOverrides);
  const risk = targetRisk(beforeSelected);
  const bestaEvent = bestaEventFromRisk(risk);

  if (!risk || !bestaEvent?.round) return null;

  const located = findPairing(input.pairingRounds, bestaEvent.round, input.team.id);
  if (!located) return null;

  const { pair } = located;
  const id = fixtureKey(bestaEvent.round, pair.home, pair.away);
  const opponentId = opponentIdFor(pair, input.team.id);
  const opponent = input.teams.find((team) => team.id === opponentId);
  if (!opponent) return null;

  const beforeOpponent = summaryForTeam(opponent, input, currentOverrides);
  const originalDate = bestaEvent.date;
  const candidateDeltas = [1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6];

  for (const delta of candidateDeltas) {
    const proposedDate = addDays(originalDate, delta);
    if (proposedDate < input.seasonStart || proposedDate > input.seasonEnd) continue;
    if (!candidateIsCalendarSafe(proposedDate, input.calendarBlocks, input.avoidFifaWindows)) continue;

    const overrides = { ...currentOverrides, [id]: proposedDate };
    const afterSelected = summaryForTeam(input.team, input, overrides);
    if (!improvesSelectedTeam(risk.basis, beforeSelected, afterSelected)) continue;

    const afterOpponent = summaryForTeam(opponent, input, overrides);
    if (!doesNotHarmOpponent(beforeOpponent, afterOpponent)) continue;

    return {
      fixtureId: id,
      round: bestaEvent.round,
      home: pair.home,
      away: pair.away,
      teamId: input.team.id,
      opponentId,
      originalDate,
      proposedDate,
      shiftDays: daysBetween(originalDate, proposedDate),
      basis: risk.basis,
      beforeSelected,
      afterSelected,
      beforeOpponent,
      afterOpponent,
    };
  }

  return null;
}
