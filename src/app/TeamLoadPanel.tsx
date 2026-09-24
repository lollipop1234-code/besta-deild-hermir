import type { Team } from "@/lib/types";
import type { TeamLoadSummary } from "@/lib/team-load";

import styles from "./TeamLoadPanel.module.css";

function shortDate(value: string) {
  return new Intl.DateTimeFormat("is-IS", { day: "numeric", month: "short" }).format(
    new Date(`${value}T12:00:00Z`),
  );
}

function restLabel(days: number) {
  if (days === 1) return "1 heill dagur";
  return `${days} heilir dagar`;
}

export default function TeamLoadPanel({
  teams,
  selectedTeamId,
  onSelectTeam,
  summary,
  splitIsUnresolved,
}: {
  teams: Team[];
  selectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
  summary: TeamLoadSummary;
  splitIsUnresolved: boolean;
}) {
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? teams[0];

  return (
    <div className={`panel ${styles.panel}`}>
      <div className={styles.head}>
        <div>
          <div className="eyebrow">Álag á lið</div>
          <h2>{selectedTeam?.name ?? "Veldu lið"}</h2>
        </div>
        <select
          className={styles.select}
          value={selectedTeam?.id ?? ""}
          onChange={(event) => onSelectTeam(event.target.value)}
          aria-label="Veldu lið til að skoða álag"
        >
          {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
        </select>
      </div>

      <div className={styles.summary}>
        <div className={`${styles.metric} ${summary.belowMinimumCount > 0 ? styles.metricBad : ""}`}>
          <strong>{summary.shortestFullRestDays ?? "–"}</strong>
          <span>styst hvíld · heilir dagar milli leikja</span>
        </div>
        <div className={`${styles.metric} ${summary.scenarioRiskCount > 0 ? styles.metricWarn : ""}`}>
          <strong>{summary.belowMinimumCount + summary.scenarioRiskCount}</strong>
          <span>bil undir 2 heilum dögum · {summary.scenarioRiskCount} aðeins í sviðsmynd</span>
        </div>
        <div className={`${styles.metric} ${summary.threeInEightCount > 0 ? styles.metricWarn : ""}`}>
          <strong>{summary.threeInEightCount}</strong>
          <span>röð með 3 leikjum innan 8 daga</span>
        </div>
      </div>

      {summary.events.length === 0 ? (
        <p className={styles.empty}>Engir staðsettir leikir fundust fyrir þetta lið í valda glugganum.</p>
      ) : (
        <div className={styles.strip} aria-label={`Leikjaálag ${selectedTeam?.name ?? "liðs"}`}>
          {summary.events.map((event, index) => {
            const gap = index > 0 ? summary.gaps[index - 1] : undefined;
            const eventClass = event.kind === "uefa-scenario"
              ? styles.eventScenario
              : event.kind === "uefa-official"
                ? styles.eventOfficial
                : "";
            const badgeClass = event.kind === "uefa-scenario"
              ? styles.badgeScenario
              : event.kind === "uefa-official"
                ? styles.badgeUefa
                : "";

            return (
              <div className={styles.eventWrap} key={event.id}>
                {gap && (
                  <div className={`${styles.gap} ${gap.belowKsiMinimum ? styles.gapBad : gap.scenarioOnly ? styles.gapScenario : ""}`}>
                    {restLabel(gap.fullRestDays)}
                    {gap.belowKsiMinimum ? <><br />undir viðmiði</> : gap.scenarioOnly ? <><br />sviðsmynd</> : null}
                  </div>
                )}
                <div className={`${styles.event} ${eventClass}`}>
                  <div className={styles.eventTop}>
                    <span className={styles.date}>{shortDate(event.date)}</span>
                    <span className={`${styles.badge} ${badgeClass}`}>
                      {event.kind === "besta" ? "Besta" : event.kind === "uefa-official" ? "UEFA" : "UEFA ?"}
                    </span>
                  </div>
                  <strong>{event.label}</strong>
                  <p>{event.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.notes}>
        <span><b>KSÍ 15.5:</b> gildandi 2026-regla gerir almennt ráð fyrir minnst 2 heilum dögum milli kappleikja; mótanefnd getur stytt ef nauðsyn krefur.</span>
        <a href="https://www.ksi.is/api/download/media/ec1f1lv1/reglugerd-ksi-um-knattspyrnumo-t-janu-ar-2026.pdf#page=8" target="_blank" rel="noreferrer">Sjá reglugerð ↗</a>
        {splitIsUnresolved && <span>Split-leikir eru ekki taldir hér fyrr en mótherjar/bye liggja fyrir.</span>}
        <span>Gul UEFA-spjöld eru álagssviðsmyndir fyrir 2027/28, ekki staðfestir leikdagar.</span>
      </div>
    </div>
  );
}
