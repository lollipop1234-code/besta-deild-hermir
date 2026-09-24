import type { CalendarBlock, Round, Team } from "./types";
import type { PairingRound } from "./simulator";
import type { SpringEuropeDate } from "@/data/europe-spring-2027";
import { uefaTemplateForPath } from "@/data/uefa-template-2026";
import { cupTemplateForDepth, type CupDepth } from "@/data/mjolkurbikar-template-2026";

export type LoadEventKind = "besta" | "uefa-official" | "uefa-scenario" | "cup-scenario";
export type LoadCertainty = "scheduled" | "official" | "scenario";
export type FixtureDateOverrides = Record<string, string>;

export type TeamLoadEvent = {
  id: string;
  date: string;
  kind: LoadEventKind;
  certainty: LoadCertainty;
  label: string;
  detail: string;
  round?: number;
  fixtureId?: string;
};

export type RestGap = {
  from: TeamLoadEvent;
  to: TeamLoadEvent;
  fullRestDays: number;
  belowKsiMinimum: boolean;
  scenarioOnly: boolean;
};

export type TeamLoadSummary = {
  events: TeamLoadEvent[];
  gaps: RestGap[];
  shortestFullRestDays: number | null;
  belowMinimumCount: number;
  scenarioRiskCount: number;
  threeInEightCount: number;
};

export function fixtureKey(roundNumber: number, home: string, away: string) {
  return `${roundNumber}:${home}:${away}`;
}

function dayNumber(value: string) {
  return Math.floor(new Date(`${value}T12:00:00Z`).getTime() / 86_400_000);
}

function daysBetween(a: string, b: string) {
  return dayNumber(b) - dayNumber(a);
}

function isWithin(value: string, start: string, end: string) {
  return value >= start && value <= end;
}

function weekdayOnOrAfter(start: string, weekday: number) {
  const date = new Date(`${start}T12:00:00Z`);
  const delta = (weekday - date.getUTCDay() + 7) % 7;
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Haldið fyrir einingapróf og sem fallback ef template-gögn vantar fyrir leið.
export function buildQualifyingScenarioDates(
  team: Team,
  uefaWindow: CalendarBlock | undefined,
): string[] {
  if (team.europePath === "none" || !uefaWindow) return [];

  const weekday = team.europePath === "champions" ? 3 : 4;
  const dates: string[] = [];
  let cursor = weekdayOnOrAfter(uefaWindow.start, weekday);

  while (cursor <= uefaWindow.end) {
    dates.push(cursor);
    cursor = addDays(cursor, 7);
  }

  return dates;
}

export function buildTeamLoadEvents({
  team,
  pairingRounds,
  roundDates,
  teamNames,
  springEuropeTeamId,
  springEuropeDates,
  uefaWindow,
  includeUefaScenario,
  cupDepth = "none",
  fixtureDateOverrides = {},
}: {
  team: Team;
  pairingRounds: PairingRound[];
  roundDates: Round[];
  teamNames: Record<string, string>;
  springEuropeTeamId: string;
  springEuropeDates: SpringEuropeDate[];
  uefaWindow?: CalendarBlock;
  includeUefaScenario: boolean;
  cupDepth?: CupDepth;
  fixtureDateOverrides?: FixtureDateOverrides;
}): TeamLoadEvent[] {
  const dateByRound = new Map(roundDates.map((round) => [round.number, round.date]));
  const events: TeamLoadEvent[] = [];

  for (const round of pairingRounds) {
    const baseDate = dateByRound.get(round.number);
    if (!baseDate || round.pairings.length === 0) continue;

    const pair = round.pairings.find((candidate) => candidate.home === team.id || candidate.away === team.id);
    if (!pair) continue;

    const id = fixtureKey(round.number, pair.home, pair.away);
    const date = fixtureDateOverrides[id] ?? baseDate;
    const isHome = pair.home === team.id;
    const opponentId = isHome ? pair.away : pair.home;
    events.push({
      id: `besta-${round.number}`,
      fixtureId: id,
      date,
      kind: "besta",
      certainty: "scheduled",
      label: `Besta · umferð ${round.number}`,
      detail: `${isHome ? "Heima" : "Úti"} gegn ${teamNames[opponentId] ?? opponentId}`,
      round: round.number,
    });
  }

  if (team.id === springEuropeTeamId) {
    for (const match of springEuropeDates) {
      events.push({
        id: `spring-${match.date}-${match.label}`,
        date: match.date,
        kind: "uefa-official",
        certainty: "official",
        label: "UEFA",
        detail: match.label,
      });
    }
  }

  const templateSlots = uefaTemplateForPath(team.europePath);
  if (includeUefaScenario && templateSlots.length > 0) {
    for (const slot of templateSlots) {
      events.push({
        id: `uefa-template-${slot.id}`,
        date: slot.projectedDate,
        kind: "uefa-scenario",
        certainty: "scenario",
        label: slot.label,
        detail: `${slot.note} · 2026 sniðmát → 2027 áætlun`,
      });
    }
  } else if (includeUefaScenario && team.europePath !== "none" && uefaWindow) {
    for (const date of buildQualifyingScenarioDates(team, uefaWindow)) {
      events.push({
        id: `scenario-${date}`,
        date,
        kind: "uefa-scenario",
        certainty: "scenario",
        label: team.europePath === "champions" ? "UEFA · meistaraleið" : "UEFA · UECL",
        detail: "Fallback álagssviðsmynd · dagsetning ekki staðfest af UEFA",
      });
    }
  }

  for (const cupRound of cupTemplateForDepth(cupDepth)) {
    events.push({
      id: `cup-template-${cupRound.id}`,
      date: cupRound.projectedDate,
      kind: "cup-scenario",
      certainty: "scenario",
      label: `Mjólkurbikar · ${cupRound.label}`,
      detail: `${cupRound.note} · 2026 sniðmát → 2027 áætlun`,
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

export function summarizeTeamLoad(events: TeamLoadEvent[]): TeamLoadSummary {
  const ordered = [...events].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const gaps: RestGap[] = [];

  for (let index = 1; index < ordered.length; index += 1) {
    const from = ordered[index - 1]!;
    const to = ordered[index]!;
    const calendarDays = daysBetween(from.date, to.date);
    const fullRestDays = Math.max(0, calendarDays - 1);
    const scenarioOnly = from.certainty === "scenario" || to.certainty === "scenario";

    gaps.push({
      from,
      to,
      fullRestDays,
      belowKsiMinimum: fullRestDays < 2 && !scenarioOnly,
      scenarioOnly: fullRestDays < 2 && scenarioOnly,
    });
  }

  let threeInEightCount = 0;
  for (let index = 0; index + 2 < ordered.length; index += 1) {
    if (daysBetween(ordered[index]!.date, ordered[index + 2]!.date) <= 7) {
      threeInEightCount += 1;
    }
  }

  const shortest = gaps.length > 0 ? Math.min(...gaps.map((gap) => gap.fullRestDays)) : null;

  return {
    events: ordered,
    gaps,
    shortestFullRestDays: shortest,
    belowMinimumCount: gaps.filter((gap) => gap.belowKsiMinimum).length,
    scenarioRiskCount: gaps.filter((gap) => gap.scenarioOnly).length,
    threeInEightCount,
  };
}

export function visibleTeamLoadEvents(
  events: TeamLoadEvent[],
  seasonStart: string,
  seasonEnd: string,
) {
  const start = addDays(seasonStart, -7);
  const end = addDays(seasonEnd, 7);
  return events.filter((event) => isWithin(event.date, start, end));
}
