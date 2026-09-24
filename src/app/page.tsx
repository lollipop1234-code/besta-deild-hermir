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
import type { EuropePath, FormatPreset, Surface, Team } from "@/lib/types";

const surfaceLabels: Record<Surface, string> = {
  grass: "Gras",
  artificial: "Gervigras",
  unknown: "Óstaðfest",
};

const formatCopy: Record<FormatPreset, { title: string; meta: string }> = {
  "ten-triple": {
    title: "10 lið · þreföld umferð",
    meta: "Tilraun · 27 leikir á lið",
  },
  "ten-split": {
    title: "10 lið + 5/5 split",
    meta: "Tilraun · 26 leikir · 13/13 heima/úti",
  },
  "current-12-split": {
    title: "12 lið + split",
    meta: "Núverandi rammi · 27 leikir á lið",
  },
  "double-14": {
    title: "14 lið · tvöföld umferð",
    meta: "Umræðuleið · 26 leikir · 13/13 heima/úti",
  },
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
  const aTime = new Date(`${a}T12:00:00Z`).getTime();
  const bTime = new Date(`${b}T12:00:00Z`).getTime();
  return Math.abs(aTime - bTime) / oneDay;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <button
        type="button"
        className={`switch ${checked ? "switch-on" : ""}`}
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </label>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function inRange(value: string, start: string, end: string) {
  return value >= start && value <= end;
}

export default function Home() {
  const [preset, setPreset] = useState<FormatPreset>("current-12-split");
  const [seasonStart, setSeasonStart] = useState("2027-04-10");
  const [seasonEnd, setSeasonEnd] = useState("2027-10-23");
  const [avoidFifa, setAvoidFifa] = useState(true);
  const [showUefa, setShowUefa] = useState(true);
  const [springEuropeTeamId, setSpringEuropeTeamId] = useState("none");
  const [teams, setTeams] = useState<Team[]>([...teams2026, ...expansionTeams]);
  const [selectedRound, setSelectedRound] = useState(1);
  const [teamsOpen, setTeamsOpen] = useState(false);

  const metrics = useMemo(() => formatMetrics(preset), [preset]);
  const activeTeams = useMemo(
    () => teams.slice(0, metrics.teams),
    [teams, metrics.teams],
  );
  const calendar = useMemo(
    () => buildRoundDates(preset, seasonStart, seasonEnd, calendar2027, avoidFifa),
    [preset, seasonStart, seasonEnd, avoidFifa],
  );
  const pairingRounds = useMemo(
    () => buildPairingRounds(preset, activeTeams),
    [preset, activeTeams],
  );
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
      round.stage === "split" ||
      round.pairings.some((pair) => pair.home === springEuropeTeam.id || pair.away === springEuropeTeam.id)
    ),
  );

  const nearbySpringEurope = roundDate && springTeamCouldPlay
    ? conferenceSpring2027
      .map((match) => ({ ...match, distance: daysApart(roundDate.date, match.date) }))
      .filter((match) => match.distance <= 3)
      .sort((a, b) => a.distance - b.distance)[0]
    : undefined;

  function updateTeam(id: string, patch: Partial<Team>) {
    setTeams((current) => current.map((team) => (team.id === id ? { ...team, ...patch } : team)));
  }

  function choosePreset(next: FormatPreset) {
    const nextMetrics = formatMetrics(next);
    const nextIds = new Set(teams.slice(0, nextMetrics.teams).map((team) => team.id));
    setPreset(next);
    setSelectedRound(1);
    if (springEuropeTeamId !== "none" && !nextIds.has(springEuropeTeamId)) {
      setSpringEuropeTeamId("none");
    }
  }

  const splitMessage = preset === "ten-split"
    ? {
      title: "Split ræðst af stöðunni eftir 18 leiki.",
      text: "Fimm lið fara í hvorn hluta. Þar sem hóparnir eru oddatala fær eitt lið frí í hverjum leikdagaglugga, svo split-ið þarf 10 glugga fyrir 8 leiki á lið.",
    }
    : {
      title: "Þessi umferð ræðst af stöðunni eftir 22 leiki.",
      text: "Hermirinn býr ekki til falska mótherja áður en efri og neðri hluti liggja fyrir.",
    };

  return (
    <main>
      <header className="topbar">
        <div className="brandmark">M</div>
        <div>
          <div className="eyebrow">Mótamiðja · 2027 hermir</div>
          <h1>Besta deildin, en þú ræður.</h1>
        </div>
        <span className="year-chip">2027</span>
      </header>

      <section className="intro">
        <p>
          Prófaðu stærð deildar, fyrirkomulag og Evrópuálag. Hermirinn á að sýna afleiðingarnar án þess að fela flóknu reglurnar í viðmótinu.
        </p>
        <p className="data-note">Liðalistinn er vinnulisti úr 2026 þar til þátttakendur 2027 liggja endanlega fyrir.</p>
      </section>

      <div className="workspace">
        <aside className="panel controls">
          <div className="section-heading">
            <span className="step">1</span>
            <div>
              <h2>Veldu mót</h2>
              <p>Ýttu og sjáðu hvað gerist.</p>
            </div>
          </div>

          <div className="preset-grid">
            {(Object.keys(formatCopy) as FormatPreset[]).map((format) => (
              <button
                type="button"
                key={format}
                className={`preset ${preset === format ? "preset-active" : ""}`}
                onClick={() => choosePreset(format)}
              >
                <strong>{formatCopy[format].title}</strong>
                <span>{formatCopy[format].meta}</span>
              </button>
            ))}
          </div>

          <div className="divider" />

          <div className="section-heading compact">
            <span className="step">2</span>
            <div>
              <h2>Tímabilið</h2>
              <p>Helgar eru sjálfgefnar.</p>
            </div>
          </div>

          <div className="date-grid">
            <label>
              <span>Byrjar</span>
              <input type="date" value={seasonStart} onChange={(event) => setSeasonStart(event.target.value)} />
            </label>
            <label>
              <span>Endar</span>
              <input type="date" value={seasonEnd} onChange={(event) => setSeasonEnd(event.target.value)} />
            </label>
          </div>

          <div className="toggle-list">
            <Toggle checked={avoidFifa} onChange={setAvoidFifa} label="Forðast FIFA-glugga" />
            <Toggle checked={showUefa} onChange={setShowUefa} label="Sýna mögulegt Evrópuálag" />
          </div>

          <div className="divider" />

          <div className="section-heading compact">
            <span className="step">3</span>
            <div>
              <h2>Evrópa frá fyrra ári</h2>
              <p>Ef íslenskt lið er enn í UECL vorið 2027.</p>
            </div>
          </div>

          <div className="date-grid">
            <label className="fixture-title-row">
              <span>Lið í útslætti</span>
              <select value={springEuropeTeamId} onChange={(event) => setSpringEuropeTeamId(event.target.value)}>
                <option value="none">Ekkert lið</option>
                {activeTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
            </label>
            <label>
              <span>Staða</span>
              <span>{springEuropeTeam ? "Staðfestir UEFA-leikdagar virkir" : "Engin carryover-sviðsmynd"}</span>
            </label>
          </div>

          <div className="divider" />

          <button type="button" className="team-settings-button" onClick={() => setTeamsOpen((value) => !value)}>
            <span>
              <b>Stillingar liða</b>
              <small>{activeTeams.length} lið · {europeTeams.length} í Evrópusviðsmynd · {unknownVenues} vallargögn óstaðfest</small>
            </span>
            <span className="chevron">{teamsOpen ? "−" : "+"}</span>
          </button>

          {teamsOpen && (
            <div className="team-editor">
              <div className="team-editor-head">
                <span>Lið / völlur</span><span>Undirlag</span><span>Ljós</span><span>Evrópuleið</span>
              </div>
              {activeTeams.map((team) => (
                <div className="team-row" key={team.id}>
                  <div className="team-name">
                    <strong>{team.name}</strong>
                    <span>{team.venue}</span>
                  </div>
                  <select
                    aria-label={`Undirlag ${team.name}`}
                    value={team.surface}
                    onChange={(event) => updateTeam(team.id, { surface: event.target.value as Surface })}
                  >
                    <option value="unknown">?</option>
                    <option value="grass">Gras</option>
                    <option value="artificial">Gervi</option>
                  </select>
                  <select
                    aria-label={`Flóðljós ${team.name}`}
                    value={team.floodlights === null ? "unknown" : team.floodlights ? "yes" : "no"}
                    onChange={(event) => updateTeam(team.id, { floodlights: event.target.value === "unknown" ? null : event.target.value === "yes" })}
                  >
                    <option value="unknown">?</option>
                    <option value="yes">Já</option>
                    <option value="no">Nei</option>
                  </select>
                  <select
                    aria-label={`Evrópuleið ${team.name}`}
                    value={team.europePath}
                    onChange={(event) => updateTeam(team.id, { europePath: event.target.value as EuropePath })}
                  >
                    <option value="none">Engin</option>
                    <option value="champions">Meistari</option>
                    <option value="conference">UECL</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </aside>

        <section className="results">
          <div className="scorecard panel">
            <div className="scorecard-top">
              <div>
                <div className="eyebrow">Niðurstaðan núna</div>
                <h2>{formatCopy[preset].title}</h2>
              </div>
              <div className={`fit-badge ${calendar.shortfall ? "fit-badge-bad" : ""}`}>
                <span className="dot" />
                {calendar.shortfall
                  ? `Vantar ${calendar.shortfall} leikdaga`
                  : `${calendar.rounds.length}/${metrics.rounds} leikdagar fundust`}
              </div>
            </div>

            <div className="stats">
              <Stat value={metrics.gamesPerTeam} label="leikir á lið" />
              <Stat value={metrics.totalGames} label="leikir alls" />
              <Stat value={metrics.homeRange} label="heima / úti" />
              <Stat value={metrics.rounds} label="leikdagagluggar" />
            </div>

            <div className="signal-row">
              <div><span className="signal-number">{grassTeams}</span><span>lið á grasi</span></div>
              <div><span className="signal-number">{noLights}</span><span>án flóðljósa</span></div>
              <div><span className="signal-number">{europeTeams.length}</span><span>lið í Evrópusviðsmynd</span></div>
              <div><span className="signal-number">{unknownVenues}</span><span>vallargögn óstaðfest</span></div>
            </div>
            <p className="data-note" style={{ marginTop: 14, marginBottom: 0 }}>
              „Leikdagar fundust“ merkir aðeins að nægir dagsetningargluggar séu til. Það er ekki enn full staðfesting á öllum KSÍ-, vallar-, bikar- og UEFA-forsendum.
            </p>
          </div>

          <div className="panel europe-panel">
            <div className="panel-title-row">
              <div>
                <div className="eyebrow">Evrópa 2027</div>
                <h2>Álagið getur byrjað strax um vorið</h2>
              </div>
              <span className="quiet">{championsTeams.length} meistaraleið · {conferenceTeams.length} UECL-leið</span>
            </div>

            {springEuropeTeam && (
              <div className="europe-team-list">
                <div className="europe-team">
                  <div><strong>{springEuropeTeam.name}</strong><span>UECL 2026/27 carryover</span></div>
                  <p>Ef liðið er enn í Sambandsdeildinni koma staðfestir UEFA-leikdagar inn í íslenska vorið 2027.</p>
                  <p className="europe-detail">
                    {conferenceSpring2027.filter((match) => match.date >= "2027-04-01").map((match) => shortDate(match.date)).join(" · ")}
                  </p>
                </div>
                <div className="provisional-note">
                  <b>Staðfest UEFA-dagatal.</b>
                  <a className="quiet" href={conferenceSpringSource.url} target="_blank" rel="noreferrer">{conferenceSpringSource.label} ↗</a>
                </div>
              </div>
            )}

            {europeTeams.length === 0 ? (
              <p className="empty-copy">Veldu Evrópuleið hjá liðum undir „Stillingar liða“. Þá sér hermirinn hvaða sumar- og haustumferðir geta orðið viðkvæmar.</p>
            ) : (
              <div className="europe-team-list">
                {europeTeams.map((team) => {
                  const profile = team.europePath === "none" ? null : europePathProfiles[team.europePath];
                  if (!profile) return null;
                  return (
                    <div className="europe-team" key={team.id}>
                      <div><strong>{team.name}</strong><span>{profile.label}</span></div>
                      <p>{profile.description}</p>
                      <p className="europe-detail">{profile.autumnRisk}</p>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="provisional-note">
              <b>2027/28 UEFA-dagsetningar eru ekki endanlega birtar.</b>
              <span>Sumar- og haustálag er því sviðsmynd, ekki harð dagskrárregla, þar til UEFA staðfestir leikdagana.</span>
            </div>
          </div>

          <div className="panel calendar-panel">
            <div className="panel-title-row">
              <div>
                <div className="eyebrow">Dagatal 2027</div>
                <h2>Hvar þrengir að?</h2>
              </div>
              <span className="quiet">{calendar.rounds.length}/{metrics.rounds} leikdagar fundnir</span>
            </div>

            <div className="month-line" aria-hidden="true">
              {["APR", "MAÍ", "JÚN", "JÚL", "ÁGÚ", "SEP", "OKT"].map((month) => <span key={month}>{month}</span>)}
            </div>
            <div className="timeline">
              <div className="timeline-season" />
              <div className="timeline-block block-fifa-june" title="FIFA landsleikjagluggi">FIFA</div>
              {showUefa && <div className="timeline-block block-uefa" title="Mögulegar UEFA-undankeppnir">UEFA</div>}
              {avoidFifa && <div className="timeline-block block-fifa-autumn" title="FIFA landsleikjagluggi">FIFA</div>}
            </div>

            <div className="calendar-notes">
              {calendar2027.filter((block) => block.start >= "2027-04-01" && block.start <= "2027-10-31").map((block) => (
                <div key={block.id} className={`calendar-note note-${block.kind}`}>
                  <div>
                    <strong>{block.label}</strong>
                    <span>{dateSpan(block.start, block.end)}</span>
                  </div>
                  <p>{block.note}</p>
                  <small className={`confidence confidence-${block.confidence}`}>
                    {block.confidence === "official" ? "Staðfest" : "Áætlað"}
                    {block.constraint === "avoid" ? " · forðast" : block.constraint === "blackout" ? " · lokað" : ""}
                  </small>
                  {block.sourceUrl && (
                    <div style={{ marginTop: 8 }}>
                      <a className="quiet" href={block.sourceUrl} target="_blank" rel="noreferrer">{block.sourceLabel ?? "Heimild"} ↗</a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="panel fixture-panel">
            <div className="panel-title-row fixture-title-row">
              <div>
                <div className="eyebrow">Leikjapróf</div>
                <h2>Umferð {selectedRound}</h2>
              </div>
              <select value={selectedRound} onChange={(event) => setSelectedRound(Number(event.target.value))}>
                {Array.from({ length: metrics.rounds }, (_, index) => index + 1).map((number) => (
                  <option key={number} value={number}>Umferð {number}</option>
                ))}
              </select>
            </div>

            <div className="round-meta">
              <span>{roundDate?.label ?? "Enginn leikdagur fundinn"}</span>
              {round?.stage === "split" && <span className="pill">Lokahluti</span>}
              {showUefa && uefaWindow && roundEuropeTeams.length > 0 && (
                <span className="pill pill-warn">Evrópuviðkvæmt · {roundEuropeTeams.map((team) => team.name).join(", ")}</span>
              )}
              {nearbySpringEurope && springEuropeTeam && (
                <span className="pill pill-warn">UECL frá fyrra ári · {springEuropeTeam.name} · {shortDate(nearbySpringEurope.date)}</span>
              )}
            </div>

            {round?.stage === "split" ? (
              <div className="split-placeholder">
                <strong>{splitMessage.title}</strong>
                <span>{splitMessage.text}</span>
              </div>
            ) : (
              <div className="fixtures">
                {round?.pairings.map((pair) => {
                  const home = activeTeams.find((team) => team.id === pair.home);
                  const away = activeTeams.find((team) => team.id === pair.away);
                  const summerEuropeSensitive = Boolean(showUefa && uefaWindow && (home?.europePath !== "none" || away?.europePath !== "none"));
                  const springEuropeSensitive = Boolean(
                    nearbySpringEurope && springEuropeTeam &&
                    (pair.home === springEuropeTeam.id || pair.away === springEuropeTeam.id),
                  );
                  return (
                    <div className={`fixture ${summerEuropeSensitive || springEuropeSensitive ? "fixture-europe" : ""}`} key={`${round.number}-${pair.home}-${pair.away}`}>
                      <span>{names[pair.home]}</span>
                      <b>–</b>
                      <span>{names[pair.away]}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rule-strip">
            <div><span className="rule-dot hard" /><b>Harð regla</b><span>aðeins þegar heimild segir að lokað sé</span></div>
            <div><span className="rule-dot soft" /><b>Sterk forsenda</b><span>t.d. FIFA-gluggi sem hermirinn forðast</span></div>
            <div><span className="rule-dot info" /><b>Sviðsmynd</b><span>óstaðfest UEFA 2027/28 álag</span></div>
          </div>
        </section>
      </div>

      <footer>
        <span>Tilraunaverkefni · ekki opinber leikjaskrá KSÍ</span>
        <span>2027 dagatal · staðfestar og áætlaðar forsendur aðgreindar</span>
      </footer>
    </main>
  );
}
