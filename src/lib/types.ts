export type Surface = "grass" | "artificial" | "unknown";

export type Team = {
  id: string;
  name: string;
  venue: string;
  surface: Surface;
  floodlights: boolean | null;
  europe: boolean;
};

export type FormatPreset = "current-12-split" | "double-14";

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
  hard: boolean;
  note: string;
};

export type SimulatorSettings = {
  preset: FormatPreset;
  seasonStart: string;
  seasonEnd: string;
  protectFifaWindows: boolean;
  showUefaSensitivity: boolean;
  preferWeekends: boolean;
};
