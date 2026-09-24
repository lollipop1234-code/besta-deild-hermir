import { baselineDateIn2027, besta2026Baseline } from "@/data/besta-2026-baseline";
import { formatMetrics } from "@/lib/simulator";
import type { TeamLoadEvent } from "@/lib/team-load";
import type { CalendarBlock, FormatPreset, Round } from "@/lib/types";

import styles from "./PlaygroundOverview.module.css";

const DEFAULT_SEASON_END = "2027-10-23";

const presetLabel: Record<FormatPreset, string> = {
  "ten-triple": "Þreföld umferð",
  "ten-split": "5/5 split",
  "current-12-split": "22 + 5 split",
  "double-14": "Tvöföld umferð",
};

function dayNumber(value: string) {
  return Math.floor(new Date(`${value}T12:00:00Z`).getTime() / 86_400_000);
}

function daysBetween(a: string, b: string) {
  return dayNumber(b) - dayNumber(a);
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function position(value: string, start: string, end: string) {
  const total = Math.max(1, dayNumber(end) - dayNumber(start));
  return clamp(((dayNumber(value) - dayNumber(start)) / total) * 100);
}

function width(start: string, end: string, boardStart: string, boardEnd: string) {
  const left = position(start < boardStart ? boardStart : start, boardStart, boardEnd);
  const right = position(end > boardEnd ? boardEnd : end, boardStart, boardEnd);
  return Math.max(1.4, right - left);
}

function monthSegments(start: string, end: string) {
  const segments: Array<{ id: string; label: string; left: number; width: number }> = [];
  const cursor = new Date(`${start}T12:00:00Z`);
  cursor.setUTCDate(1);
  const formatter = new Intl.DateTimeFormat("is-IS", { month: "short" });

  while (cursor.toISOString().slice(0, 10) <= end) {
    const monthStart = cursor.toISOString().slice(0, 10);
    const next = new Date(cursor);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const monthEndDate = new Date(next);
    monthEndDate.setUTCDate(0);
    const monthEnd = monthEndDate.toISOString().slice(0, 10);
    const visibleStart = monthStart < start ? start : monthStart;
    const visibleEnd = monthEnd > end ? end : monthEnd;
    const left = position(visibleStart, start, end);
    const right = position(visibleEnd, start, end);
    segments.push({ id: monthStart, label: formatter.format(cursor).replace(".", "").toUpperCase(), left, width: Math.max(2, right - left) });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return segments;
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("is-IS", { day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00Z`));
}

function signedDays(value: number) {
  if (value === 0) return "sama dag";
  return `${value > 0 ? "+" : ""}${value} dagar`;
}

function isWeekday(value: string) {
  const day = new Date(`${value}T12:00:00Z`).getUTCDay();
  return day >= 1 && day <= 5;
}

function TeamCountButton({ teams, active, onClick }: { teams: 10 | 12 | 14; active: boolean; onClick: () => void }) {
  return <button type="button" className={`${styles.teamCountButton} ${active ? styles.active : ""}`} onClick={onClick}>{teams} lið</button>;
}

export default function PlaygroundOverview({
  preset,
  onPresetChange,
  rounds,
  selectedRound,
  onSelectRound,
  calendarBlocks,
  teamEvents,
  seasonStart,
  seasonEnd,
  shortfall,
  foundRounds,
  totalRounds,
  rerunCount,
  onRerun,
}: {
  preset: FormatPreset;
  onPresetChange: (preset: FormatPreset) => void;
  rounds: Round[];
  selectedRound: number;
  onSelectRound: (round: number) => void;
  calendarBlocks: CalendarBlock[];
  teamEvents: TeamLoadEvent[];
  seasonStart: string;
  seasonEnd: string;
  shortfall: number;
  foundRounds: number;
  totalRounds: number;
  rerunCount: number;
  onRerun: () => void;
}) {
  const metrics = formatMetrics(preset);
  const teamCount = metrics.teams;
  const baselineStart = baselineDateIn2027(besta2026Baseline.seasonStart);
  const baselineRegularEnd = baselineDateIn2027(besta2026Baseline.regularEnd);
  const baselineEnd = baselineDateIn2027(besta2026Baseline.seasonEnd);
  const boardStart = seasonStart < baselineStart ? seasonStart : baselineStart;
  const boardEnd = seasonEnd > baselineEnd ? seasonEnd : baselineEnd;
  const months = monthSegments(boardStart, boardEnd);
  const blocks = calendarBlocks.filter((block) => block.end >= boardStart && block.start <= boardEnd);
  const fifaBlocks = blocks.filter((block) => block.kind === "fifa");
  const uefaBlocks = blocks.filter((block) => block.kind === "uefa");
  const cupEvents = teamEvents.filter((event) => event.kind === "cup-scenario");
  const trialEnd = rounds.at(-1)?.date ?? seasonEnd;
  const splitStartRound = preset === "current-12-split" ? 23 : preset === "ten-split" ? 19 : null;
  const trialSplitStart = splitStartRound ? rounds[splitStartRound - 1]?.date : undefined;
  const endDifference = dayNumber(trialEnd) - dayNumber(baselineEnd);
  const splitDifference = trialSplitStart ? dayNumber(trialSplitStart) - dayNumber(baselineDateIn2027(besta2026Baseline.splitWindows[0].start)) : null;
  const seasonChange = dayNumber(seasonEnd) - dayNumber(DEFAULT_SEASON_END);
  const gaps = rounds.slice(1).map((round, index) => daysBetween(rounds[index]!.date, round.date));
  const tightGapCount = gaps.filter((gap) => gap < 7).length;
  const tightestGap = gaps.length > 0 ? Math.min(...gaps) : null;
  const weekdayRoundCount = rounds.filter((round) => isWeekday(round.date)).length;

  function chooseTeamCount(count: 10 | 12 | 14) {
    if (count === 10) onPresetChange(preset === "ten-split" ? "ten-split" : "ten-triple");
    if (count === 12) onPresetChange("current-12-split");
    if (count === 14) onPresetChange("double-14");
  }

  return (
    <section className={styles.shell} aria-label="Tímabil og mótaval">
      <div className={styles.controlsRow}>
        <div>
          <div className={styles.teamChoices}>
            <TeamCountButton teams={10} active={teamCount === 10} onClick={() => chooseTeamCount(10)} />
            <TeamCountButton teams={12} active={teamCount === 12} onClick={() => chooseTeamCount(12)} />
            <TeamCountButton teams={14} active={teamCount === 14} onClick={() => chooseTeamCount(14)} />
          </div>
          {teamCount === 10 && (
            <div className={styles.variantChoices}>
              <button type="button" className={preset === "ten-triple" ? styles.variantActive : ""} onClick={() => onPresetChange("ten-triple")}>Þreföld umferð</button>
              <span>/</span>
              <button type="button" className={preset === "ten-split" ? styles.variantActive : ""} onClick={() => onPresetChange("ten-split")}>5/5 split</button>
            </div>
          )}
        </div>
        <button type="button" className={styles.rerunButton} onClick={onRerun}>Endurkeyra</button>
      </div>

      <div className={styles.summaryLine}>
        <strong>{metrics.gamesPerTeam} leikir á lið</strong>
        <span>{metrics.totalGames} alls</span>
        <span>{metrics.homeRange} heima/úti</span>
        <span>{presetLabel[preset]}</span>
        <span className={shortfall > 0 ? styles.fitBad : styles.fitGood}>{shortfall > 0 ? `vantar ${shortfall} leikdaga` : `${foundRounds}/${totalRounds} leikdagar`}</span>
        <small>keyrsla {rerunCount}</small>
      </div>

      <div className={`${styles.impactLine} ${shortfall > 0 ? styles.impactBad : ""}`}>
        <strong>{shortfall > 0 ? `${foundRounds}/${totalRounds} komast inn` : `${totalRounds}/${totalRounds} umferðir halda sér`}</strong>
        {seasonChange !== 0 && <span>{seasonChange < 0 ? `tímabilið stytt um ${Math.abs(seasonChange)} daga` : `tímabilið lengt um ${seasonChange} daga`}</span>}
        <span>{tightGapCount} bil undir viku</span>
        <span>{weekdayRoundCount} umferðir utan helgar</span>
        {tightestGap !== null && <span>minnst {Math.max(0, tightestGap - 1)} heilir hvíldardagar</span>}
      </div>

      <div className={styles.boardHead}>
        <div>
          <h2>Fiktaðu í tímabilinu</h2>
          <p>Styttu lokadaginn í stillingunum fyrir ofan. Umferðirnar færa sig sjálfar. Gulir hringir sýna hvar dagskráin þéttist.</p>
        </div>
        <div className={styles.legend} aria-label="Skýringar">
          <span><i className={styles.leagueDot} />Prufuplan</span>
          <span><i className={styles.tightDot} />Þétt bil</span>
          <span><i className={styles.baselineDot} />2026</span>
          <span><i className={styles.uefaDot} />UEFA</span>
          <span><i className={styles.fifaDot} />FIFA</span>
          <span><i className={styles.cupDot} />Bikar</span>
        </div>
      </div>

      <div className={styles.board}>
        <div className={styles.months}>{months.map((month) => <span key={month.id} style={{ left: `${month.left}%`, width: `${month.width}%` }}>{month.label}</span>)}</div>

        <div className={styles.lane}>
          <span className={styles.laneLabel}>PRUFA</span>
          <div className={`${styles.track} ${styles.roundTrack}`}>
            {months.slice(1).map((month) => <i key={month.id} className={styles.monthLine} style={{ left: `${month.left}%` }} />)}
            {rounds.map((round, index) => {
              const beforeGap = index > 0 ? daysBetween(rounds[index - 1]!.date, round.date) : null;
              const afterGap = index < rounds.length - 1 ? daysBetween(round.date, rounds[index + 1]!.date) : null;
              const tight = (beforeGap !== null && beforeGap < 7) || (afterGap !== null && afterGap < 7);
              const className = [
                styles.roundButton,
                round.number === selectedRound ? styles.roundSelected : "",
                tight ? styles.roundTight : "",
                isWeekday(round.date) ? styles.roundWeekday : "",
              ].filter(Boolean).join(" ");

              return (
                <button
                  type="button"
                  key={round.number}
                  title={`${round.label} · umferð ${round.number}${tight ? " · þétt dagskrá" : ""}`}
                  className={className}
                  style={{ left: `${position(round.date, boardStart, boardEnd)}%` }}
                  onClick={() => onSelectRound(round.number)}
                >
                  {round.number}
                </button>
              );
            })}
          </div>
        </div>

        <div className={`${styles.lane} ${styles.baselineLane}`}>
          <span className={styles.laneLabel}>2026</span>
          <div className={styles.track}>
            <span className={styles.baselineBar} style={{ left: `${position(baselineStart, boardStart, boardEnd)}%`, width: `${width(baselineStart, baselineEnd, boardStart, boardEnd)}%` }} />
            <span className={styles.baselineMarker} style={{ left: `${position(baselineStart, boardStart, boardEnd)}%` }} title="2026 hófst 10. apríl">1</span>
            <span className={styles.baselineMarker} style={{ left: `${position(baselineRegularEnd, boardStart, boardEnd)}%` }} title="22. umferð lauk 5.–6. september">22</span>
            {besta2026Baseline.splitWindows.map((window) => {
              const value = baselineDateIn2027(window.start);
              return <span key={window.round} className={styles.baselineMarker} style={{ left: `${position(value, boardStart, boardEnd)}%` }} title={`${window.label} · ${window.start.slice(5)}–${window.end.slice(5)}`}>{window.round}</span>;
            })}
          </div>
        </div>

        <div className={styles.lane}><span className={styles.laneLabel}>UEFA</span><div className={styles.track}>{uefaBlocks.map((block) => <span key={block.id} className={`${styles.window} ${styles.uefaWindow}`} style={{ left: `${position(block.start, boardStart, boardEnd)}%`, width: `${width(block.start, block.end, boardStart, boardEnd)}%` }} title={`${block.label} · ${block.confidence === "official" ? "staðfest" : "sniðmát"}`} />)}</div></div>
        <div className={styles.lane}><span className={styles.laneLabel}>FIFA</span><div className={styles.track}>{fifaBlocks.map((block) => <span key={block.id} className={`${styles.window} ${styles.fifaWindow}`} style={{ left: `${position(block.start, boardStart, boardEnd)}%`, width: `${width(block.start, block.end, boardStart, boardEnd)}%` }} title={`${block.label} · staðfestur gluggi`} />)}</div></div>
        <div className={styles.lane}><span className={styles.laneLabel}>BIKAR</span><div className={styles.track}>{cupEvents.map((event) => <span key={event.id} className={styles.cupMarker} style={{ left: `${position(event.date, boardStart, boardEnd)}%` }} title={`${event.label} · sniðmát`} />)}</div></div>
      </div>

      <div className={styles.compareLine}>
        <b>vs. 2026</b>
        <span>upphaf {shortDate(seasonStart)} vs. 10. apr.</span>
        {trialSplitStart && <span>split {shortDate(trialSplitStart)} · {signedDays(splitDifference ?? 0)}</span>}
        <span>lok {shortDate(trialEnd)} · {signedDays(endDifference)}</span>
        <a href={besta2026Baseline.sources[0].url} target="_blank" rel="noreferrer">KSÍ 2026 ↗</a>
      </div>
    </section>
  );
}
