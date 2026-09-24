import { formatMetrics } from "@/lib/simulator";
import type { HeatmapWeek } from "@/lib/playground-heatmap";
import type { FormatPreset } from "@/lib/types";

import styles from "./PlaygroundOverview.module.css";

const options: Array<{ preset: FormatPreset; teams: number; label: string; tag: string }> = [
  { preset: "ten-triple", teams: 10, label: "Þreföld", tag: "×3" },
  { preset: "ten-split", teams: 10, label: "5/5 split", tag: "split" },
  { preset: "current-12-split", teams: 12, label: "Núverandi", tag: "split" },
  { preset: "double-14", teams: 14, label: "Tvöföld", tag: "×2" },
];

const presetLabel: Record<FormatPreset, string> = {
  "ten-triple": "10 lið · þreföld umferð",
  "ten-split": "10 lið · 5/5 split",
  "current-12-split": "12 lið · núverandi split",
  "double-14": "14 lið · tvöföld umferð",
};

function signalLabel(signal: string) {
  if (signal === "league") return "Besta";
  if (signal === "fifa") return "FIFA";
  if (signal === "uefa") return "UEFA";
  if (signal === "cup") return "Bikar";
  return "Þröngt";
}

export default function PlaygroundOverview({
  preset,
  onPresetChange,
  weeks,
  selectedTeamName,
  onSelectRound,
  shortfall,
  foundRounds,
  totalRounds,
  rerunCount,
  onRerun,
}: {
  preset: FormatPreset;
  onPresetChange: (preset: FormatPreset) => void;
  weeks: HeatmapWeek[];
  selectedTeamName: string;
  onSelectRound: (round: number) => void;
  shortfall: number;
  foundRounds: number;
  totalRounds: number;
  rerunCount: number;
  onRerun: () => void;
}) {
  const metrics = formatMetrics(preset);

  return (
    <section className={styles.shell}>
      <div className={styles.toolbar}>
        <div>
          <div className="eyebrow">Veldu mót</div>
          <div className={styles.formatTabs}>
            {options.map((option) => (
              <button
                type="button"
                key={option.preset}
                className={`${styles.formatTab} ${preset === option.preset ? styles.formatTabActive : ""}`}
                onClick={() => onPresetChange(option.preset)}
              >
                <span className={styles.teamNumber}>{option.teams}</span>
                <span className={styles.tabText}><b>{option.label}</b><small>{option.tag}</small></span>
              </button>
            ))}
          </div>
        </div>

        <button type="button" className={styles.runButton} onClick={onRerun}>
          <span>↻</span> Keyra aftur
        </button>
      </div>

      <div className={styles.summaryLine}>
        <strong>{presetLabel[preset]}</strong>
        <span>{metrics.gamesPerTeam} leikir / lið</span>
        <span>{metrics.totalGames} alls</span>
        <span>{metrics.homeRange} heima / úti</span>
        <span>{metrics.rounds} gluggar</span>
        <span className={`${styles.fit} ${shortfall > 0 ? styles.fitBad : ""}`}>
          {shortfall > 0 ? `Vantar ${shortfall}` : `${foundRounds}/${totalRounds} fundnir`}
        </span>
      </div>

      <div className={styles.heatmapHead}>
        <div>
          <strong>{selectedTeamName}</strong>
          <span>Vikur tímabilsins · smelltu á deildarviku til að hoppa í umferð</span>
        </div>
        <span className={styles.runCount}>keyrsla {rerunCount}</span>
      </div>

      <div className={styles.heatmap}>
        {weeks.map((week, index) => {
          const clickable = week.roundNumbers.length > 0;
          const classNames = [styles.week];
          for (const signal of week.signals) {
            const key = `signal${signal[0]!.toUpperCase()}${signal.slice(1)}` as keyof typeof styles;
            if (styles[key]) classNames.push(styles[key]);
          }

          return (
            <button
              type="button"
              key={week.id}
              className={classNames.join(" ")}
              title={`${week.label} · ${week.title}`}
              disabled={!clickable}
              onClick={() => clickable && onSelectRound(week.roundNumbers[0]!)}
            >
              <span className={styles.weekNo}>{index + 1}</span>
              <span className={styles.signalDots}>
                {week.signals.filter((signal) => signal !== "tight").map((signal) => (
                  <i key={signal} aria-label={signalLabel(signal)} />
                ))}
              </span>
              {week.signals.includes("tight") && <b>!</b>}
            </button>
          );
        })}
      </div>

      <div className={styles.legend}>
        <span><i className={styles.legendLeague} />Besta</span>
        <span><i className={styles.legendUefa} />UEFA</span>
        <span><i className={styles.legendCup} />Bikar</span>
        <span><i className={styles.legendFifa} />FIFA</span>
        <span><i className={styles.legendTight} />Þröngt</span>
      </div>
    </section>
  );
}
