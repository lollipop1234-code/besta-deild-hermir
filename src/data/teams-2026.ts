import type { Team } from "@/lib/types";

// Lið og heimavellir byggja á leikjaskrá KSÍ 2026.
// Undirlag/flóðljós eru viljandi ekki ágiskuð: notandinn stillir þau í herminum
// þar til við höfum staðfest vallargögn úr heimildum.
export const teams2026: Team[] = [
  { id: "vikingur", name: "Víkingur R.", venue: "Víkingsvöllur", surface: "unknown", floodlights: null },
  { id: "fram", name: "Fram", venue: "Lambhagavöllurinn", surface: "unknown", floodlights: null },
  { id: "kr", name: "KR", venue: "Meistaravellir", surface: "unknown", floodlights: null },
  { id: "breidablik", name: "Breiðablik", venue: "Eikarvöllurinn", surface: "unknown", floodlights: null },
  { id: "ia", name: "ÍA", venue: "ELKEM völlurinn", surface: "unknown", floodlights: null },
  { id: "keflavik", name: "Keflavík", venue: "HS Orku völlurinn", surface: "unknown", floodlights: null },
  { id: "stjarnan", name: "Stjarnan", venue: "Miðgarður", surface: "unknown", floodlights: null },
  { id: "valur", name: "Valur", venue: "N1-völlurinn Hlíðarenda", surface: "unknown", floodlights: null },
  { id: "fh", name: "FH", venue: "Kaplakrikavöllur", surface: "unknown", floodlights: null },
  { id: "thor", name: "Þór", venue: "VÍS völlurinn", surface: "unknown", floodlights: null },
  { id: "ka", name: "KA", venue: "Greifavöllurinn", surface: "unknown", floodlights: null },
  { id: "ibv", name: "ÍBV", venue: "Hásteinsvöllur", surface: "unknown", floodlights: null },
];

export const expansionTeams: Team[] = [
  { id: "team-13", name: "Lið 13", venue: "Heimavöllur", surface: "unknown", floodlights: null },
  { id: "team-14", name: "Lið 14", venue: "Heimavöllur", surface: "unknown", floodlights: null },
];
