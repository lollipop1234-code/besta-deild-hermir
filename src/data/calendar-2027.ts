import type { CalendarBlock } from "@/lib/types";

// FIFA windows are fixed by the Men's International Match Calendar 2025–2030.
// UEFA 2027/28 club dates have not been published in full as of 24 Sep 2026.
// Those ranges are therefore deliberately PROVISIONAL and are never treated as
// a hard legal constraint until UEFA publishes the exact calendar.
export const calendar2027: CalendarBlock[] = [
  {
    id: "fifa-mar-2027",
    label: "Landsleikjagluggi",
    start: "2027-03-22",
    end: "2027-03-30",
    kind: "fifa",
    hard: true,
    confidence: "official",
    note: "FIFA international match window, allt að 2 landsleikir.",
  },
  {
    id: "fifa-june-2027",
    label: "Landsleikjagluggi",
    start: "2027-06-07",
    end: "2027-06-15",
    kind: "fifa",
    hard: true,
    confidence: "official",
    note: "FIFA international match window, allt að 2 landsleikir.",
  },
  {
    id: "uefa-qualifying-2027",
    label: "Evrópu-undankeppnir",
    start: "2027-07-05",
    end: "2027-08-29",
    kind: "uefa",
    hard: false,
    confidence: "provisional",
    note: "Vinnugluggi fyrir UCL/UEL/UECL Q1–play-off. Nákvæmir 2027/28 leikdagar eru ekki birtir enn og verða uppfærðir þegar UEFA staðfestir þá.",
  },
  {
    id: "uefa-league-phase-autumn-2027",
    label: "Möguleg deildarkeppni UEFA",
    start: "2027-09-01",
    end: "2027-12-23",
    kind: "uefa",
    hard: false,
    confidence: "provisional",
    note: "Íslenskt lið sem kemst í deildarkeppni getur átt reglulega Evrópuleiki um haustið. Þetta er sviðsmynd, ekki lokað UEFA-dagatal.",
  },
  {
    id: "fifa-autumn-2027",
    label: "Landsleikjagluggi",
    start: "2027-09-20",
    end: "2027-10-05",
    kind: "fifa",
    hard: true,
    confidence: "official",
    note: "16 daga FIFA-gluggi, allt að 4 landsleikir.",
  },
  {
    id: "fifa-nov-2027",
    label: "Landsleikjagluggi",
    start: "2027-11-08",
    end: "2027-11-16",
    kind: "fifa",
    hard: true,
    confidence: "official",
    note: "FIFA international match window, allt að 2 landsleikir.",
  },
];
