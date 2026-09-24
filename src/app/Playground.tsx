"use client";

import { useMemo, useState } from "react";

import { calendar2027 } from "@/data/calendar-2027";
import { europePathProfiles } from "@/data/europe-2027";
import { conferenceSpring2027, conferenceSpringSource } from "@/data/europe-spring-2027";
import type { CupDepth } from "@/data/mjolkurbikar-template-2026";
import { expansionTeams, teams2026 } from "@/data/teams-2026";
import { buildWeekHeatmap } from "@/lib/playground-heatmap";
import { findScheduleRepair, type ScheduleRepairSuggestion } from "@/lib/schedule-repair";
import {
  buildPairingRounds,
  buildRoundDates,
  formatMetrics,
  teamNameMap,
} from "@/lib/simulator";
import {
  buildTeamLoadEvents,
  fixtureKey,
  summarizeTeamLoad,
  visibleTeamLoadEvents,
  type FixtureDateOverrides,
} from "@/lib/team-load";
import {
  applyGrassHomePreference,
  grassShoulderWarning,
  kickoffForHomeTeam,
} from "@/lib/venue-planner";
import type { EuropePath, FormatPreset, Surface, Team } from "@/lib/types";
import PlaygroundOverview from "./PlaygroundOverview";
import TeamLoadPanel from "./TeamLoadPanel";

