"use client";

import { useMemo, useState } from "react";

import { calendar2027 } from "@/data/calendar-2027";
import { europePathProfiles } from "@/data/europe-2027";
import { conferenceSpring2027, conferenceSpringSource } from "@/data/europe-spring-2027";
import type { CupDepth } from "@/data/mjolkurbikar-template-2026";
import { expansionTeams, teams2026 } from "@/data/teams-2026";
import { findScheduleRepair, type ScheduleRepairSuggestion } from "@/lib/schedule-repair";
import { buildPairingRounds, buildRoundDates, formatMetrics, teamNameMap } from "@/lib/simulator";
import { fixtureKey, type FixtureDateOverrides } from "@/lib/team-load";
import { applyGrassHomePreference, grassShoulderWarning, kickoffForHomeTeam } from "@/lib/venue-planner";
import type { EuropePath, FormatPreset, Surface, Team } from "@/lib/types";

import GameBoard from "./GameBoard";
import SplitRoundFixtures from "./SplitRoundFixtures";
import styles from "./PlaygroundShell.module.css";

const formatCopy: Record<FormatPreset, string> = {
  "ten-triple": "10 lið · þreföld umferð",
  "ten-split": "10 lið · 5/5 split",
  "current-12-split": "12 lið · 22 + 5 split",
  "double-14": "14 lið · tvöföld umferð",
};

const cupDepthCopy: Record<CupDepth, string> = {
  none: "Ekki í bikar",
  round32: "32-liða",
  round16: "16-liða",
  quarter: "8-liða",
  semi: "Undanúrslit",
  final: "Úrslit",
};

function dateSpan(start: string, end: string) {
  const fmt = new Intl.DateTimeFormat("is-IS", { day: "numeric", month: "short" });
  return `${fmt.format(new Date(`${start}T12:00:00Z`))} – ${fmt.format(new Date(`${end}T12:00:00Z`))}`;
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("is-IS", { day: "numeric", month: "short" }).format(
    new Date(`${value}T12:00:00Z`),
  );
}

function daysApart(a: string, b: string) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.abs(new Date(`${a}T12:00:00Z`).getTime() - new Date(`${b}T12:00:00Z`).getTime()) / oneDay;
}

function inRange(value: string, start: string, end: string) {
  return value >= start && value <= end;
}

