import { formatMetrics } from "@/lib/simulator";
import type { TeamLoadEvent } from "@/lib/team-load";
import type { CalendarBlock, FormatPreset, Round } from "@/lib/types";

import styles from "./PlaygroundOverview.module.css";

const presetLabel: Record<FormatPreset, string> = {
  "ten-triple": "Þreföld umferð",
  "ten-split": "5/5 split",
  "current-12-split": "Split",
  "double-14": "Tvöföld umferð",
};

function dayNumber(value: string) {
  return Math.floor(new Date(`${value}T12:00:00Z`).getTime() / 86_400_000);
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function position(value: string, start: string, end: string) {
  const total = Math.max(1, dayNumber(end) - dayNumber(start));
  return clamp(((dayNumber(value) - dayNumber(start)) / total) * 100);
}

function width(start: string, end: string, seasonStart: string, seasonEnd: string) {
  const left = position(start < seasonStart ? seasonStart : start, seasonStart, seasonEnd);
  const right = position(end > seasonEnd ? seasonEnd : end, seasonStart, seasonEnd);
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
    segments.push({
      id: monthStart,
      label: formatter.format(cursor).replace(".", "").toUpperCase(),
      left,
      width: Math.max(2, right - left),
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return segments;
}

function TeamCountButton({ teams, active, onClick }: { teams: 10 | 12 | 14; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`${styles.teamCountButton} ${active ? styles.active : ""}`} onClick={onClick}>
      {teams} lið
    </button>
  );
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
  const months = monthSegments(seasonStart, seasonEnd);
  const blocks = calendarBlocks.filter((block) => block.end >= seasonStart && block.start <= seasonEnd);
  const fifaBlocks = blocks.filter((block) => block.kind === "fifa");
  const uefaBlocks = blocks.filter((block) => block.kind === "uefa");
  const cupEvents = teamEvents.filter((event) => event.kind === "cup-scenario");

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
              <span>·</span>
              <button type="button" className={preset === "ten-split" ? styles.variantActive : ""} onClick={() => onPresetChange("ten-split")}>5/5 split</button>
            </div>
          )}
        </div>

        <button type="button" className={styles.rerunButton} onClick={onRerun}>↻ Keyra aftur</button>
      </div>

      <div className={styles.summaryLine}>
        <strong>{metrics.gamesPerTeam} leikir</strong>
        <span>{metrics.totalGames} alls</span>
        <span>{metrics.homeRange} heima/úti</span>
        <span>{presetLabel[preset]}</span>
        <span className={shortfall > 0 ? styles.fitBad : styles.fitGood}>
          {shortfall > 0 ? `vantar ${shortfall} leikdaga` : `${foundRounds}/${totalRounds} leikdagar komnir`}
        </span>
        <small>keyrsla {rerunCount}</small>
      </div>

      <div className={styles.boardHead}>
        <div>
          <h2>Tímabilið</h2>
          <p>Smelltu á umferð. Litirnir sýna hvar aðrar keppnir þrengja að.</p>
        </div>
        <div className={styles.legend} aria-label="Skýringar">
          <span><i className={styles.leagueDot} />Besta</span>
          <span><i className={styles.uefaDot} />UEFA · sniðmát</span>
          <span><i className={styles.fifaDot} />FIFA · staðfest</span>
          <span><i className={styles.cupDot} />Mjólkurbikar · sniðmát</span>
        </div>
      </div>

      <div className={styles.board}>
        <div className={styles.months}>
          {months.map((month) => (
            <span key={month.id} style={{ left: `${month.left}%`, width: `${month.width}%` }}>{month.label}</span>
          ))}
        </div>

        <div className={styles.lane}>
          <span className={styles.laneLabel}>Besta</span>
          <div className={styles.track}>
            {months.slice(1).map((month) => <i key={month.id} className={styles.monthLine} style={{ left: `${month.left}%` }} />)}
            {rounds.map((round) => (
              <button
                type="button"
                key={round.number}
                title={`${round.label} · umferð ${round.number}`}
                className={`${styles.roundButton} ${round.number === selectedRound ? styles.roundSelected : ""}`}
                style={{ left: `${position(round.date, seasonStart, seasonEnd)}%` }}
                onClick={() => onSelectRound(round.number)}
              >
                R{round.number}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.lane}>
          <span className={styles.laneLabel}>UEFA</span>
          <div className={styles.track}>
            {uefaBlocks.map((block) => (
              <span
                key={block.id}
                className={`${styles.window} ${styles.uefaWindow}`}
                style={{ left: `${position(block.start, seasonStart, seasonEnd)}%`, width: `${width(block.start, block.end, seasonStart, seasonEnd)}%` }}
                title={`${block.label} · ${block.confidence === "official" ? "staðfest" : "sniðmát"}`}
              />
            ))}
          </div>
        </div>

        <div className={styles.lane}>
          <span className={styles.laneLabel}>FIFA</span>
          <div className={styles.track}>
            {fifaBlocks.map((block) => (
              <span
                key={block.id}
                className={`${styles.window} ${styles.fifaWindow}`}
                style={{ left: `${position(block.start, seasonStart, seasonEnd)}%`, width: `${width(block.start, block.end, seasonStart, seasonEnd)}%` }}
                title={`${block.label} · staðfestur gluggi`}
              />
            ))}
          </div>
        </div>

        <div className={styles.lane}>
          <span className={styles.laneLabel}>Bikar</span>
          <div className={styles.track}>
            {cupEvents.map((event) => (
              <span
                key={event.id}
                className={styles.cupMarker}
                style={{ left: `${position(event.date, seasonStart, seasonEnd)}%` }}
                title={`${event.label} · sniðmát`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
