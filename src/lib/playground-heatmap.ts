import type { CalendarBlock, Round } from "./types";
import type { TeamLoadEvent } from "./team-load";

export type HeatmapSignal = "league" | "fifa" | "uefa" | "cup" | "tight";

export type HeatmapWeek = {
  id: string;
  start: string;
  end: string;
  label: string;
  roundNumbers: number[];
  signals: HeatmapSignal[];
  eventCount: number;
  title: string;
};

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dayNumber(value: string) {
  return Math.floor(new Date(`${value}T12:00:00Z`).getTime() / 86_400_000);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("is-IS", { day: "numeric", month: "short" }).format(
    new Date(`${value}T12:00:00Z`),
  );
}

function intersects(startA: string, endA: string, startB: string, endB: string) {
  return startA <= endB && endA >= startB;
}

function eventSignal(event: TeamLoadEvent): HeatmapSignal | null {
  if (event.kind === "uefa-official" || event.kind === "uefa-scenario") return "uefa";
  if (event.kind === "cup-scenario") return "cup";
  return null;
}

function hasTightCluster(events: TeamLoadEvent[]) {
  if (events.length >= 3) return true;
  const ordered = [...events].sort((a, b) => a.date.localeCompare(b.date));
  for (let index = 1; index < ordered.length; index += 1) {
    if (dayNumber(ordered[index]!.date) - dayNumber(ordered[index - 1]!.date) <= 2) return true;
  }
  return false;
}

export function buildWeekHeatmap({
  seasonStart,
  seasonEnd,
  rounds,
  calendarBlocks,
  teamEvents,
}: {
  seasonStart: string;
  seasonEnd: string;
  rounds: Round[];
  calendarBlocks: CalendarBlock[];
  teamEvents: TeamLoadEvent[];
}): HeatmapWeek[] {
  const weeks: HeatmapWeek[] = [];
  let cursor = seasonStart;

  while (cursor <= seasonEnd) {
    const end = addDays(cursor, 6) > seasonEnd ? seasonEnd : addDays(cursor, 6);
    const roundNumbers = rounds
      .filter((round) => round.date >= cursor && round.date <= end)
      .map((round) => round.number);
    const events = teamEvents.filter((event) => event.date >= cursor && event.date <= end);
    const blocks = calendarBlocks.filter((block) => intersects(cursor, end, block.start, block.end));
    const signals = new Set<HeatmapSignal>();

    if (roundNumbers.length > 0) signals.add("league");
    if (blocks.some((block) => block.kind === "fifa")) signals.add("fifa");
    for (const event of events) {
      const signal = eventSignal(event);
      if (signal) signals.add(signal);
    }
    if (hasTightCluster(events)) signals.add("tight");

    const parts: string[] = [];
    if (roundNumbers.length > 0) parts.push(`Besta: ${roundNumbers.map((number) => `U${number}`).join(", ")}`);
    if (signals.has("uefa")) parts.push("UEFA");
    if (signals.has("cup")) parts.push("Mjólkurbikar");
    if (signals.has("fifa")) parts.push("FIFA");
    if (signals.has("tight")) parts.push("þröng vika");

    weeks.push({
      id: cursor,
      start: cursor,
      end,
      label: `${shortDate(cursor)}–${shortDate(end)}`,
      roundNumbers,
      signals: [...signals],
      eventCount: events.length,
      title: parts.length > 0 ? parts.join(" · ") : "Lausari vika",
    });

    cursor = addDays(cursor, 7);
  }

  return weeks;
}