const formatCopy: Record<FormatPreset, { title: string; meta: string }> = {
  "ten-triple": { title: "10 lið · þreföld umferð", meta: "27 leikir á lið" },
  "ten-split": { title: "10 lið + 5/5 split", meta: "26 leikir · 13/13 heima/úti" },
  "current-12-split": { title: "12 lið + split", meta: "27 leikir á lið" },
  "double-14": { title: "14 lið · tvöföld umferð", meta: "26 leikir · 13/13 heima/úti" },
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
  return Math.abs(
    new Date(`${a}T12:00:00Z`).getTime() - new Date(`${b}T12:00:00Z`).getTime(),
  ) / oneDay;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <button type="button" className={`switch ${checked ? "switch-on" : ""}`} aria-pressed={checked} onClick={() => onChange(!checked)}>
        <span />
      </button>
    </label>
  );
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
  const round = pairingRounds[Math.min(selectedRound, pairingRounds.length) - 1];
  const roundDate = calendar.rounds[Math.min(selectedRound, calendar.rounds.length) - 1];

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
    springEuropeTeam && round && (
      round.stage === "split" || round.pairings.some((pair) => pair.home === springEuropeTeam.id || pair.away === springEuropeTeam.id)
    ),
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
  const heatmapWeeks = useMemo(
    () => buildWeekHeatmap({ seasonStart, seasonEnd, rounds: calendar.rounds, calendarBlocks: calendar2027, teamEvents: visibleLoadEvents }),
    [seasonStart, seasonEnd, calendar.rounds, visibleLoadEvents],
  );
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

  const splitMessage = preset === "ten-split"
    ? {
      title: "Split ræðst af stöðunni eftir 18 leiki.",
      text: "Fimm lið fara í hvorn hluta. Eitt lið fær frí í hverjum leikdagaglugga, svo split-ið þarf 10 glugga fyrir 8 leiki á lið.",
    }
    : {
      title: "Þessi umferð ræðst af stöðunni eftir 22 leiki.",
      text: "Hermirinn býr ekki til falska mótherja áður en efri og neðri hluti liggja fyrir.",
    };

  return (
    <main>
      <header className="topbar">
        <div className="brandmark">M</div>
        <div><div className="eyebrow">Mótamiðja · 2027 hermir</div><h1>Besta deildin, en þú ræður.</h1></div>
        <span className="year-chip">2027</span>
      </header>

      <section className="intro compact-intro">
        <p>Fiktaðu í mótinu, keyrðu það aftur og sjáðu strax hvar dagatalið verður þétt.</p>
        <p className="data-note">2027 hermir · FIFA staðfest · UEFA og Mjólkurbikar byggja á merktum 2026 sniðmátum þar til 2027 dagsetningar birtast.</p>
      </section>

      <div className="workspace playground-workspace">
        <aside className="panel controls compact-controls">
          <div className="section-heading"><span className="step">1</span><div><h2>Stilltu sviðsmynd</h2><p>Breyttu bara því sem þú vilt prófa.</p></div></div>

          <div className="date-grid">
            <label><span>Byrjar</span><input type="date" value={seasonStart} onChange={(event) => { setSeasonStart(event.target.value); setFixtureDateOverrides({}); }} /></label>
            <label><span>Endar</span><input type="date" value={seasonEnd} onChange={(event) => { setSeasonEnd(event.target.value); setFixtureDateOverrides({}); }} /></label>
          </div>

          <div className="toggle-list">
            <Toggle checked={avoidFifa} onChange={setAvoidFifa} label="Forðast FIFA-glugga" />
            <Toggle checked={showUefa} onChange={setShowUefa} label="Sýna UEFA-sniðmát" />
            <Toggle checked={preferEvening} onChange={setPreferEvening} label="Kvöldleikir kl. 19:15" />
            <Toggle checked={protectGrass} onChange={(value) => { setProtectGrass(value); setFixtureDateOverrides({}); }} label="Hlífa grasi vor/haust" />
          </div>

          <details className="advanced-controls">
            <summary>Fleiri stillingar</summary>
            <div className="advanced-body">
              <label className="simple-field">
                <span>Evrópa frá fyrra ári</span>
                <select value={springEuropeTeamId} onChange={(event) => { setSpringEuropeTeamId(event.target.value); setFixtureDateOverrides({}); }}>
                  <option value="none">Ekkert lið</option>
                  {activeTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </label>
              <p className="data-note">Ef lið er enn í UECL 2026/27 koma staðfestir vorleikdagar 2027 inn í álagið.</p>
            </div>
          </details>

          <div className="divider" />
          <button type="button" className="team-settings-button" onClick={() => setTeamsOpen((value) => !value)}>
            <span><b>Lið og vellir</b><small>{activeTeams.length} lið · {europeTeams.length} í Evrópu · {unknownVenues} vallargögn óstaðfest</small></span>
            <span className="chevron">{teamsOpen ? "−" : "+"}</span>
          </button>

          {teamsOpen && (
            <div className="team-editor">
              <div className="team-editor-head"><span>Lið / völlur</span><span>Undirlag</span><span>Ljós</span><span>Evrópa</span></div>
              {activeTeams.map((team) => (
                <div className="team-row" key={team.id}>
                  <div className="team-name"><strong>{team.name}</strong><span>{team.venue}</span></div>
                  <select aria-label={`Undirlag ${team.name}`} value={team.surface} onChange={(event) => updateTeam(team.id, { surface: event.target.value as Surface })}>
                    <option value="unknown">?</option><option value="grass">Gras</option><option value="artificial">Gervi</option>
                  </select>
                  <select aria-label={`Flóðljós ${team.name}`} value={team.floodlights === null ? "unknown" : team.floodlights ? "yes" : "no"} onChange={(event) => updateTeam(team.id, { floodlights: event.target.value === "unknown" ? null : event.target.value === "yes" })}>
                    <option value="unknown">?</option><option value="yes">Já</option><option value="no">Nei</option>
                  </select>
                  <select aria-label={`Evrópuleið ${team.name}`} value={team.europePath} onChange={(event) => updateTeam(team.id, { europePath: event.target.value as EuropePath })}>
                    <option value="none">Engin</option><option value="champions">Meistari</option><option value="conference">UECL</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </aside>

        <section className="results playground-results">
          <PlaygroundOverview
            preset={preset}
            onPresetChange={choosePreset}
            weeks={heatmapWeeks}
            selectedTeamName={loadTeam?.name ?? "valið lið"}
            onSelectRound={setSelectedRound}
            shortfall={calendar.shortfall}
            foundRounds={calendar.rounds.length}
            totalRounds={metrics.rounds}
            rerunCount={rerunCount}
            onRerun={rerun}
          />

          <div className="panel fixture-panel fixture-first">
            <div className="panel-title-row fixture-title-row">
              <div><div className="eyebrow">Leikjapróf</div><h2>Umferð {selectedRound}</h2><p className="quiet">{formatCopy[preset].title} · {formatCopy[preset].meta}</p></div>
              <select value={selectedRound} onChange={(event) => setSelectedRound(Number(event.target.value))}>
                {Array.from({ length: metrics.rounds }, (_, index) => index + 1).map((number) => <option key={number} value={number}>Umferð {number}</option>)}
              </select>
            </div>

            <div className="round-meta">
              <span>{roundDate?.label ?? "Enginn leikdagur fundinn"}</span>
              {round?.stage === "split" && <span className="pill">Lokahluti</span>}
              {movedInRound > 0 && <span className="pill">{movedInRound} leik{movedInRound === 1 ? "ur" : "ir"} færður</span>}
              {showUefa && uefaWindow && roundEuropeTeams.length > 0 && <span className="pill pill-warn">UEFA · {roundEuropeTeams.map((team) => team.name).join(", ")}</span>}
              {nearbySpringEurope && springEuropeTeam && <span className="pill pill-warn">UECL · {springEuropeTeam.name} · {shortDate(nearbySpringEurope.date)}</span>}
            </div>

            {round?.stage === "split" ? (
              <div className="split-placeholder"><strong>{splitMessage.title}</strong><span>{splitMessage.text}</span></div>
            ) : (
              <div className="fixtures">
                {round?.pairings.map((pair) => {
                  const home = activeTeams.find((team) => team.id === pair.home);
                  const away = activeTeams.find((team) => team.id === pair.away);
                  const id = fixtureKey(round.number, pair.home, pair.away);
                  const movedDate = fixtureDateOverrides[id];
                  const effectiveDate = movedDate ?? roundDate?.date;
                  const kickoff = kickoffForHomeTeam(home, preferEvening ? "evening" : "afternoon");
                  const fixtureUefaWindow = effectiveDate
                    ? calendar2027.find((block) => block.kind === "uefa" && inRange(effectiveDate, block.start, block.end))
                    : undefined;
                  const summerEuropeSensitive = Boolean(showUefa && fixtureUefaWindow && (home?.europePath !== "none" || away?.europePath !== "none"));
                  const springEuropeSensitive = Boolean(
                    effectiveDate && springEuropeTeam &&
                    (pair.home === springEuropeTeam.id || pair.away === springEuropeTeam.id) &&
                    conferenceSpring2027.some((match) => daysApart(effectiveDate, match.date) <= 3),
                  );
                  const grassWarning = protectGrass && grassShoulderWarning(home, effectiveDate);

                  return (
                    <div className={`fixture ${summerEuropeSensitive || springEuropeSensitive || grassWarning ? "fixture-europe" : ""}`} key={id} title={kickoff.note}>
                      <span>{names[pair.home]}<small className="quiet">{kickoff.time}{effectiveDate ? ` · ${shortDate(effectiveDate)}` : ""}{movedDate ? " · færður" : ""}{kickoff.adjusted ? " · fyrr vegna ljósa" : kickoff.dataGap && preferEvening ? " · ljós óstaðfest" : ""}{grassWarning ? " · gras" : ""}</small></span>
                      <b>–</b>
                      <span>{names[pair.away]}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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

          <details className="detail-drawer">
            <summary>
              <span><b>Forsendur og heimildir</b><small>FIFA · UEFA · Mjólkurbikar · hvað er staðfest og hvað er sniðmát</small></span>
              <span className="chevron">+</span>
            </summary>
            <div className="detail-drawer-body">
              <section className="detail-section">
                <div className="panel-title-row">
                  <div><div className="eyebrow">Evrópa</div><h2>2026 sniðmát → 2027 áætlun</h2></div>
                  <span className="quiet">{championsTeams.length} meistaraleið · {conferenceTeams.length} UECL</span>
                </div>
                {springEuropeTeam && (
                  <div className="source-line"><b>{springEuropeTeam.name}</b><span>UECL 2026/27 carryover · staðfestir vorleikdagar 2027</span><a href={conferenceSpringSource.url} target="_blank" rel="noreferrer">UEFA ↗</a></div>
                )}
                {europeTeams.length > 0 && (
                  <div className="source-list">
                    {europeTeams.map((team) => {
                      const profile = team.europePath === "none" ? null : europePathProfiles[team.europePath];
                      if (!profile) return null;
                      return <div key={team.id}><b>{team.name}</b><span>{profile.label} · einstök 2026 leikslot færð yfir á sambærilega vikudaga 2027</span></div>;
                    })}
                  </div>
                )}
              </section>

              <section className="detail-section">
                <div className="eyebrow">Dagatal</div>
                <div className="source-list calendar-source-list">
                  {calendar2027.filter((block) => block.start >= "2027-04-01" && block.start <= "2027-10-31").map((block) => (
                    <div key={block.id}>
                      <b>{block.label}</b>
                      <span>{dateSpan(block.start, block.end)} · {block.confidence === "official" ? "staðfest" : "sniðmát"}</span>
                      {block.sourceUrl && <a href={block.sourceUrl} target="_blank" rel="noreferrer">Heimild ↗</a>}
                    </div>
                  ))}
                  <div><b>Mjólkurbikar</b><span>2026 umferðargluggar færðir yfir sem liðsbundin 2027 sviðsmynd</span></div>
                </div>
              </section>
            </div>
          </details>

          <div className="rule-strip">
            <div><span className="rule-dot hard" /><b>Harð regla</b><span>aðeins þegar heimild segir það</span></div>
            <div><span className="rule-dot soft" /><b>Hermisstilling</b><span>t.d. gras og kvöldslot</span></div>
            <div><span className="rule-dot info" /><b>Sniðmát</b><span>UEFA / bikar 2026 → 2027</span></div>
          </div>
        </section>
      </div>

      <footer><span>Tilraunaverkefni · ekki opinber leikjaskrá KSÍ</span><span>Fixture playground · einfalt að fikta, rekjanlegt undir húddinu</span></footer>
    </main>
  );
}
