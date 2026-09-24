"use client";

import { useMemo, useState } from "react";

import { calendar2027 } from "@/data/calendar-2027";
import { europePathProfiles } from "@/data/europe-2027";
import { conferenceSpring2027, conferenceSpringSource } from "@/data/europe-spring-2027";
import type { CupDepth } from "@/data/mjolkurbikar-template-2026";
import { expansionTeams, teams2026 } from "@/data/teams-2026";
import { findScheduleRepair, type ScheduleRepairSuggestion } from "@/lib/schedule-repair";
import { buildPairingRounds, buildRoundDates, formatMetrics, teamNameMap } from "@/lib/simulator";
import {
  buildTeamLoadEvents,
  fixtureKey,
  summarizeTeamLoad,
  visibleTeamLoadEvents,
  type FixtureDateOverrides,
} from "@/lib/team-load";
import { applyGrassHomePreference, grassShoulderWarning, kickoffForHomeTeam } from "@/lib/venue-planner";
import type { EuropePath, FormatPreset, Surface, Team } from "@/lib/types";

import PlaygroundOverview from "./PlaygroundOverview";
import SplitRoundFixtures from "./SplitRoundFixtures";
import TeamLoadPanel from "./TeamLoadPanel";
import styles from "./PlaygroundShell.module.css";

