"use client";

import { useMemo, useState } from "react";

import { baselineDateIn2027, besta2026Baseline } from "@/data/besta-2026-baseline";
import { mjolkurbikarTemplate2027 } from "@/data/mjolkurbikar-template-2026";
import { formatMetrics } from "@/lib/simulator";
import type { CalendarBlock, FormatPreset, Round } from "@/lib/types";

import styles from "./GameBoard.module.css";

const BOARD_START = "2027-03-20";
const BOARD_END = "2027-11-10";
const DEFAULT_START = "2027-04-10";
const DEFAULT_END = "2027-10-23";
const MIN_WINDOW_DAYS = 14;

const presetLabel: Record<FormatPreset, string> = {
  "ten-triple": "Þreföld umferð",
  "ten-split": "5/5 split",
  "current-12-split": "22 + 5 split",
  "double-14": "Tvöföld umferð",
};

function dayNumber(value: string) {
  return Math.floor(new Date(`${value}T12:00:00Z`).getTime() / 86_400_000);
}

function isoFromDay(value: number) {
  return new Date(value * 86_400_000).toISOString().slice(0, 10);
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function position(value: string) {
  const start = dayNumber(BOARD_START);
  const end = dayNumber(BOARD_END);
  return clamp(((dayNumber(value) - start) / Math.max(1, end - start)) * 100);
}

function width(startValue: string, endValue: string) {
  return Math.max(0.8, position(endValue) - position(startValue));
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("is-IS", { day: "numeric", month: "short" }).format(
    new Date(`${value}T12:00:00Z`),
  );
}

function monthSegments() {
  const start = new Date(`${BOARD_START}T12:00:00Z`);
  const end = new Date(`${BOARD_END}T12:00:00Z`);
  const cursor = new Date(start);
  cursor.setUTCDate(1);
  const format = new Intl.DateTimeFormat("is-IS", { month: "short" });
  const items: Array<{ id: string; label: string; left: number }> = [];

  while (cursor <= end) {
    const value = cursor.toISOString().slice(0, 10);
    if (value >= BOARD_START) {
      items.push({ id: value, label: format.format(cursor).replace(".", "").toUpperCase(), left: position(value) });
    }
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return items;
}

function gapDays(a: string, b: string) {
  return dayNumber(b) - dayNumber(a);
}

function isWeekend(value: string) {
  const day = new Date(`${value}T12:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

function formatDelta(value: number) {
  if (value === 0) return "óbreytt";
  return `${value > 0 ? "+" : ""}${value} dagar`;
}

type Snapshot = {
  label: string;
  rounds: Round[];
  seasonStart: string;
  seasonEnd: string;
};

export default function GameBoard({
  preset,
  rounds,
  selectedRound,
  onSelectRound,
  onPresetChange,
  seasonStart,
  seasonEnd,
  onSeasonStartChange,
  onSeasonEndChange,
  shortfall,
  totalRounds,
  calendarBlocks,
  onOpenTeams,
  unknownVenues,
}: {
  preset: FormatPreset;
  rounds: Round[];
  selectedRound: number;
  onSelectRound: (round: number) => void;
  onPresetChange: (preset: FormatPreset) => void;
  seasonStart: string;
  seasonEnd: string;
  onSeasonStartChange: (value: string) => void;
  onSeasonEndChange: (value: string) => void;
  shortfall: number;
  totalRounds: number;
  calendarBlocks: CalendarBlock[];
  onOpenTeams: () => void;
  unknownVenues: number;
}) {
  const metrics = formatMetrics(preset);
  const teamCount = metrics.teams;
  const months = useMemo(() => monthSegments(), []);
  const [showGhost, setShowGhost] = useState(true);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [testDrive, setTestDrive] = useState(false);

  const denseRounds = useMemo(() => {
    const dense = new Set<number>();
    for (let index = 1; index < rounds.length; index += 1) {
      if (gapDays(rounds[index - 1]!.date, rounds[index]!.date) < 7) {
        dense.add(rounds[index - 1]!.number);
        dense.add(rounds[index]!.number);
      }
    }
    return dense;
  }, [rounds]);

  const denseGapCount = useMemo(() => (
    rounds.slice(1).filter((round, index) => gapDays(rounds[index]!.date, round.date) < 7).length
  ), [rounds]);
  const midweekCount = useMemo(() => rounds.filter((round) => !isWeekend(round.date)).length, [rounds]);
  const currentDuration = dayNumber(seasonEnd) - dayNumber(seasonStart);
  const defaultDuration = dayNumber(DEFAULT_END) - dayNumber(DEFAULT_START);
  const durationDelta = currentDuration - defaultDuration;

  const fifaBlocks = calendarBlocks.filter((block) => block.kind === "fifa" && block.end >= BOARD_START && block.start <= BOARD_END);
  const uefaBlocks = calendarBlocks.filter((block) => block.kind === "uefa" && block.end >= BOARD_START && block.start <= BOARD_END);

  const message = shortfall > 0
    ? {
      title: "Þetta gengur ekki alveg.",
      text: `${shortfall} umferð${shortfall === 1 ? " kemst" : "ir komast"} ekki inn án þess að brjóta lágmarkshvíld eða lokaða glugga.`,
      tone: "danger",
    }
    : denseGapCount >= 10
      ? { title: "Nú er orðið þétt.", text: `${denseGapCount} bil fara undir viku og ${midweekCount} umferðir lenda utan helgar.`, tone: "hot" }
      : denseGapCount >= 4
        ? { title: "Þetta er lifandi dagskrá.", text: `${denseGapCount} þétt bil. Þú ert farin/n að nota virka daga til að láta mótið ganga upp.`, tone: "warm" }
        : { title: "Þetta andar vel.", text: `${rounds.length}/${totalRounds} umferðir komast fyrir án mikillar þjöppunar.`, tone: "calm" };

  const startMin = dayNumber(BOARD_START);
  const endMax = dayNumber(BOARD_END);
  const startValue = dayNumber(seasonStart);
  const endValue = dayNumber(seasonEnd);

  function chooseTeamCount(count: 10 | 12 | 14) {
    if (count === 10) onPresetChange(preset === "ten-split" ? "ten-split" : "ten-triple");
    if (count === 12) onPresetChange("current-12-split");
    if (count === 14) onPresetChange("double-14");
  }

  function handleStart(day: number) {
    onSeasonStartChange(isoFromDay(Math.min(day, endValue - MIN_WINDOW_DAYS)));
    onSelectRound(1);
  }

  function handleEnd(day: number) {
    onSeasonEndChange(isoFromDay(Math.max(day, startValue + MIN_WINDOW_DAYS)));
    onSelectRound(1);
  }

  function resetSeason() {
    onSeasonStartChange(DEFAULT_START);
    onSeasonEndChange(DEFAULT_END);
    onSelectRound(1);
    setTestDrive(false);
  }

  function pinCurrent() {
    setSnapshot({
      label: `${teamCount} lið · ${presetLabel[preset]}`,
      rounds: rounds.map((round) => ({ ...round })),
      seasonStart,
      seasonEnd,
    });
  }

  function startDrive() {
    setTestDrive(true);
    onSelectRound(1);
  }

  function nextRound() {
    if (selectedRound >= rounds.length) {
      setTestDrive(false);
      return;
    }
    onSelectRound(selectedRound + 1);
  }

  const baselineStart = baselineDateIn2027(besta2026Baseline.seasonStart);
  const baselineEnd = baselineDateIn2027(besta2026Baseline.seasonEnd);

  return (
    <section className={styles.game} aria-label="Leikborð Bestu deildarinnar">
      <div className={styles.gameTop}>
        <div>
          <div className={styles.kicker}>BYGGÐU BESTU DEILDINA</div>
          <h1>Settu mótið á borðið.</h1>
          <p>Togaðu í tímabilið. Skiptu um form. Sjáðu strax hvað brotnar.</p>
        </div>
        <div className={styles.utilityActions}>
          <button type="button" onClick={() => setShowGhost((value) => !value)} className={showGhost ? styles.utilityActive : ""}>👻 2026</button>
          <button type="button" onClick={snapshot ? () => setSnapshot(null) : pinCurrent}>{snapshot ? "Sleppa festingu" : "📌 Festa útgáfu"}</button>
          <button type="button" onClick={onOpenTeams}>Lið og vellir{unknownVenues > 0 ? ` · ${unknownVenues}?` : ""}</button>
        </div>
      </div>

      <div className={styles.formatPick}>
        <span>Hvað viltu mörg lið?</span>
        <div className={styles.teamButtons}>
          {[10, 12, 14].map((count) => (
            <button
              key={count}
              type="button"
              className={teamCount === count ? styles.teamActive : ""}
              onClick={() => chooseTeamCount(count as 10 | 12 | 14)}
            >
              <b>{count}</b><small>lið</small>
            </button>
          ))}
        </div>
        {teamCount === 10 && (
          <div className={styles.tenMode}>
            <button type="button" className={preset === "ten-triple" ? styles.modeActive : ""} onClick={() => onPresetChange("ten-triple")}>Þreföld umferð</button>
            <button type="button" className={preset === "ten-split" ? styles.modeActive : ""} onClick={() => onPresetChange("ten-split")}>5/5 split</button>
          </div>
        )}
        <div className={styles.formatFact}>{metrics.gamesPerTeam} leikir á lið · {metrics.totalGames} alls · {presetLabel[preset]}</div>
      </div>

      <div className={styles.boardFrame}>
        <div className={styles.boardHeader}>
          <div className={`${styles.gameMessage} ${styles[message.tone]}`}>
            <strong>{message.title}</strong>
            <span>{message.text}</span>
          </div>
          <div className={styles.boardStats}>
            <b>{rounds.length}/{totalRounds}</b><span>umferðir</span>
            <b>{denseGapCount}</b><span>þétt bil</span>
            <b>{midweekCount}</b><span>utan helgar</span>
            <b>{formatDelta(durationDelta)}</b><span>vs. sjálfgefið tímabil</span>
          </div>
        </div>

        <div className={styles.monthLine}>
          {months.map((month) => <span key={month.id} style={{ left: `${month.left}%` }}>{month.label}</span>)}
        </div>

        <div className={styles.worldLane}>
          <span className={styles.worldLabel}>RAUNVERULEIKINN</span>
          <div className={styles.worldTrack}>
            {uefaBlocks.map((block) => (
              <span key={block.id} className={`${styles.worldBlock} ${styles.uefa}`} style={{ left: `${position(block.start)}%`, width: `${width(block.start, block.end)}%` }} title={`${block.label} · sniðmát`}>
                <em>UEFA</em>
              </span>
            ))}
            {fifaBlocks.map((block) => (
              <span key={block.id} className={`${styles.worldBlock} ${styles.fifa}`} style={{ left: `${position(block.start)}%`, width: `${width(block.start, block.end)}%` }} title={`${block.label} · staðfest`}>
                <em>FIFA</em>
              </span>
            ))}
            {mjolkurbikarTemplate2027.map((round) => (
              <span key={round.id} className={styles.cupPin} style={{ left: `${position(round.projectedDate)}%` }} title={`${round.label} · 2026 sniðmát`}>B</span>
            ))}
          </div>
        </div>

        <div className={styles.seasonLane}>
          <span className={styles.worldLabel}>ÞITT MÓT</span>
          <div className={styles.seasonTrack}>
            <span className={styles.seasonRail} style={{ left: `${position(seasonStart)}%`, width: `${width(seasonStart, seasonEnd)}%` }} />
            {rounds.map((round) => {
              const dense = denseRounds.has(round.number);
              const weekday = !isWeekend(round.date);
              const played = testDrive && round.number < selectedRound;
              return (
                <button
                  type="button"
                  key={round.number}
                  className={`${styles.roundPuck} ${dense ? styles.roundDense : ""} ${weekday ? styles.roundWeekday : ""} ${played ? styles.roundPlayed : ""} ${round.number === selectedRound ? styles.roundSelected : ""}`}
                  style={{ left: `${position(round.date)}%` }}
                  onClick={() => onSelectRound(round.number)}
                  title={`R${round.number} · ${round.label}${dense ? " · þétt bil" : ""}${weekday ? " · virkur dagur" : ""}`}
                >
                  {round.number}
                </button>
              );
            })}
          </div>
        </div>

        {snapshot && (
          <div className={styles.snapshotLane}>
            <span className={styles.worldLabel}>FEST</span>
            <div className={styles.snapshotTrack} title={`${snapshot.label} · ${shortDate(snapshot.seasonStart)}–${shortDate(snapshot.seasonEnd)}`}>
              <span className={styles.snapshotRail} style={{ left: `${position(snapshot.seasonStart)}%`, width: `${width(snapshot.seasonStart, snapshot.seasonEnd)}%` }} />
              {snapshot.rounds.map((round) => <i key={round.number} style={{ left: `${position(round.date)}%` }} />)}
            </div>
          </div>
        )}

        {showGhost && (
          <div className={styles.ghostLane}>
            <span className={styles.worldLabel}>2026 👻</span>
            <div className={styles.ghostTrack}>
              <span className={styles.ghostRail} style={{ left: `${position(baselineStart)}%`, width: `${width(baselineStart, baselineEnd)}%` }} />
              <i style={{ left: `${position(baselineStart)}%` }}>1</i>
              <i style={{ left: `${position(baselineDateIn2027(besta2026Baseline.regularEnd))}%` }}>22</i>
              {besta2026Baseline.splitWindows.map((window) => <i key={window.round} style={{ left: `${position(baselineDateIn2027(window.start))}%` }}>S{window.round - 22}</i>)}
            </div>
          </div>
        )}

        <div className={styles.seasonHandles}>
          <div className={styles.handleTrack}>
            <span className={styles.activeWindow} style={{ left: `${position(seasonStart)}%`, width: `${width(seasonStart, seasonEnd)}%` }} />
            <input
              aria-label="Upphaf tímabils"
              type="range"
              min={startMin}
              max={endMax}
              value={startValue}
              onChange={(event) => handleStart(Number(event.target.value))}
            />
            <input
              aria-label="Lok tímabils"
              type="range"
              min={startMin}
              max={endMax}
              value={endValue}
              onChange={(event) => handleEnd(Number(event.target.value))}
            />
            <span className={styles.startLabel} style={{ left: `${position(seasonStart)}%` }}>← {shortDate(seasonStart)}</span>
            <span className={styles.endLabel} style={{ left: `${position(seasonEnd)}%` }}>{shortDate(seasonEnd)} →</span>
          </div>
          <button type="button" onClick={resetSeason}>Endurstilla tímabil</button>
        </div>

        <div className={styles.playBar}>
          {!testDrive ? (
            <button type="button" className={styles.playButton} onClick={startDrive} disabled={rounds.length === 0}>▶ Prufukeyra mótið</button>
          ) : (
            <button type="button" className={styles.playButton} onClick={nextRound}>{selectedRound >= rounds.length ? "■ Ljúka prufukeyrslu" : `▶ Spila R${selectedRound + 1}`}</button>
          )}
          <span>{testDrive ? `Þú ert í R${selectedRound}. Smelltu líka beint á hvaða umferð sem er.` : "Prufukeyrsla lætur þig ganga í gegnum mótið eins og leikjadagatal."}</span>
        </div>
      </div>
    </section>
  );
}
