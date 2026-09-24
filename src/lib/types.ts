export type Surface = "grass" | "artificial" | "unknown";
export type EuropePath = "none" | "champions" | "conference";
export type CalendarConstraint = "blackout" | "avoid" | "info";

export type Team = {
  id: string;
  name: string;
  venue: string;
  surface: Surface;
  floodlights: boolean | null;
  europePath: EuropePath;
};

export type FormatPreset =
  | "ten-triple"
  | "ten-split"
  | "current-12-split"
  | "double-14";

export type Round = {
  number: number;
  date: string;
  label: string;
};

export type CalendarBlock = {
  id: string;
  label: string;
  start: string;
  end: string;
  kind: "fifa" | "uefa" | "cup" | "info";
  constraint: CalendarConstraint;
  confidence: "official" | "provisional";
  note: string;
  sourceLabel?: string;
  sourceUrl?: string;
};

export type EuropeWindow = {
  id: string;
  label: string;
  start: string;
  end: string;
  phase: "qualifying" | "league-phase";
  confidence: "official" | "provisional";
};

export type SimulatorSettings = {
  preset: FormatPreset;
  seasonStart: string;
  seasonEnd: string;
  avoidFifaWindows: boolean;
  showUefaSensitivity: boolean;
  preferWeekends: boolean;
};