const formatCopy: Record<FormatPreset, string> = {
  "ten-triple": "10 lið · þreföld umferð",
  "ten-split": "10 lið · 5/5 split",
  "current-12-split": "12 lið · 22 + 5 split",
  "double-14": "14 lið · tvöföld umferð",
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
  const [rerunCount, setRerunCount] = useState(1);

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
  const championsTeams = activeTeams.filter((team) => team.europePath === "champions");
  const conferenceTeams = activeTeams.filter((team) => team.europePath === "conference");
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

  const loadEvents = useMemo(() => {
    if (!loadTeam) return [];
    return buildTeamLoadEvents({
      team: loadTeam,
      pairingRounds,
      roundDates: calendar.rounds,
      teamNames: names,
      springEuropeTeamId,
      springEuropeDates: conferenceSpring2027,
      uefaWindow: qualifyingWindow,
      includeUefaScenario: showUefa,
      cupDepth: loadTeamCupDepth,
      fixtureDateOverrides,
    });
  }, [loadTeam, pairingRounds, calendar.rounds, names, springEuropeTeamId, qualifyingWindow, showUefa, loadTeamCupDepth, fixtureDateOverrides]);

  const visibleLoadEvents = useMemo(
    () => visibleTeamLoadEvents(loadEvents, seasonStart, seasonEnd),
    [loadEvents, seasonStart, seasonEnd],
  );
  const loadSummary = useMemo(() => summarizeTeamLoad(visibleLoadEvents), [visibleLoadEvents]);
  const splitIsUnresolved = pairingRounds.some((item) => item.stage === "split" && item.pairings.length === 0);

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

  function rerun() {
    setFixtureDateOverrides({});
    setSelectedRound(1);
    setRerunCount((count) => count + 1);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <div className={styles.eyebrow}>Mótamiðja · 2027 prufuplan</div>
          <h1>Besta deild hermir</h1>
          <p>Settu upp mótið, smelltu á umferð og sjáðu hvar dagatalið brotnar.</p>
        </div>
      </header>

      <div className={styles.notice}>
        <b>2027:</b>
        <span>FIFA-gluggar eru staðfestir. UEFA og Mjólkurbikar eru 2026 sniðmát þar til 2027 dagsetningar liggja fyrir.</span>
      </div>

      <section className={styles.shell}>
        <div className={styles.settingsBar} aria-label="Hermisstillingar">
          <label className={styles.settingGroup}>
            <span>Tímabil</span>
            <input type="date" value={seasonStart} onChange={(event) => { setSeasonStart(event.target.value); setFixtureDateOverrides({}); }} />
            <span>→</span>
            <input type="date" value={seasonEnd} onChange={(event) => { setSeasonEnd(event.target.value); setFixtureDateOverrides({}); }} />
          </label>
          <button type="button" className={`${styles.settingButton} ${avoidFifa ? styles.settingButtonOn : ""}`} onClick={() => { setAvoidFifa((value) => !value); setFixtureDateOverrides({}); }}>FIFA {avoidFifa ? "✓" : ""}</button>
          <button type="button" className={`${styles.settingButton} ${preferEvening ? styles.settingButtonOn : ""}`} onClick={() => setPreferEvening((value) => !value)}>Kvöld {preferEvening ? "✓" : ""}</button>
          <button type="button" className={`${styles.settingButton} ${showUefa ? styles.settingButtonOn : ""}`} onClick={() => { setShowUefa((value) => !value); setFixtureDateOverrides({}); }}>UEFA {showUefa ? "✓" : ""}</button>
          <button type="button" className={`${styles.settingButton} ${protectGrass ? styles.settingButtonOn : ""}`} onClick={() => { setProtectGrass((value) => !value); setFixtureDateOverrides({}); }}>Hlífa grasi {protectGrass ? "✓" : ""}</button>

          <details className={styles.moreSettings}>
            <summary>Fleira</summary>
            <div className={styles.morePopover}>
              <label>
                <span>Evrópa frá fyrra ári</span>
                <select value={springEuropeTeamId} onChange={(event) => { setSpringEuropeTeamId(event.target.value); setFixtureDateOverrides({}); }}>
                  <option value="none">Ekkert lið</option>
                  {activeTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </label>
              <p>Ef lið er enn í Sambandsdeild 2026/27 koma staðfestir vorleikdagar 2027 inn í álagsreikninginn.</p>
            </div>
          </details>

          <button type="button" className={styles.teamButton} onClick={() => setTeamsOpen(true)}>Lið og vellir {unknownVenues > 0 ? `(${unknownVenues} ?)` : ""}</button>
        </div>

        <PlaygroundOverview
          preset={preset}
          onPresetChange={choosePreset}
          rounds={calendar.rounds}
          selectedRound={selectedRound}
          onSelectRound={setSelectedRound}
          calendarBlocks={calendar2027}
          teamEvents={visibleLoadEvents}
          seasonStart={seasonStart}
          seasonEnd={seasonEnd}
          shortfall={calendar.shortfall}
          foundRounds={calendar.rounds.length}
          totalRounds={metrics.rounds}
          rerunCount={rerunCount}
          onRerun={rerun}
        />

        <section className={styles.roundSection} aria-label={`Umferð ${selectedRound}`}>
          <div className={styles.roundHeader}>
            <div>
              <div className={styles.eyebrow}>Valin umferð</div>
              <h2>R{selectedRound} <span>{roundDate?.label ?? "enginn leikdagur"}</span></h2>
              <p>{formatCopy[preset]}</p>
            </div>
            <select className={styles.roundSelect} value={selectedRound} onChange={(event) => setSelectedRound(Number(event.target.value))}>
              {Array.from({ length: metrics.rounds }, (_, index) => index + 1).map((number) => <option key={number} value={number}>Umferð {number}</option>)}
            </select>
          </div>

          <div className={styles.roundMeta}>
            {round?.stage === "split" && <span className={styles.tag}>split</span>}
            {movedInRound > 0 && <span className={styles.tag}>{movedInRound} færðir</span>}
            {showUefa && uefaWindow && roundEuropeTeams.length > 0 && <span className={`${styles.tag} ${styles.warningTag}`}>UEFA-sniðmát · {roundEuropeTeams.map((team) => team.name).join(", ")}</span>}
            {nearbySpringEurope && springEuropeTeam && <span className={`${styles.tag} ${styles.warningTag}`}>UECL staðfest · {springEuropeTeam.name} · {shortDate(nearbySpringEurope.date)}</span>}
          </div>

          {round?.stage === "split" ? (
            <SplitRoundFixtures preset={preset} roundNumber={round.number} />
          ) : (
            <div className={styles.fixtures}>
              {round?.pairings.map((pair) => {
                const home = activeTeams.find((team) => team.id === pair.home);
                const away = activeTeams.find((team) => team.id === pair.away);
                const id = fixtureKey(round.number, pair.home, pair.away);
                const movedDate = fixtureDateOverrides[id];
                const effectiveDate = movedDate ?? roundDate?.date;
                const kickoff = kickoffForHomeTeam(home, preferEvening ? "evening" : "afternoon");
                const fixtureUefaWindow = effectiveDate ? calendar2027.find((block) => block.kind === "uefa" && inRange(effectiveDate, block.start, block.end)) : undefined;
                const summerEuropeSensitive = Boolean(showUefa && fixtureUefaWindow && (home?.europePath !== "none" || away?.europePath !== "none"));
                const springEuropeSensitive = Boolean(
                  effectiveDate && springEuropeTeam &&
                  (pair.home === springEuropeTeam.id || pair.away === springEuropeTeam.id) &&
                  conferenceSpring2027.some((match) => daysApart(effectiveDate, match.date) <= 3),
                );
                const grassWarning = protectGrass && grassShoulderWarning(home, effectiveDate);
                const warnings: Array<{ label: string; reason: string }> = [];
                if (summerEuropeSensitive) warnings.push({ label: "⚠ UEFA álag", reason: "Leikurinn lendir inni í UEFA-glugga sem er byggður á 2026 sniðmáti. Evrópulið getur því átt leik mjög nálægt þessum degi." });
                if (springEuropeSensitive) warnings.push({ label: "⚠ UECL álag", reason: "Valið lið á staðfestan Sambandsdeildarleik 2026/27 innan þriggja daga frá þessum leikdegi." });
                if (grassWarning) warnings.push({ label: "⚠ Gras", reason: "Heimavöllurinn er gras og þessi leikdagur liggur á viðkvæmu vor- eða hausttímabili samkvæmt hermisstillingunni." });

                return (
                  <div className={styles.fixtureRow} key={id}>
                    <div className={styles.teamHome}>
                      <strong>{names[pair.home]}</strong>
                      <div className={styles.venue}>{home?.venue ?? "Völlur óstaðfestur"}</div>
                    </div>
                    <div className={styles.fixtureCenter} title={kickoff.note}>
                      <b>{kickoff.time}</b>
                      <span>{effectiveDate ? shortDate(effectiveDate) : "–"}</span>
                      {movedDate && <span className={styles.moved}>færður</span>}
                    </div>
                    <div className={styles.teamAway}><strong>{names[pair.away]}</strong></div>
                    {warnings.length > 0 ? (
                      <details className={styles.fixtureWarning}>
                        <summary>{warnings[0]!.label}{warnings.length > 1 ? ` +${warnings.length - 1}` : ""}</summary>
                        <div className={styles.warningReason}>{warnings.map((warning) => <div key={warning.label}><b>{warning.label}</b><br />{warning.reason}</div>)}</div>
                      </details>
                    ) : <span className={styles.noWarning} />}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className={styles.repairSection}>
          <TeamLoadPanel
            teams={activeTeams}
            selectedTeamId={loadTeam?.id ?? ""}
            onSelectTeam={setLoadTeamId}
            cupDepth={loadTeamCupDepth}
            onCupDepthChange={(depth) => loadTeam && updateCupDepth(loadTeam.id, depth)}
            summary={loadSummary}
            splitIsUnresolved={splitIsUnresolved}
            repairSuggestion={repairSuggestion}
            onApplyRepair={applyRepair}
            appliedRepairCount={Object.keys(fixtureDateOverrides).length}
            onResetRepairs={() => setFixtureDateOverrides({})}
          />
        </div>

        <details className={styles.infoDetails}>
          <summary>ⓘ Hvernig reiknar hermirinn þetta?</summary>
          <div className={styles.infoBody}>
            <div>
              <h3>Dagatal og heimildir</h3>
              {calendar2027.filter((block) => block.start >= "2027-04-01" && block.start <= "2027-10-31").map((block) => (
                <div className={styles.sourceRow} key={block.id}>
                  <b>{block.label}</b>
                  <span>{dateSpan(block.start, block.end)} · {block.confidence === "official" ? "staðfest" : "sniðmát"} · {block.constraint === "blackout" ? "harð regla" : block.constraint === "avoid" ? "forðast" : "upplýsingalag"}</span>
                  {block.sourceUrl && <a href={block.sourceUrl} target="_blank" rel="noreferrer">Heimild ↗</a>}
                </div>
              ))}
            </div>
            <div>
              <h3>Liðsbundnar forsendur</h3>
              {springEuropeTeam && <div className={styles.sourceRow}><b>{springEuropeTeam.name} · UECL carryover</b><span>Staðfestir vorleikdagar 2027 úr keppninni 2026/27.</span><a href={conferenceSpringSource.url} target="_blank" rel="noreferrer">UEFA ↗</a></div>}
              {europeTeams.map((team) => {
                const profile = team.europePath === "none" ? null : europePathProfiles[team.europePath];
                if (!profile) return null;
                return <div className={styles.sourceRow} key={team.id}><b>{team.name}</b><span>{profile.label} · UEFA 2026 leikslot færð á sambærilega vikudaga 2027.</span></div>;
              })}
              <div className={styles.sourceRow}><b>Mótareglur</b><span>Hvíldardagar og 3 leikir á 8 dögum eru metin í liðsbundnu álagi. Split-leikir eru sýndir sem sætispláss þar til endanleg lið liggja fyrir.</span></div>
            </div>
          </div>
        </details>
      </section>

      <footer className={styles.footer}>
        <span>Tilraunaverkefni · ekki opinber leikjaskrá KSÍ</span>
        <span>{championsTeams.length} meistaraleið · {conferenceTeams.length} Sambandsdeild · færðir leikir: {Object.keys(fixtureDateOverrides).length}</span>
      </footer>

      {teamsOpen && (
        <div className={styles.drawerBackdrop} role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setTeamsOpen(false); }}>
          <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label="Lið og vellir">
            <div className={styles.drawerHead}>
              <div><h2>Lið og vellir</h2><p>{activeTeams.length} lið · breytingar endurreikna herminn</p></div>
              <button type="button" className={styles.closeButton} aria-label="Loka" onClick={() => setTeamsOpen(false)}>×</button>
            </div>
            <div className={styles.teamCards}>
              {activeTeams.map((team) => (
                <div className={styles.teamCard} key={team.id}>
                  <div className={styles.teamCardHead}><strong>{team.name}</strong><span>{team.venue}</span></div>
                  <div className={styles.teamFields}>
                    <label><span>Undirlag</span><select value={team.surface} onChange={(event) => updateTeam(team.id, { surface: event.target.value as Surface })}><option value="unknown">Óstaðfest</option><option value="grass">Gras</option><option value="artificial">Gervigras</option></select></label>
                    <label><span>Flóðljós</span><select value={team.floodlights === null ? "unknown" : team.floodlights ? "yes" : "no"} onChange={(event) => updateTeam(team.id, { floodlights: event.target.value === "unknown" ? null : event.target.value === "yes" })}><option value="unknown">Óstaðfest</option><option value="yes">Já</option><option value="no">Nei</option></select></label>
                    <label><span>Evrópuleið</span><select value={team.europePath} onChange={(event) => updateTeam(team.id, { europePath: event.target.value as EuropePath })}><option value="none">Engin</option><option value="champions">Meistaraleið</option><option value="conference">Sambandsdeild</option></select></label>
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