export default function Playground() {
  const [preset, setPreset] = useState<FormatPreset>("current-12-split");
  const [seasonStart, setSeasonStart] = useState("2027-04-10");
  const [seasonEnd, setSeasonEnd] = useState("2027-10-23");
  const [avoidFifa, setAvoidFifa] = useState(true);
  const [showUefa, setShowUefa] = useState(true);
  const [preferEvening, setPreferEvening] = useState(false);
  const [protectGrass, setProtectGrass] = useState(false);
  const [springEuropeTeamId, setSpringEuropeTeamId] = useState("none");
  const [loadTeamId, setLoadTeamId] = useState("vikingur");
  const [cupDepthByTeam, setCupDepthByTeam] = useState<Record<string, CupDepth>>({});
  const [fixtureDateOverrides, setFixtureDateOverrides] = useState<FixtureDateOverrides>({});
  const [teams, setTeams] = useState<Team[]>([...teams2026, ...expansionTeams]);
  const [selectedRound, setSelectedRound] = useState(1);
  const [teamsOpen, setTeamsOpen] = useState(false);

  const metrics = useMemo(() => formatMetrics(preset), [preset]);
  const activeTeams = useMemo(() => teams.slice(0, metrics.teams), [teams, metrics.teams]);
  const calendar = useMemo(
    () => buildRoundDates(preset, seasonStart, seasonEnd, calendar2027, avoidFifa),
    [preset, seasonStart, seasonEnd, avoidFifa],
  );
  const rawPairingRounds = useMemo(() => buildPairingRounds(preset, activeTeams), [preset, activeTeams]);
  const venuePlan = useMemo(
    () => applyGrassHomePreference(rawPairingRounds, calendar.rounds, activeTeams, protectGrass),
    [rawPairingRounds, calendar.rounds, activeTeams, protectGrass],
  );
  const pairingRounds = venuePlan.rounds;
  const names = useMemo(() => teamNameMap(activeTeams), [activeTeams]);
  const selectedIndex = Math.max(0, Math.min(selectedRound, Math.max(pairingRounds.length, calendar.rounds.length)) - 1);
  const round = pairingRounds[selectedIndex];
  const roundDate = calendar.rounds[selectedIndex];

  const unknownVenues = activeTeams.filter((team) => team.surface === "unknown" || team.floodlights === null).length;
  const europeTeams = activeTeams.filter((team) => team.europePath !== "none");
  const springEuropeTeam = activeTeams.find((team) => team.id === springEuropeTeamId);
  const loadTeam = activeTeams.find((team) => team.id === loadTeamId) ?? activeTeams[0];
  const loadTeamCupDepth = loadTeam ? (cupDepthByTeam[loadTeam.id] ?? "round32") : "none";
  const qualifyingWindow = calendar2027.find((block) => block.id === "uefa-qualifying-2027");
  const movedInRound = round?.pairings.filter((pair) => Boolean(fixtureDateOverrides[fixtureKey(round.number, pair.home, pair.away)])).length ?? 0;

  const uefaWindow = roundDate
    ? calendar2027.find((block) => block.kind === "uefa" && inRange(roundDate.date, block.start, block.end))
    : undefined;

  const roundEuropeTeams = round?.stage === "split"
    ? europeTeams
    : round?.pairings
      .flatMap((pair) => [pair.home, pair.away])
      .filter((id, index, all) => all.indexOf(id) === index)
      .map((id) => activeTeams.find((team) => team.id === id))
      .filter((team): team is Team => Boolean(team && team.europePath !== "none")) ?? [];

  const springTeamCouldPlay = Boolean(
    springEuropeTeam && round && (round.stage === "split" || round.pairings.some((pair) => pair.home === springEuropeTeam.id || pair.away === springEuropeTeam.id)),
  );

  const nearbySpringEurope = roundDate && springTeamCouldPlay
    ? conferenceSpring2027
      .map((match) => ({ ...match, distance: daysApart(roundDate.date, match.date) }))
      .filter((match) => match.distance <= 3)
      .sort((a, b) => a.distance - b.distance)[0]
    : undefined;

  const repairSuggestion = useMemo(() => {
    if (!loadTeam) return null;
    return findScheduleRepair({
      team: loadTeam,
      teams: activeTeams,
      pairingRounds,
      roundDates: calendar.rounds,
      teamNames: names,
      springEuropeTeamId,
      springEuropeDates: conferenceSpring2027,
      uefaWindow: qualifyingWindow,
      includeUefaScenario: showUefa,
      cupDepthByTeam,
      fixtureDateOverrides,
      calendarBlocks: calendar2027,
      avoidFifaWindows: avoidFifa,
      seasonStart,
      seasonEnd,
    });
  }, [loadTeam, activeTeams, pairingRounds, calendar.rounds, names, springEuropeTeamId, qualifyingWindow, showUefa, cupDepthByTeam, fixtureDateOverrides, avoidFifa, seasonStart, seasonEnd]);

  function updateTeam(id: string, patch: Partial<Team>) {
    setTeams((current) => current.map((team) => (team.id === id ? { ...team, ...patch } : team)));
    setFixtureDateOverrides({});
  }

  function updateCupDepth(id: string, depth: CupDepth) {
    setCupDepthByTeam((current) => ({ ...current, [id]: depth }));
    setFixtureDateOverrides({});
  }

  function choosePreset(next: FormatPreset) {
    const nextMetrics = formatMetrics(next);
    const nextTeams = teams.slice(0, nextMetrics.teams);
    const nextIds = new Set(nextTeams.map((team) => team.id));
    setPreset(next);
    setSelectedRound(1);
    setFixtureDateOverrides({});
    if (springEuropeTeamId !== "none" && !nextIds.has(springEuropeTeamId)) setSpringEuropeTeamId("none");
    if (!nextIds.has(loadTeamId)) setLoadTeamId(nextTeams[0]?.id ?? "");
  }

  function applyRepair(suggestion: ScheduleRepairSuggestion) {
    setFixtureDateOverrides((current) => ({ ...current, [suggestion.fixtureId]: suggestion.proposedDate }));
    setSelectedRound(suggestion.round);
  }

  const maxSelectableRound = Math.max(1, calendar.rounds.length);

  return (
    <main className={styles.page}>
      <div className={styles.hud}>
        <div className={styles.brand}>MÓTAMIÐJA <span>/ BESTA LAB</span></div>
        <div className={styles.hudActions}>
          <details className={styles.rulesMenu}>
            <summary>Reglur</summary>
            <div className={styles.rulesPopover}>
              <button type="button" className={avoidFifa ? styles.ruleOn : ""} onClick={() => { setAvoidFifa((value) => !value); setFixtureDateOverrides({}); }}>FIFA-gluggar {avoidFifa ? "forðaðir" : "leyfðir"}</button>
              <button type="button" className={showUefa ? styles.ruleOn : ""} onClick={() => { setShowUefa((value) => !value); setFixtureDateOverrides({}); }}>UEFA álag {showUefa ? "virkt" : "óvirkt"}</button>
              <button type="button" className={protectGrass ? styles.ruleOn : ""} onClick={() => { setProtectGrass((value) => !value); setFixtureDateOverrides({}); }}>Grasvellir {protectGrass ? "varðir" : "venjulegir"}</button>
              <button type="button" className={preferEvening ? styles.ruleOn : ""} onClick={() => setPreferEvening((value) => !value)}>Kvöldleikir {preferEvening ? "já" : "nei"}</button>
              <label>
                <span>Stress-prófa lið</span>
                <select value={loadTeam?.id ?? ""} onChange={(event) => setLoadTeamId(event.target.value)}>
                  {activeTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </label>
              <label>
                <span>Evrópa frá fyrra ári</span>
                <select value={springEuropeTeamId} onChange={(event) => { setSpringEuropeTeamId(event.target.value); setFixtureDateOverrides({}); }}>
                  <option value="none">Ekkert lið</option>
                  {activeTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </label>
              {loadTeam && (
                <label>
                  <span>Bikarferð {loadTeam.name}</span>
                  <select value={loadTeamCupDepth} onChange={(event) => updateCupDepth(loadTeam.id, event.target.value as CupDepth)}>
                    {(Object.keys(cupDepthCopy) as CupDepth[]).map((depth) => <option key={depth} value={depth}>{cupDepthCopy[depth]}</option>)}
                  </select>
                </label>
              )}
            </div>
          </details>
          <span className={styles.dataBadge}>2027 · FIFA staðfest · UEFA/Bikar sniðmát</span>
        </div>
      </div>

      <div className={styles.gameWrap}>
        <GameBoard
          preset={preset}
          rounds={calendar.rounds}
          selectedRound={selectedRound}
          onSelectRound={setSelectedRound}
          onPresetChange={choosePreset}
          seasonStart={seasonStart}
          seasonEnd={seasonEnd}
          onSeasonStartChange={(value) => { setSeasonStart(value); setFixtureDateOverrides({}); }}
          onSeasonEndChange={(value) => { setSeasonEnd(value); setFixtureDateOverrides({}); }}
          shortfall={calendar.shortfall}
          totalRounds={metrics.rounds}
          calendarBlocks={calendar2027}
          onOpenTeams={() => setTeamsOpen(true)}
          unknownVenues={unknownVenues}
        />

        <section className={styles.roundDeck} aria-label={`Umferð ${selectedRound}`}>
          <div className={styles.roundNav}>
            <button type="button" disabled={selectedRound <= 1} onClick={() => setSelectedRound((value) => Math.max(1, value - 1))}>←</button>
            <div>
              <span>LEIKDAGUR</span>
              <h2>R{selectedRound} <small>{roundDate?.label ?? "kemst ekki fyrir"}</small></h2>
              <p>{formatCopy[preset]}</p>
            </div>
            <button type="button" disabled={selectedRound >= maxSelectableRound} onClick={() => setSelectedRound((value) => Math.min(maxSelectableRound, value + 1))}>→</button>
          </div>

          <div className={styles.roundSignals}>
            {round?.stage === "split" && <span>SPLIT</span>}
            {movedInRound > 0 && <span>{movedInRound} LEIKIR FÆRÐIR</span>}
            {showUefa && uefaWindow && roundEuropeTeams.length > 0 && <span className={styles.signalWarn}>UEFA · {roundEuropeTeams.map((team) => team.name).join(", ")}</span>}
            {nearbySpringEurope && springEuropeTeam && <span className={styles.signalWarn}>UECL · {springEuropeTeam.name} · {shortDate(nearbySpringEurope.date)}</span>}
          </div>

          {repairSuggestion && (
            <div className={styles.gameEvent}>
              <div>
                <b>⚠ {names[repairSuggestion.teamId]} er í veseni</b>
                <span>R{repairSuggestion.round}: {shortDate(repairSuggestion.originalDate)} → {shortDate(repairSuggestion.proposedDate)} gefur betra bil án þess að búa til nýtt vandamál hjá {names[repairSuggestion.opponentId]}.</span>
              </div>
              <div className={styles.eventActions}>
                {selectedRound !== repairSuggestion.round && <button type="button" onClick={() => setSelectedRound(repairSuggestion.round)}>Skoða R{repairSuggestion.round}</button>}
                <button type="button" className={styles.eventPrimary} onClick={() => applyRepair(repairSuggestion)}>Nota þessa færslu</button>
              </div>
            </div>
          )}

          {round?.stage === "split" ? (
            <SplitRoundFixtures preset={preset} roundNumber={round.number} />
          ) : roundDate && round ? (
            <div className={styles.fixtures}>
              {round.pairings.map((pair) => {
                const home = activeTeams.find((team) => team.id === pair.home);
                const away = activeTeams.find((team) => team.id === pair.away);
                const id = fixtureKey(round.number, pair.home, pair.away);
                const movedDate = fixtureDateOverrides[id];
                const effectiveDate = movedDate ?? roundDate.date;
                const kickoff = kickoffForHomeTeam(home, preferEvening ? "evening" : "afternoon");
                const fixtureUefaWindow = calendar2027.find((block) => block.kind === "uefa" && inRange(effectiveDate, block.start, block.end));
                const summerEuropeSensitive = Boolean(showUefa && fixtureUefaWindow && (home?.europePath !== "none" || away?.europePath !== "none"));
                const springEuropeSensitive = Boolean(
                  springEuropeTeam &&
                  (pair.home === springEuropeTeam.id || pair.away === springEuropeTeam.id) &&
                  conferenceSpring2027.some((match) => daysApart(effectiveDate, match.date) <= 3),
                );
                const grassWarning = protectGrass && grassShoulderWarning(home, effectiveDate);
                const warnings: Array<{ label: string; reason: string }> = [];
                if (summerEuropeSensitive) warnings.push({ label: "UEFA", reason: "Leikurinn lendir inni í UEFA-glugga sem byggir á 2026 sniðmáti." });
                if (springEuropeSensitive) warnings.push({ label: "UECL", reason: "Valið lið á staðfestan vorleik í Sambandsdeild innan þriggja daga." });
                if (grassWarning) warnings.push({ label: "GRAS", reason: "Heimavöllurinn er gras og dagsetningin er á viðkvæmu vor- eða hausttímabili." });

                return (
                  <div className={styles.fixture} key={id}>
                    <div className={styles.homeTeam}><b>{names[pair.home]}</b><small>{home?.venue ?? "Völlur óstaðfestur"}</small></div>
                    <div className={styles.kickoff}><b>{kickoff.time}</b><span>{shortDate(effectiveDate)}</span>{movedDate && <em>FÆRÐUR</em>}</div>
                    <div className={styles.awayTeam}><b>{names[pair.away]}</b></div>
                    <div className={styles.fixtureFlags}>
                      {warnings.map((warning) => <span key={warning.label} title={warning.reason}>⚠ {warning.label}</span>)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.noRound}><b>Þessi umferð kemst ekki inn.</b><span>Togaðu lok tímabilsins til hægri eða slakaðu á reglum.</span></div>
          )}
        </section>

        <details className={styles.infoDetails}>
          <summary>ⓘ Hvað er raunverulegt og hvað er sniðmát?</summary>
          <div className={styles.infoBody}>
            <div>
              <h3>Dagatal</h3>
              {calendar2027.filter((block) => block.start >= "2027-03-01" && block.start <= "2027-11-30").map((block) => (
                <div className={styles.sourceRow} key={block.id}>
                  <b>{block.label}</b>
                  <span>{dateSpan(block.start, block.end)} · {block.confidence === "official" ? "staðfest" : "sniðmát"}</span>
                  {block.sourceUrl && <a href={block.sourceUrl} target="_blank" rel="noreferrer">Heimild ↗</a>}
                </div>
              ))}
            </div>
            <div>
              <h3>Lið og álag</h3>
              {springEuropeTeam && <div className={styles.sourceRow}><b>{springEuropeTeam.name} · UECL carryover</b><span>Staðfestir vorleikdagar 2027 úr 2026/27 keppninni.</span><a href={conferenceSpringSource.url} target="_blank" rel="noreferrer">UEFA ↗</a></div>}
              {europeTeams.map((team) => {
                const profile = team.europePath === "none" ? null : europePathProfiles[team.europePath];
                if (!profile) return null;
                return <div className={styles.sourceRow} key={team.id}><b>{team.name}</b><span>{profile.label} · 2026 UEFA-slot færð á sambærilega vikudaga 2027.</span></div>;
              })}
              <div className={styles.sourceRow}><b>Hvíld</b><span>Hermirinn heldur minnst tveimur heilum hvíldardögum milli heilla umferða þegar tímabil er þjappað.</span></div>
            </div>
          </div>
        </details>
      </div>

      <footer className={styles.footer}>Tilraunaverkefni · ekki opinber leikjaskrá KSÍ · færðir leikir: {Object.keys(fixtureDateOverrides).length}</footer>

      {teamsOpen && (
        <div className={styles.drawerBackdrop} role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setTeamsOpen(false); }}>
          <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label="Lið og vellir">
            <div className={styles.drawerHead}>
              <div><span>LEIKREGLUR</span><h2>Lið og vellir</h2><p>Breytingar hér fara beint inn í herminn.</p></div>
              <button type="button" className={styles.closeButton} aria-label="Loka" onClick={() => setTeamsOpen(false)}>×</button>
            </div>
            <div className={styles.teamCards}>
              {activeTeams.map((team) => (
                <div className={`${styles.teamCard} ${loadTeamId === team.id ? styles.teamFocused : ""}`} key={team.id}>
                  <div className={styles.teamCardHead}><div><strong>{team.name}</strong><span>{team.venue}</span></div><button type="button" onClick={() => setLoadTeamId(team.id)}>{loadTeamId === team.id ? "Stress-próf ✓" : "Stress-prófa"}</button></div>
                  <div className={styles.teamFields}>
                    <label><span>Undirlag</span><select value={team.surface} onChange={(event) => updateTeam(team.id, { surface: event.target.value as Surface })}><option value="unknown">Óstaðfest</option><option value="grass">Gras</option><option value="artificial">Gervigras</option></select></label>
                    <label><span>Flóðljós</span><select value={team.floodlights === null ? "unknown" : team.floodlights ? "yes" : "no"} onChange={(event) => updateTeam(team.id, { floodlights: event.target.value === "unknown" ? null : event.target.value === "yes" })}><option value="unknown">Óstaðfest</option><option value="yes">Já</option><option value="no">Nei</option></select></label>
                    <label><span>Evrópuleið</span><select value={team.europePath} onChange={(event) => updateTeam(team.id, { europePath: event.target.value as EuropePath })}><option value="none">Engin</option><option value="champions">Meistaraleið</option><option value="conference">Sambandsdeild</option></select></label>
                    <label><span>Bikarferð</span><select value={cupDepthByTeam[team.id] ?? "round32"} onChange={(event) => updateCupDepth(team.id, event.target.value as CupDepth)}>{(Object.keys(cupDepthCopy) as CupDepth[]).map((depth) => <option key={depth} value={depth}>{cupDepthCopy[depth]}</option>)}</select></label>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
