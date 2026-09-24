import { useEffect, useState } from "react";

import type { CupDepth } from "@/data/mjolkurbikar-template-2026";
import type { ScheduleRepairSuggestion } from "@/lib/schedule-repair";
import type { TeamLoadSummary } from "@/lib/team-load";
import type { Team } from "@/lib/types";

import styles from "./TeamLoadPanel.module.css";

function shortDate(value: string) {
  return new Intl.DateTimeFormat("is-IS", { day: "numeric", month: "short" }).format(
    new Date(`${value}T12:00:00Z`),
  );
}

function dayDate(value: string) {
  return new Intl.DateTimeFormat("is-IS", { weekday: "short", day: "numeric" })
    .format(new Date(`${value}T12:00:00Z`))
    .replace(".", "");
}

function riskCount(summary: TeamLoadSummary) {
  return summary.belowMinimumCount + summary.scenarioRiskCount;
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
  const [previewRepair, setPreviewRepair] = useState(false);
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? teams[0];
  const opponent = repairSuggestion ? teams.find((team) => team.id === repairSuggestion.opponentId) : undefined;
  const hasRisk = riskCount(summary) > 0 || summary.threeInEightCount > 0;

  useEffect(() => setPreviewRepair(false), [selectedTeamId, repairSuggestion?.fixtureId, appliedRepairCount]);

  return (
    <section className={styles.shell} aria-label="Álag og lagfæring dagskrár">
      <div className={styles.topRow}>
        <div>
          <div className={styles.kicker}>Laga dagskrá</div>
          <h2>{selectedTeam?.name ?? "Veldu lið"}</h2>
          <p>Skoðaðu eitt lið í einu. Hermirinn leggur aðeins til færslu sem býr ekki til nýtt vandamál hjá mótherjanum.</p>
        </div>
        <div className={styles.selectors}>
          <label>
            <span>Lið</span>
            <select value={selectedTeam?.id ?? ""} onChange={(event) => onSelectTeam(event.target.value)}>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </label>
          <label>
            <span>Bikarferð</span>
            <select value={cupDepth} onChange={(event) => onCupDepthChange(event.target.value as CupDepth)}>
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

      <div className={`${styles.problemCard} ${hasRisk ? styles.problemActive : styles.problemClear}`}>
        <div className={styles.problemCopy}>
          {repairSuggestion ? (
            <>
              <strong>⚠ {selectedTeam?.name} er í veseni</strong>
              <span>
                {repairSuggestion.basis === "scenario" ? "Sniðmátsálag" : "Leikjadagsálag"} í kringum umferð {repairSuggestion.round}.
                {summary.shortestFullRestDays !== null ? ` Stysta hvíld er ${summary.shortestFullRestDays} heilir dagar.` : ""}
              </span>
            </>
          ) : hasRisk ? (
            <>
              <strong>⚠ Þétt dagskrá, en engin einföld örugg færsla fannst</strong>
              <span>Prófaðu annað lið, styttri bikarferð eða breyttan tímabilsglugga.</span>
            </>
          ) : (
            <>
              <strong>✓ Engin bein hvíldarvilla hjá {selectedTeam?.name}</strong>
              <span>Prófaðu Evrópuleið eða lengri bikarferð til að stress-prófa dagskrána.</span>
            </>
          )}
        </div>

        {repairSuggestion && !previewRepair && (
          <button type="button" className={styles.tryButton} onClick={() => setPreviewRepair(true)}>Prófa annan leikdag</button>
        )}
      </div>

      {repairSuggestion && previewRepair && (
        <div className={styles.repairPreview}>
          <div className={styles.moveLine}>
            <span>{dayDate(repairSuggestion.originalDate)}</span>
            <b>→</b>
            <span>{dayDate(repairSuggestion.proposedDate)}</span>
            <small>gegn {opponent?.name ?? repairSuggestion.opponentId}</small>
          </div>
          <div className={styles.gains}>
            <span>✓ {riskCount(repairSuggestion.beforeSelected) > riskCount(repairSuggestion.afterSelected) ? "færri þröng bil hjá valda liðinu" : "álagið minnkar"}</span>
            <span>✓ enginn nýr árekstur hjá {opponent?.name ?? "mótherjanum"}</span>
            <span>✓ helst utan lokaðra glugga</span>
          </div>
          <div className={styles.previewActions}>
            <button type="button" className={styles.primaryButton} onClick={() => { onApplyRepair(repairSuggestion); setPreviewRepair(false); }}>Nota þetta</button>
            <button type="button" className={styles.textButton} onClick={() => setPreviewRepair(false)}>Hætta við</button>
          </div>
          <small className={styles.basisNote}>
            {repairSuggestion.basis === "scenario"
              ? "Þessi tillaga byggir á hermisniðmáti, ekki staðfestu 2027 UEFA/Mjólkurbikardagatali."
              : `Færsla ${shortDate(repairSuggestion.originalDate)} → ${shortDate(repairSuggestion.proposedDate)}.`}
          </small>
        </div>
      )}

      <div className={styles.eventLine}>
        {summary.events.map((event) => (
          <span key={event.id} className={`${styles.event} ${styles[event.kind.replace("-", "") as keyof typeof styles] ?? ""}`} title={event.detail}>
            <b>{shortDate(event.date)}</b>
            <small>{event.kind === "besta" ? "Besta" : event.kind === "cup-scenario" ? "Bikar ?" : event.kind === "uefa-official" ? "UEFA" : "UEFA ?"}</small>
          </span>
        ))}
      </div>

      <div className={styles.footerLine}>
        <span>{splitIsUnresolved ? "Split-mótherjar eru ekki reiknaðir fyrr en staða liggur fyrir." : "Hvíld er reiknuð milli staðsettra leikja."}</span>
        {appliedRepairCount > 0 && <button type="button" onClick={onResetRepairs}>Endurstilla færslur ({appliedRepairCount})</button>}
      </div>
    </section>
  );
}
