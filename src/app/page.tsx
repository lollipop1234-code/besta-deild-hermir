"use client";

import { useMemo, useState } from "react";

import { calendar2026 } from "@/data/calendar-2026";
import { expansionTeams, teams2026 } from "@/data/teams-2026";
import {
  buildPairingRounds,
  buildRoundDates,
  formatMetrics,
  teamNameMap,
} from "@/lib/simulator";
import type { FormatPreset, Surface, Team } from "@/lib/types";

const surfaceLabels: Record<Surface, string> = {
  grass: "Gras",
  artificial: "Gervigras",
  unknown: "Óstaðfest",
};

function dateSpan(start: string, end: string) {
  const fmt = new Intl.DateTimeFormat("is-IS", { day: "numeric", month: "short" });
  return `${fmt.format(new Date(`${start}T12:00:00Z`))} – ${fmt.format(new Date(`${end}T12:00:00Z`))}`;
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

export default function Home() {
  const [preset, setPreset] = useState<FormatPreset>("current-12-split");
  const [seasonStart, setSeasonStart] = useState("2026-04-10");
  const [seasonEnd, setSeasonEnd] = useState("2026-10-24");
  const [protectFifa, setProtectFifa] = useState(true);
  const [showUefa, setShowUefa] = useState(true);
  const [teams, setTeams] = useState<Team[]>([...teams2026, ...expansionTeams]);
  const [selectedRound, setSelectedRound] = useState(1);
  const [teamsOpen, setTeamsOpen] = useState(false);

  const activeTeams = useMemo(
    () => (preset === "double-14" ? teams : teams.slice(0, 12)),
    [preset, teams],
  );
  const metrics = formatMetrics(preset);
  const calendar = useMemo(
    () => buildRoundDates(preset, seasonStart, seasonEnd, calendar2026, protectFifa),
    [preset, seasonStart, seasonEnd, protectFifa],
  );
  const pairingRounds = useMemo(
    () => buildPairingRounds(preset, activeTeams),
    [preset, activeTeams],
  );
  const names = useMemo(() => teamNameMap(activeTeams), [activeTeams]);
  const round = pairingRounds[Math.min(selectedRound, pairingRounds.length) - 1];
  const roundDate = calendar.rounds[Math.min(selectedRound, calendar.rounds.length) - 1];

  const unknownVenues = activeTeams.filter((team) => team.surface === "unknown" || team.floodlights === null).length;
  const europeTeams = activeTeams.filter((team) => team.europe).length;
  const grassTeams = activeTeams.filter((team) => team.surface === "grass").length;
  const noLights = activeTeams.filter((team) => team.floodlights === false).length;

  function updateTeam(id: string, patch: Partial<Team>) {
    setTeams((current) => current.map((team) => (team.id === id ? { ...team, ...patch } : team)));
  }

  function choosePreset(next: FormatPreset) {
    setPreset(next);
    setSelectedRound(1);
  }

  return (
    <main>
      <header className="topbar">
        <div className="brandmark">M</div>
        <div>
          <div className="eyebrow">Mótamiðja · leikjaforritun</div>
          <h1>Besta deildin, en þú ræður.</h1>
        </div>
        <a className="source-link" href="https://www.ksi.is/oll-mot/mot?id=7025510" target="_blank" rel="noreferrer">
          Gögn 2026 ↗
        </a>
      </header>

      <section className="intro">
        <p>
          Prófaðu annað fyrirkomulag, hreyfðu tímabilið og stilltu velli. Hermirinn reynir að finna pláss án þess að keyra yfir FIFA-glugga.
        </p>
      </section>

      <div className="workspace">
        <aside className="panel controls">
          <div className="section-heading">
            <span className="step">1</span>
            <div>
              <h2>Veldu mót</h2>
              <p>Tvær leiðir til að byrja.</p>
            </div>
          </div>

          <div className="preset-grid">
            <button
              type="button"
              className={`preset ${preset === "current-12-split" ? "preset-active" : ""}`}
              onClick={() => choosePreset("current-12-split")}
            >
              <strong>12 lið + split</strong>
              <span>Núverandi kerfi · 27 leikir</span>
            </button>
            <button
              type="button"
              className={`preset ${preset === "double-14" ? "preset-active" : ""}`}
              onClick={() => choosePreset("double-14")}
            >
              <strong>14 lið</strong>
              <span>Tvöföld umferð · 26 leikir</span>
            </button>
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
            <Toggle checked={protectFifa} onChange={setProtectFifa} label="Forðast FIFA-glugga" />
            <Toggle checked={showUefa} onChange={setShowUefa} label="Sýna UEFA-áhættu" />
          </div>

          <div className="divider" />

          <button type="button" className="team-settings-button" onClick={() => setTeamsOpen((value) => !value)}>
            <span>
              <b>Stillingar liða</b>
              <small>{activeTeams.length} lið · {unknownVenues} óstaðfest</small>
            </span>
            <span className="chevron">{teamsOpen ? "−" : "+"}</span>
          </button>

          {teamsOpen && (
            <div className="team-editor">
              <div className="team-editor-head">
                <span>Lið / völlur</span><span>Undirlag</span><span>Ljós</span><span>Evrópa</span>
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
                  <button
                    type="button"
                    className={`mini-check ${team.europe ? "mini-check-on" : ""}`}
                    aria-pressed={team.europe}
                    onClick={() => updateTeam(team.id, { europe: !team.europe })}
                  >
                    {team.europe ? "✓" : ""}
                  </button>
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
                <h2>{preset === "double-14" ? "14 liða deild" : "Núverandi split-kerfi"}</h2>
              </div>
              <div className={`fit-badge ${calendar.shortfall ? "fit-badge-bad" : ""}`}>
                <span className="dot" />
                {calendar.shortfall ? `Vantar ${calendar.shortfall} helgar` : "Passar í gluggann"}
              </div>
            </div>

            <div className="stats">
              <Stat value={metrics.gamesPerTeam} label="leikir á lið" />
              <Stat value={metrics.totalGames} label="leikir alls" />
              <Stat value={metrics.homeRange} label="heima / úti" />
              <Stat value={metrics.rounds} label="umferðir" />
            </div>

            <div className="signal-row">
              <div><span className="signal-number">{grassTeams}</span><span>lið á grasi</span></div>
              <div><span className="signal-number">{noLights}</span><span>án flóðljósa</span></div>
              <div><span className="signal-number">{europeTeams}</span><span>merkt í Evrópu</span></div>
              <div><span className="signal-number">{unknownVenues}</span><span>vallargögn óstaðfest</span></div>
            </div>
          </div>

          <div className="panel calendar-panel">
            <div className="panel-title-row">
              <div>
                <div className="eyebrow">Dagatal 2026</div>
                <h2>Hvar þrengir að?</h2>
              </div>
              <span className="quiet">{calendar.rounds.length}/{metrics.rounds} helgar fundnar</span>
            </div>

            <div className="month-line" aria-hidden="true">
              {["APR", "MAÍ", "JÚN", "JÚL", "ÁGÚ", "SEP", "OKT"].map((month) => <span key={month}>{month}</span>)}
            </div>
            <div className="timeline">
              <div className="timeline-season" />
              <div className="timeline-block block-worldcup" title="HM 2026">HM</div>
              {showUefa && <div className="timeline-block block-uefa" title="UEFA undankeppnir">UEFA</div>}
              {protectFifa && <div className="timeline-block block-fifa-autumn" title="FIFA landsleikjagluggi">FIFA</div>}
            </div>

            <div className="calendar-notes">
              {calendar2026.filter((block) => block.start >= "2026-04-01" && block.end <= "2026-10-31").map((block) => (
                <div key={block.id} className={`calendar-note note-${block.kind}`}>
                  <div>
                    <strong>{block.label}</strong>
                    <span>{dateSpan(block.start, block.end)}</span>
                  </div>
                  <p>{block.note}</p>
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
              {roundDate && calendar2026.some((block) => block.kind === "uefa" && roundDate.date >= block.start && roundDate.date <= block.end) && showUefa && (
                <span className="pill pill-warn">UEFA-viðkvæmt</span>
              )}
            </div>

            {round?.stage === "split" ? (
              <div className="split-placeholder">
                <strong>Þessi umferð ræðst af stöðunni eftir 22 leiki.</strong>
                <span>Hermirinn býr ekki til falska mótherja áður en efri og neðri hluti liggja fyrir.</span>
              </div>
            ) : (
              <div className="fixtures">
                {round?.pairings.map((pair) => (
                  <div className="fixture" key={`${round.number}-${pair.home}-${pair.away}`}>
                    <span>{names[pair.home]}</span>
                    <b>–</b>
                    <span>{names[pair.away]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rule-strip">
            <div><span className="rule-dot hard" /><b>Hard rule</b><span>má ekki brjóta</span></div>
            <div><span className="rule-dot soft" /><b>Viðvörun</b><span>má leysa með ákvörðun</span></div>
            <div><span className="rule-dot info" /><b>Upplýsing</b><span>hefur áhrif á sviðsmynd</span></div>
          </div>
        </section>
      </div>

      <footer>
        <span>Tilraunaverkefni · ekki opinber leikjaskrá KSÍ</span>
        <span>Byggt sem léttur Mótamiðju-hermir</span>
      </footer>
    </main>
  );
}
