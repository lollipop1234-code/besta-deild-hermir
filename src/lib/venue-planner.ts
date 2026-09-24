import type { Round, Team } from "./types";
import type { PairingRound } from "./simulator";

export type KickoffPreference = "afternoon" | "evening";

export type KickoffPlan = {
  time: string;
  adjusted: boolean;
  note?: string;
  dataGap?: boolean;
};

export function kickoffForHomeTeam(
  home: Team | undefined,
  preference: KickoffPreference,
): KickoffPlan {
  if (preference === "afternoon") {
    return { time: "15:00", adjusted: false };
  }

  if (!home) {
    return { time: "19:15", adjusted: false, dataGap: true, note: "Heimalið óþekkt" };
  }

  if (home.floodlights === false) {
    return {
      time: "15:00",
      adjusted: true,
      note: "Fært úr kvöldslot vegna þess að liðið er merkt án flóðljósa.",
    };
  }

  if (home.floodlights === null) {
    return {
      time: "19:15",
      adjusted: false,
      dataGap: true,
      note: "Flóðljós á heimavelli eru óstaðfest.",
    };
  }

  return { time: "19:15", adjusted: false };
}

function isShoulderMonth(date: string | undefined) {
  if (!date) return false;
  const month = Number(date.slice(5, 7));
  return month === 4 || month === 10;
}

function pairKey(a: string, b: string) {
  return [a, b].sort().join("::");
}

export function applyGrassHomePreference(
  rounds: PairingRound[],
  roundDates: Round[],
  teams: Team[],
  enabled: boolean,
): { rounds: PairingRound[]; swaps: number } {
  const cloned = rounds.map((round) => ({
    ...round,
    pairings: round.pairings.map((pair) => ({ ...pair })),
  }));

  if (!enabled) return { rounds: cloned, swaps: 0 };

  const teamById = new Map(teams.map((team) => [team.id, team]));
  const dateByRound = new Map(roundDates.map((round) => [round.number, round.date]));
  const meetings = new Map<string, Array<{ roundIndex: number; pairingIndex: number }>>();

  cloned.forEach((round, roundIndex) => {
    if (round.stage !== "regular") return;
    round.pairings.forEach((pair, pairingIndex) => {
      const key = pairKey(pair.home, pair.away);
      const list = meetings.get(key) ?? [];
      list.push({ roundIndex, pairingIndex });
      meetings.set(key, list);
    });
  });

  let swaps = 0;

  for (const refs of meetings.values()) {
    let badShoulderRef: { roundIndex: number; pairingIndex: number } | undefined;
    let goodSwapRef: { roundIndex: number; pairingIndex: number } | undefined;

    for (const ref of refs) {
      const round = cloned[ref.roundIndex]!;
      const pair = round.pairings[ref.pairingIndex]!;
      const date = dateByRound.get(round.number);
      const home = teamById.get(pair.home);
      const away = teamById.get(pair.away);
      if (!home || !away) continue;

      const shoulder = isShoulderMonth(date);
      const grassHomeArtificialAway = home.surface === "grass" && away.surface === "artificial";
      const artificialHomeGrassAway = home.surface === "artificial" && away.surface === "grass";

      if (shoulder && grassHomeArtificialAway) badShoulderRef = ref;
      if (!shoulder && artificialHomeGrassAway) goodSwapRef = ref;
    }

    if (!badShoulderRef || !goodSwapRef) continue;

    const shoulderPair = cloned[badShoulderRef.roundIndex]!.pairings[badShoulderRef.pairingIndex]!;
    const laterPair = cloned[goodSwapRef.roundIndex]!.pairings[goodSwapRef.pairingIndex]!;

    [shoulderPair.home, shoulderPair.away] = [shoulderPair.away, shoulderPair.home];
    [laterPair.home, laterPair.away] = [laterPair.away, laterPair.home];
    swaps += 1;
  }

  return { rounds: cloned, swaps };
}

export function grassShoulderWarning(team: Team | undefined, date: string | undefined) {
  return Boolean(team?.surface === "grass" && isShoulderMonth(date));
}
