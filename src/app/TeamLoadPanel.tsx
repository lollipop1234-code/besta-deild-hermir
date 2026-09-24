import type { CupDepth } from "@/data/mjolkurbikar-template-2026";
import type { ScheduleRepairSuggestion } from "@/lib/schedule-repair";
import type { TeamLoadSummary } from "@/lib/team-load";
import type { Team } from "@/lib/types";

import styles from "./TeamLoadPanel.module.css";

function shortDate(value: string) {
  return new Intl.DateTimeFormat("is-IS", { day: "numeric", month: "short", weekday: "short" }).format(
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
  cupDepth,
  onCupDepthChange,
  summary,
  splitIsUnresolved,
  repairSuggestion,
  onApplyRepair,
  appliedRepairCount,
  onResetRepairs,
}: {
  teams: Team[];
  selectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
  cupDepth: CupDepth;
  onCupDepthChange: (depth: CupDepth) => void;
  summary: TeamLoadSummary;
  splitIsUnresolved: boolean;
  repairSuggestion: ScheduleRepairSuggestion | null;
  onApplyRepair: (suggestion: ScheduleRepairSuggestion) => void;
  appliedRepairCount: number;
  onResetRepairs: () => void;
}) {
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? teams[0];
  const opponent = repairSuggestion
    ? teams.find((team) => team.id === repairSuggestion.opponentId)
    : undefined;
  const hasRisk = summary.belowMinimumCount + summary.scenarioRiskCount > 0;

  return (
    <div className={`panel ${styles.panel}`}>
      <div className={styles.head}>
        <div>
          <div className="eyebrow">Álag á lið</div>
          <h2>{selectedTeam?.name ?? "Veldu lið"}</h2>
        </div>
        <div className={styles.headControls}>
          <label>
            <span>Lið</span>
            <select
              className={styles.select}
              value={selectedTeam?.id ?? ""}
              onChange={(event) => onSelectTeam(event.target.value)}
              aria-label="Veldu lið til að skoða álag"
            >
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </label>
          <label>
            <span>Bikarferð</span>
            <select
              className={styles.select}
              value={cupDepth}
              onChange={(event) => onCupDepthChange(event.target.value as CupDepth)}
              aria-label="Veldu hversu langt liðið fer í Mjólkurbikar"
            >
              <option value="none">Ekki með</option>
              <option value="round32">32-liða</option>
              <option value="round16">16-liða</option>
              <option value="quarter">8-liða</option>
              <option value="semi">Undanúrslit</option>
              <option value="final">Úrslit</option>
            </select>
          </label>
        </div>
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

      <div className={`${styles.repair} ${repairSuggestion?.basis === "scenario" ? styles.repairScenario : ""}`}>
        <div className={styles.repairCopy}>
          <div className={styles.repairLabel}>
            Laga dagskrá · {repairSuggestion?.basis === "scenario" ? "sviðsmynd" : "staðfestir leikdagar"}
          </div>
          {repairSuggestion ? (
            <>
              <strong>Færa umferð {repairSuggestion.round} um {Math.abs(repairSuggestion.shiftDays)} dag{Math.abs(repairSuggestion.shiftDays) === 1 ? "" : "a"}?</strong>
              <p>
                {shortDate(repairSuggestion.originalDate)} → {shortDate(repairSuggestion.proposedDate)} · gegn {opponent?.name ?? repairSuggestion.opponentId}.
                Hvíldarvandamálið hjá {selectedTeam?.name} minnkar án þess að búa til nýtt álagsvandamál hjá mótherjanum.
              </p>
              <div className={styles.repairNumbers}>
                <span>{repairSuggestion.beforeSelected.belowMinimumCount + repairSuggestion.beforeSelected.scenarioRiskCount} → {repairSuggestion.afterSelected.belowMinimumCount + repairSuggestion.afterSelected.scenarioRiskCount} þröng bil</span>
                <span>{repairSuggestion.beforeSelected.threeInEightCount} → {repairSuggestion.afterSelected.threeInEightCount} × 3 leikir / 8 dagar</span>
              </div>
            </>
          ) : hasRisk ? (
            <>
              <strong>Engin einföld örugg færsla fannst.</strong>
              <p>Vélin prófaði næstu daga en fann ekki færslu sem lagar valda liðið án þess að auka álag hjá mótherjanum eða fara inn í lokaðan glugga.</p>
            </>
          ) : (
            <>
              <strong>Engin bein hvíldarvilla til að laga.</strong>
              <p>Prófaðu Evrópuleið eða lengri bikarferð og sjáðu hvort 2026 sniðmátið þrengi að dagskránni.</p>
            </>
          )}
        </div>
        <div className={styles.repairActions}>
          {repairSuggestion && (
            <button type="button" className={styles.primaryButton} onClick={() => onApplyRepair(repairSuggestion)}>
              Nota tillögu
            </button>
          )}
          {appliedRepairCount > 0 && (
            <button type="button" className={styles.secondaryButton} onClick={onResetRepairs}>
              Endurstilla færslur ({appliedRepairCount})
            </button>
          )}
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
                : event.kind === "cup-scenario"
                  ? styles.eventCup
                  : "";
            const badgeClass = event.kind === "uefa-scenario"
              ? styles.badgeScenario
              : event.kind === "uefa-official"
                ? styles.badgeUefa
                : event.kind === "cup-scenario"
                  ? styles.badgeCup
                  : "";
            const badge = event.kind === "besta"
              ? "Besta"
              : event.kind === "uefa-official"
                ? "UEFA"
                : event.kind === "cup-scenario"
                  ? "Bikar ?"
                  : "UEFA ?";

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
                    <span className={`${styles.badge} ${badgeClass}`}>{badge}</span>
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
        <span>Gul UEFA- og bikarspjöld eru 2026 sniðmát færð yfir á 2027, ekki staðfest 2027 dagatal.</span>
      </div>
    </div>
  );
}
