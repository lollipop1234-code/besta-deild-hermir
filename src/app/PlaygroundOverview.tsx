import { formatMetrics } from "@/lib/simulator";
import type { HeatmapWeek } from "@/lib/playground-heatmap";
import type { FormatPreset } from "@/lib/types";

import styles from "./PlaygroundOverview.module.css";

type FormatCard = {
  teamCount: 10 | 12 | 14;
  title: string;
  presets: FormatPreset[];
};

const cards: FormatCard[] = [
  { teamCount: 10, title: "10 lið", presets: ["ten-triple", "ten-split"] },
  { teamCount: 12, title: "12 lið", presets: ["current-12-split"] },
  { teamCount: 14, title: "14 lið", presets: ["double-14"] },
];

const presetLabel: Record<FormatPreset, string> = {
  "ten-triple": "Þreföld umferð",
  "ten-split": "5/5 split",
  "current-12-split": "Núverandi split",
  "double-14": "Tvöföld umferð",
};

function primaryPreset(card: FormatCard, selected: FormatPreset) {
  return card.presets.includes(selected) ? selected : card.presets[0]!;
}

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
  return (
    <section className={styles.shell}>
      <div className={styles.topline}>
        <div>
          <div className="eyebrow">Fixture playground</div>
          <h2>Hvernig á deildin að líta út?</h2>
          <p>Veldu 10, 12 eða 14 lið. Svo sérðu strax hvernig tímabilið fyllist.</p>
        </div>
        <button type="button" className={styles.runButton} onClick={onRerun}>
          <span>{rerunCount === 0 ? "▶" : "↻"}</span>
          {rerunCount === 0 ? "Keyra mótið" : "Keyra aftur"}
        </button>
      </div>

      <div className={styles.formatGrid}>
        {cards.map((card) => {
          const cardPreset = primaryPreset(card, preset);
          const cardMetrics = formatMetrics(cardPreset);
          const active = card.presets.includes(preset);

          return (
            <div className={`${styles.formatCard} ${active ? styles.formatCardActive : ""}`} key={card.teamCount}>
              <button type="button" className={styles.formatMain} onClick={() => onPresetChange(cardPreset)}>
                <span className={styles.teamCount}>{card.teamCount}</span>
                <span className={styles.teamWord}>lið</span>
                <strong>{presetLabel[cardPreset]}</strong>
                <small>{cardMetrics.gamesPerTeam} leikir á lið · {cardMetrics.homeRange} heima/úti</small>
              </button>

              {card.presets.length > 1 && (
                <div className={styles.variantRow}>
                  {card.presets.map((option) => (
                    <button
                      type="button"
                      key={option}
                      className={preset === option ? styles.variantActive : ""}
                      onClick={() => onPresetChange(option)}
                    >
                      {presetLabel[option]}
                    </button>
                  ))}
                </div>
              )}

              <div className={styles.cardFacts}>
                <span><b>{cardMetrics.totalGames}</b> leikir alls</span>
                <span><b>{cardMetrics.rounds}</b> leikdagagluggar</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.heatmapHead}>
        <div>
          <strong>Tímabilið hjá {selectedTeamName}</strong>
          <span>Smelltu á viku til að hoppa í umferð.</span>
        </div>
        <div className={`${styles.fit} ${shortfall > 0 ? styles.fitBad : ""}`}>
          {shortfall > 0 ? `Vantar ${shortfall} leikdaga` : `${foundRounds}/${totalRounds} leikdagar fundust`}
        </div>
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
        <span><i className={styles.legendTight} />Þröng vika</span>
      </div>
    </section>
  );
}
