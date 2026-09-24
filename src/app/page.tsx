"use client";

import { useMemo, useState } from "react";

import { calendar2027 } from "@/data/calendar-2027";
import { europePathProfiles } from "@/data/europe-2027";
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

function inRange(value: string, start: string, end: string) {
  return value >= start && value <= end;
}

export default function Home() {
  const [preset, setPreset] = useState<FormatPreset>("current-12-split");
  const [seasonStart, setSeasonStart] = useState("2027-04-10");
  const [seasonEnd, setSeasonEnd] = useState("2027-10-23");
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
    () => buildRoundDates(preset, seasonStart, seasonEnd, calendar2027, protectFifa),
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
  const europeTeams = activeTeams.filter((team) => team.europePath !== "none");
  const championsTeams = activeTeams.filter((team) => team.europePath === "champions");
  const conferenceTeams = activeTeams.filter((team) => team.europePath === "conference");
  const grassTeams = activeTeams.filter((team) => team.surface === "grass").length;
  const noLights = activeTeams.filter((team) => team.floodlights === false).length;

  const uefaWindow = roundDate
    ? calendar2027.find((block) => block.kind === "uefa" && inRange(roundDate.date, block.start, block.end))
    : undefined;
  const roundEuropeTeams = round?.pairings
    .flatMap((pair) => [pair.home, pair.away])
    .filter((id, index, all) => all.indexOf(id) === index)
    .map((id) => activeTeams.find((team) => team.id === id))
    .filter((team): team is Team => Boolean(team && team.europePath !== "none")) ?? [];

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
          <div className="eyebrow">Mótamiðja · 2027 hermir</div>
          <h1>Besta deildin, en þú ræður.</h1>
        </div>
        <span className="year-chip">2027</span>
      </header>

      <section className="intro">
        <p>
          Prófaðu fyrirkomulag Bestu deildarinnar 2027. Hermirinn heldur utan um landsleikjahlé, mögulegt Evrópuálag og grunnforsendur heimavalla.
        </p>
        <p className="data-note">Liðalistinn er vinnulisti úr 2026 þar til þátttakendur 2027 liggja endanlega fyrir.</p>
      </section>

      <div className="workspace">
        <aside className="panel controls">
          <div className="section-heading">
            <span className="step">1</span>
            <div>
              <h2>Veldu mót</h2>
              <p>Byrjum einfalt.</p>
            </div>
          </div>

          <div className="preset-grid">
            <button
              type="button"
              className={`preset ${preset === "current-12-split" ? "preset-active" : ""}`}
              onClick={() => choosePreset("current-12-split")}
            >
              <strong>12 lið + split</strong>
              <span>27 leikir á lið</span>
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
            <Toggle checked={showUefa} onChange={setShowUefa} label="Sýna mögulegt Evrópuálag" />
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
                <h2>{preset === "double-14" ? "14 liða deild" : "12 lið + split"}</h2>
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
              <div><span className="signal-number">{europeTeams.length}</span><span>lið í Evrópusviðsmynd</span></div>
              <div><span className="signal-number">{unknownVenues}</span><span>vallargögn óstaðfest</span></div>
            </div>
          </div>

          <div className="panel europe-panel">
            <div className="panel-title-row">
              <div>
                <div className="eyebrow">Evrópa 2027</div>
                <h2>Ekki bara júlí og ágúst</h2>
              </div>
              <span className="quiet">{championsTeams.length} meistaraleið · {conferenceTeams.length} UECL-leið</span>
            </div>

            {europeTeams.length === 0 ? (
              <p className="empty-copy">Veldu Evrópuleið hjá liðum undir „Stillingar liða“. Þá sér hermirinn hvaða umferðir geta orðið viðkvæmar.</p>
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
              <span>Hermirinn sýnir því mögulegt álag en notar það ekki sem harða reglu fyrr en UEFA hefur staðfest leikdagana.</span>
            </div>
          </div>

          <div className="panel calendar-panel">
            <div className="panel-title-row">
              <div>
                <div className="eyebrow">Dagatal 2027</div>
                <h2>Hvar þrengir að?</h2>
              </div>
              <span className="quiet">{calendar.rounds.length}/{metrics.rounds} helgar fundnar</span>
            </div>

            <div className="month-line" aria-hidden="true">
              {["APR", "MAÍ", "JÚN", "JÚL", "ÁGÚ", "SEP", "OKT"].map((month) => <span key={month}>{month}</span>)}
            </div>
            <div className="timeline">
              <div className="timeline-season" />
              <div className="timeline-block block-fifa-june" title="FIFA landsleikjagluggi">FIFA</div>
              {showUefa && <div className="timeline-block block-uefa" title="Mögulegar UEFA-undankeppnir">UEFA</div>}
              {protectFifa && <div className="timeline-block block-fifa-autumn" title="FIFA landsleikjagluggi">FIFA</div>}
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
                  </small>
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
            </div>

            {round?.stage === "split" ? (
              <div className="split-placeholder">
                <strong>Þessi umferð ræðst af stöðunni eftir 22 leiki.</strong>
                <span>Hermirinn býr ekki til falska mótherja áður en efri og neðri hluti liggja fyrir.</span>
              </div>
            ) : (
              <div className="fixtures">
                {round?.pairings.map((pair) => {
                  const home = activeTeams.find((team) => team.id === pair.home);
                  const away = activeTeams.find((team) => team.id === pair.away);
                  const europeSensitive = Boolean(showUefa && uefaWindow && (home?.europePath !== "none" || away?.europePath !== "none"));
                  return (
                    <div className={`fixture ${europeSensitive ? "fixture-europe" : ""}`} key={`${round.number}-${pair.home}-${pair.away}`}>
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
            <div><span className="rule-dot hard" /><b>Staðfest regla</b><span>má ekki brjóta</span></div>
            <div><span className="rule-dot soft" /><b>Álagsviðvörun</b><span>þarf að leysa í niðurröðun</span></div>
            <div><span className="rule-dot info" /><b>Óstaðfest dagsetning</b><span>ekki notuð sem harð regla</span></div>
          </div>
        </section>
      </div>

      <footer>
        <span>Tilraunaverkefni · ekki opinber leikjaskrá KSÍ</span>
        <span>2027 dagatal · uppfærist þegar KSÍ og UEFA birta fleiri staðfestar dagsetningar</span>
      </footer>
    </main>
  );
}
