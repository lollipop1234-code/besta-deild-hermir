"use client";

import { useMemo, useState } from "react";

import { calendar2027 } from "@/data/calendar-2027";
import { europePathProfiles } from "@/data/europe-2027";
import { conferenceSpring2027, conferenceSpringSource } from "@/data/europe-spring-2027";
import { expansionTeams, teams2026 } from "@/data/teams-2026";
import {
  buildPairingRounds,
  buildRoundDates,
  formatMetrics,
  teamNameMap,
} from "@/lib/simulator";
import {
  buildTeamLoadEvents,
  summarizeTeamLoad,
  visibleTeamLoadEvents,
} from "@/lib/team-load";
import {
  applyGrassHomePreference,
  grassShoulderWarning,
  kickoffForHomeTeam,
} from "@/lib/venue-planner";
import type { EuropePath, FormatPreset, Surface, Team } from "@/lib/types";
import TeamLoadPanel from "./TeamLoadPanel";

const formatCopy: Record<FormatPreset, { title: string; meta: string }> = {
  "ten-triple": { title: "10 lið · þreföld umferð", meta: "Tilraun · 27 leikir á lið" },
  "ten-split": { title: "10 lið + 5/5 split", meta: "Tilraun · 26 leikir · 13/13 heima/úti" },
  "current-12-split": { title: "12 lið + split", meta: "Núverandi rammi · 27 leikir á lið" },
  "double-14": { title: "14 lið · tvöföld umferð", meta: "Umræðuleið · 26 leikir · 13/13 heima/úti" },
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

function Stat({ value, label }: { value: string | number; label: string }) {
  return <div className="stat"><strong>{value}</strong><span>{label}</span></div>;
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
  const round = pairingRounds[Math.min(selectedRound, pairingRounds.length) - 1];
  const roundDate = calendar.rounds[Math.min(selectedRound, calendar.rounds.length) - 1];

  const unknownVenues = activeTeams.filter((team) => team.surface === "unknown" || team.floodlights === null).length;
  const europeTeams = activeTeams.filter((team) => team.europePath !== "none");
  const championsTeams = activeTeams.filter((team) => team.europePath === "champions");
  const conferenceTeams = activeTeams.filter((team) => team.europePath === "conference");
  const grassTeams = activeTeams.filter((team) => team.surface === "grass").length;
  const noLights = activeTeams.filter((team) => team.floodlights === false).length;
  const springEuropeTeam = activeTeams.find((team) => team.id === springEuropeTeamId);
  const loadTeam = activeTeams.find((team) => team.id === loadTeamId) ?? activeTeams[0];
  const qualifyingWindow = calendar2027.find((block) => block.id === "uefa-qualifying-2027");

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
    });
  }, [loadTeam, pairingRounds, calendar.rounds, names, springEuropeTeamId, qualifyingWindow, showUefa]);

  const visibleLoadEvents = useMemo(
    () => visibleTeamLoadEvents(loadEvents, seasonStart, seasonEnd),
    [loadEvents, seasonStart, seasonEnd],
  );
  const loadSummary = useMemo(() => summarizeTeamLoad(visibleLoadEvents), [visibleLoadEvents]);
  const splitIsUnresolved = pairingRounds.some((item) => item.stage === "split" && item.pairings.length === 0);

  function updateTeam(id: string, patch: Partial<Team>) {
    setTeams((current) => current.map((team) => (team.id === id ? { ...team, ...patch } : team)));
  }

  function choosePreset(next: FormatPreset) {
    const nextMetrics = formatMetrics(next);
    const nextTeams = teams.slice(0, nextMetrics.teams);
    const nextIds = new Set(nextTeams.map((team) => team.id));
    setPreset(next);
    setSelectedRound(1);
    if (springEuropeTeamId !== "none" && !nextIds.has(springEuropeTeamId)) setSpringEuropeTeamId("none");
    if (!nextIds.has(loadTeamId)) setLoadTeamId(nextTeams[0]?.id ?? "");
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

      <section className="intro">
        <p>Prófaðu stærð deildar, fyrirkomulag, velli og Evrópuálag. Breyttu einu atriði og sjáðu strax hvað það gerir við mótið.</p>
        <p className="data-note">Liðalistinn er vinnulisti úr 2026 þar til þátttakendur 2027 liggja endanlega fyrir.</p>
      </section>

      <div className="workspace">
        <aside className="panel controls">
          <div className="section-heading"><span className="step">1</span><div><h2>Veldu mót</h2><p>Ýttu og sjáðu hvað gerist.</p></div></div>
          <div className="preset-grid">
            {(Object.keys(formatCopy) as FormatPreset[]).map((format) => (
              <button type="button" key={format} className={`preset ${preset === format ? "preset-active" : ""}`} onClick={() => choosePreset(format)}>
                <strong>{formatCopy[format].title}</strong><span>{formatCopy[format].meta}</span>
              </button>
            ))}
          </div>

          <div className="divider" />
          <div className="section-heading compact"><span className="step">2</span><div><h2>Tímabilið</h2><p>Helgar eru sjálfgefnar.</p></div></div>
          <div className="date-grid">
            <label><span>Byrjar</span><input type="date" value={seasonStart} onChange={(event) => setSeasonStart(event.target.value)} /></label>
            <label><span>Endar</span><input type="date" value={seasonEnd} onChange={(event) => setSeasonEnd(event.target.value)} /></label>
          </div>
          <div className="toggle-list">
            <Toggle checked={avoidFifa} onChange={setAvoidFifa} label="Forðast FIFA-glugga" />
            <Toggle checked={showUefa} onChange={setShowUefa} label="Sýna mögulegt Evrópuálag" />
            <Toggle checked={preferEvening} onChange={setPreferEvening} label="Prófa kvöldslot kl. 19:15" />
            <Toggle checked={protectGrass} onChange={setProtectGrass} label="Hlífa grasi í apríl / október" />
          </div>
          {protectGrass && <p className="data-note" style={{ marginTop: 8 }}>Hermisstilling, ekki KSÍ-regla. Vélin reynir að víxla heima/úti milli innbyrðis leikja án þess að breyta heildarjafnvægi.</p>}

          <div className="divider" />
          <div className="section-heading compact"><span className="step">3</span><div><h2>Evrópa frá fyrra ári</h2><p>Ef íslenskt lið er enn í UECL vorið 2027.</p></div></div>
          <div className="date-grid">
            <label className="fixture-title-row">
              <span>Lið í útslætti</span>
              <select value={springEuropeTeamId} onChange={(event) => setSpringEuropeTeamId(event.target.value)}>
                <option value="none">Ekkert lið</option>
                {activeTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
            </label>
            <label><span>Staða</span><span>{springEuropeTeam ? "Staðfestir UEFA-leikdagar virkir" : "Engin carryover-sviðsmynd"}</span></label>
          </div>

          <div className="divider" />
          <button type="button" className="team-settings-button" onClick={() => setTeamsOpen((value) => !value)}>
            <span><b>Stillingar liða</b><small>{activeTeams.length} lið · {europeTeams.length} í Evrópusviðsmynd · {unknownVenues} vallargögn óstaðfest</small></span>
            <span className="chevron">{teamsOpen ? "−" : "+"}</span>
          </button>

          {teamsOpen && (
            <div className="team-editor">
              <div className="team-editor-head"><span>Lið / völlur</span><span>Undirlag</span><span>Ljós</span><span>Evrópuleið</span></div>
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

        <section className="results">
          <div className="scorecard panel">
            <div className="scorecard-top">
              <div><div className="eyebrow">Niðurstaðan núna</div><h2>{formatCopy[preset].title}</h2></div>
              <div className={`fit-badge ${calendar.shortfall ? "fit-badge-bad" : ""}`}><span className="dot" />{calendar.shortfall ? `Vantar ${calendar.shortfall} leikdaga` : `${calendar.rounds.length}/${metrics.rounds} leikdagar fundust`}</div>
            </div>
            <div className="stats">
              <Stat value={metrics.gamesPerTeam} label="leikir á lið" /><Stat value={metrics.totalGames} label="leikir alls" /><Stat value={metrics.homeRange} label="heima / úti" /><Stat value={metrics.rounds} label="leikdagagluggar" />
            </div>
            <div className="signal-row">
              <div><span className="signal-number">{grassTeams}</span><span>lið á grasi</span></div>
              <div><span className="signal-number">{noLights}</span><span>án flóðljósa</span></div>
              <div><span className="signal-number">{europeTeams.length}</span><span>lið í Evrópusviðsmynd</span></div>
              <div><span className="signal-number">{venuePlan.swaps}</span><span>heima/úti víxlanir vegna grass</span></div>
            </div>
            <p className="data-note" style={{ marginTop: 14, marginBottom: 0 }}>„Leikdagar fundust“ er ekki full staðfesting á öllum KSÍ-, vallar-, bikar- og UEFA-forsendum.</p>
          </div>

          <div className="panel europe-panel">
            <div className="panel-title-row"><div><div className="eyebrow">Evrópa 2027</div><h2>Álagið getur byrjað strax um vorið</h2></div><span className="quiet">{championsTeams.length} meistaraleið · {conferenceTeams.length} UECL-leið</span></div>
            {springEuropeTeam && (
              <div className="europe-team-list">
                <div className="europe-team"><div><strong>{springEuropeTeam.name}</strong><span>UECL 2026/27 carryover</span></div><p>Ef liðið er enn í Sambandsdeildinni koma staðfestir UEFA-leikdagar inn í íslenska vorið 2027.</p><p className="europe-detail">{conferenceSpring2027.filter((match) => match.date >= "2027-04-01").map((match) => shortDate(match.date)).join(" · ")}</p></div>
                <div className="provisional-note"><b>Staðfest UEFA-dagatal.</b><a className="quiet" href={conferenceSpringSource.url} target="_blank" rel="noreferrer">{conferenceSpringSource.label} ↗</a></div>
              </div>
            )}
            {europeTeams.length === 0 ? <p className="empty-copy">Veldu Evrópuleið hjá liðum undir „Stillingar liða“.</p> : (
              <div className="europe-team-list">{europeTeams.map((team) => {
                const profile = team.europePath === "none" ? null : europePathProfiles[team.europePath];
                if (!profile) return null;
                return <div className="europe-team" key={team.id}><div><strong>{team.name}</strong><span>{profile.label}</span></div><p>{profile.description}</p><p className="europe-detail">{profile.autumnRisk}</p></div>;
              })}</div>
            )}
            <div className="provisional-note"><b>2027/28 UEFA-dagsetningar eru ekki endanlega birtar.</b><span>Sumar- og haustálag er því sviðsmynd þar til UEFA staðfestir leikdagana.</span></div>
          </div>

          <TeamLoadPanel
            teams={activeTeams}
            selectedTeamId={loadTeam?.id ?? ""}
            onSelectTeam={setLoadTeamId}
            summary={loadSummary}
            splitIsUnresolved={splitIsUnresolved}
          />

          <div className="panel calendar-panel">
            <div className="panel-title-row"><div><div className="eyebrow">Dagatal 2027</div><h2>Hvar þrengir að?</h2></div><span className="quiet">{calendar.rounds.length}/{metrics.rounds} leikdagar fundnir</span></div>
            <div className="month-line" aria-hidden="true">{["APR", "MAÍ", "JÚN", "JÚL", "ÁGÚ", "SEP", "OKT"].map((month) => <span key={month}>{month}</span>)}</div>
            <div className="timeline"><div className="timeline-season" /><div className="timeline-block block-fifa-june" title="FIFA landsleikjagluggi">FIFA</div>{showUefa && <div className="timeline-block block-uefa" title="Mögulegar UEFA-undankeppnir">UEFA</div>}{avoidFifa && <div className="timeline-block block-fifa-autumn" title="FIFA landsleikjagluggi">FIFA</div>}</div>
            <div className="calendar-notes">
              {calendar2027.filter((block) => block.start >= "2027-04-01" && block.start <= "2027-10-31").map((block) => (
                <div key={block.id} className={`calendar-note note-${block.kind}`}><div><strong>{block.label}</strong><span>{dateSpan(block.start, block.end)}</span></div><p>{block.note}</p><small className={`confidence confidence-${block.confidence}`}>{block.confidence === "official" ? "Staðfest" : "Áætlað"}{block.constraint === "avoid" ? " · forðast" : block.constraint === "blackout" ? " · lokað" : ""}</small>{block.sourceUrl && <div style={{ marginTop: 8 }}><a className="quiet" href={block.sourceUrl} target="_blank" rel="noreferrer">{block.sourceLabel ?? "Heimild"} ↗</a></div>}</div>
              ))}
              <div className="calendar-note note-info"><div><strong>Mjólkurbikar 2027</strong><span>bíður</span></div><p>Keppnin er staðfest út 2027, en nákvæmir leikdagar 2027 eru ekki settir inn fyrr en opinbert KSÍ-dagatal liggur fyrir.</p><small className="confidence confidence-provisional">Ekki giskað</small></div>
            </div>
          </div>

          <div className="panel fixture-panel">
            <div className="panel-title-row fixture-title-row"><div><div className="eyebrow">Leikjapróf</div><h2>Umferð {selectedRound}</h2></div><select value={selectedRound} onChange={(event) => setSelectedRound(Number(event.target.value))}>{Array.from({ length: metrics.rounds }, (_, index) => index + 1).map((number) => <option key={number} value={number}>Umferð {number}</option>)}</select></div>
            <div className="round-meta"><span>{roundDate?.label ?? "Enginn leikdagur fundinn"}</span>{round?.stage === "split" && <span className="pill">Lokahluti</span>}{showUefa && uefaWindow && roundEuropeTeams.length > 0 && <span className="pill pill-warn">Evrópuviðkvæmt · {roundEuropeTeams.map((team) => team.name).join(", ")}</span>}{nearbySpringEurope && springEuropeTeam && <span className="pill pill-warn">UECL frá fyrra ári · {springEuropeTeam.name} · {shortDate(nearbySpringEurope.date)}</span>}</div>

            {round?.stage === "split" ? <div className="split-placeholder"><strong>{splitMessage.title}</strong><span>{splitMessage.text}</span></div> : (
              <div className="fixtures">{round?.pairings.map((pair) => {
                const home = activeTeams.find((team) => team.id === pair.home);
                const away = activeTeams.find((team) => team.id === pair.away);
                const kickoff = kickoffForHomeTeam(home, preferEvening ? "evening" : "afternoon");
                const summerEuropeSensitive = Boolean(showUefa && uefaWindow && (home?.europePath !== "none" || away?.europePath !== "none"));
                const springEuropeSensitive = Boolean(nearbySpringEurope && springEuropeTeam && (pair.home === springEuropeTeam.id || pair.away === springEuropeTeam.id));
                const grassWarning = protectGrass && grassShoulderWarning(home, roundDate?.date);
                return (
                  <div className={`fixture ${summerEuropeSensitive || springEuropeSensitive || grassWarning ? "fixture-europe" : ""}`} key={`${round.number}-${pair.home}-${pair.away}`} title={kickoff.note}>
                    <span>{names[pair.home]}<small className="quiet" style={{ display: "block", marginTop: 2 }}>{kickoff.time}{kickoff.adjusted ? " · fært fyrr" : kickoff.dataGap && preferEvening ? " · ljós óstaðfest" : ""}{grassWarning ? " · gras apr/okt" : ""}</small></span>
                    <b>–</b><span>{names[pair.away]}</span>
                  </div>
                );
              })}</div>
            )}
          </div>

          <div className="rule-strip"><div><span className="rule-dot hard" /><b>Harð regla</b><span>aðeins þegar heimild segir að lokað sé</span></div><div><span className="rule-dot soft" /><b>Hermisstilling</b><span>t.d. grasvernd og kvöldslot</span></div><div><span className="rule-dot info" /><b>Sviðsmynd</b><span>óstaðfest UEFA 2027/28 álag</span></div></div>
        </section>
      </div>

      <footer><span>Tilraunaverkefni · ekki opinber leikjaskrá KSÍ</span><span>2027 dagatal · staðfestar og áætlaðar forsendur aðgreindar</span></footer>
    </main>
  );
}
