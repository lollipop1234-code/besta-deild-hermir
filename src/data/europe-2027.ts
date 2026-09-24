import type { EuropePath } from "@/lib/types";

export type EuropePathProfile = {
  id: Exclude<EuropePath, "none">;
  shortLabel: string;
  label: string;
  description: string;
  qualifyingRisk: string;
  autumnRisk: string;
};

export const europePathProfiles: Record<Exclude<EuropePath, "none">, EuropePathProfile> = {
  champions: {
    id: "champions",
    shortLabel: "Meistari",
    label: "Íslandsmeistari – Champions Path",
    description: "Byrjar á meistaraleið Champions League. Við tap getur leiðin færst niður í Europa League eða Conference League.",
    qualifyingRisk: "Mögulegir UEFA-leikir frá júlí og út ágúst, eftir því hversu langt liðið fer og hvar það dettur niður.",
    autumnRisk: "Ef liðið nær deildarkeppni þarf að gera ráð fyrir UEFA-leikjum áfram um haustið. Leiðin getur endað í UCL, UEL eða UECL.",
  },
  conference: {
    id: "conference",
    shortLabel: "UECL",
    label: "Evrópusæti – Conference League leið",
    description: "Lið sem fer í Evrópu utan meistaraleiðarinnar. Nákvæm innkoma í undankeppni ræðst af aðgangslista UEFA fyrir 2027/28.",
    qualifyingRisk: "Mögulegir UEFA-leikir í júlí og ágúst þar til liðið fellur úr leik eða kemst í deildarkeppni.",
    autumnRisk: "Ef liðið kemst alla leið þarf að gera ráð fyrir Conference League leikjum um haustið.",
  },
};

export function europeLabel(path: EuropePath) {
  if (path === "none") return "Ekki í Evrópu";
  return europePathProfiles[path].shortLabel;
}
