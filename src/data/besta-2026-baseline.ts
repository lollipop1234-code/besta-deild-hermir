export const besta2026Baseline = {
  label: "Besta 2026",
  seasonStart: "2026-04-10",
  regularEnd: "2026-09-06",
  seasonEnd: "2026-10-24",
  splitWindows: [
    { round: 23, start: "2026-09-13", end: "2026-09-15", label: "Split 1" },
    { round: 24, start: "2026-09-19", end: "2026-09-20", label: "Split 2" },
    { round: 25, start: "2026-10-10", end: "2026-10-11", label: "Split 3" },
    { round: 26, start: "2026-10-17", end: "2026-10-18", label: "Split 4" },
    { round: 27, start: "2026-10-24", end: "2026-10-24", label: "Split 5" },
  ],
  sources: [
    {
      label: "KSÍ · staðfest niðurröðun 2026",
      url: "https://www.ksi.is/um-ksi/frettir/motamal/stadfest-nidurrodun-i-bestu-deildum-karla-og-kvenna/",
    },
    {
      label: "KSÍ · Besta deild karla 2026",
      url: "https://www.ksi.is/oll-mot/mot?banner-tab=matches-and-results&id=7025510&toggle=rounds",
    },
    {
      label: "KSÍ · efri hluti 2026",
      url: "https://www.ksi.is/oll-mot/mot?banner-tab=matches-and-results&id=7025527",
    },
    {
      label: "KSÍ · neðri hluti 2026",
      url: "https://www.ksi.is/oll-mot/mot?banner-tab=matches-and-results&id=7025532",
    },
  ],
} as const;

export function baselineDateIn2027(value: string) {
  return `2027-${value.slice(5)}`;
}
