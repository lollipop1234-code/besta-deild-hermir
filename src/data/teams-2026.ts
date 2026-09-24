import type { Team } from "@/lib/types";

// 2027 þátttakendur eru ekki endanlega þekktir enn. Þetta er vinnulisti úr
// Bestu deild 2026 svo hægt sé að prófa fyrirkomulag 2027 strax. Liðin má síðar
// skipta út þegar sæti í deildinni liggja fyrir.
//
// Undirlag, flóðljós og Evrópuleið eru ekki ágiskuð. Notandinn stillir þau í
// herminum þar til við höfum staðfest gögn og valið sviðsmynd.
export const teams2026: Team[] = [
  { id: "vikingur", name: "Víkingur R.", venue: "Víkingsvöllur", surface: "unknown", floodlights: null, europePath: "none" },
  { id: "fram", name: "Fram", venue: "Lambhagavöllurinn", surface: "unknown", floodlights: null, europePath: "none" },
  { id: "kr", name: "KR", venue: "Meistaravellir", surface: "unknown", floodlights: null, europePath: "none" },
  { id: "breidablik", name: "Breiðablik", venue: "Eikarvöllurinn", surface: "unknown", floodlights: null, europePath: "none" },
  { id: "ia", name: "ÍA", venue: "ELKEM völlurinn", surface: "unknown", floodlights: null, europePath: "none" },
  { id: "keflavik", name: "Keflavík", venue: "HS Orku völlurinn", surface: "unknown", floodlights: null, europePath: "none" },
  { id: "stjarnan", name: "Stjarnan", venue: "Miðgarður", surface: "unknown", floodlights: null, europePath: "none" },
  { id: "valur", name: "Valur", venue: "N1-völlurinn Hlíðarenda", surface: "unknown", floodlights: null, europePath: "none" },
  { id: "fh", name: "FH", venue: "Kaplakrikavöllur", surface: "unknown", floodlights: null, europePath: "none" },
  { id: "thor", name: "Þór", venue: "VÍS völlurinn", surface: "unknown", floodlights: null, europePath: "none" },
  { id: "ka", name: "KA", venue: "Greifavöllurinn", surface: "unknown", floodlights: null, europePath: "none" },
  { id: "ibv", name: "ÍBV", venue: "Hásteinsvöllur", surface: "unknown", floodlights: null, europePath: "none" },
];

export const expansionTeams: Team[] = [
  { id: "team-13", name: "Lið 13", venue: "Heimavöllur", surface: "unknown", floodlights: null, europePath: "none" },
  { id: "team-14", name: "Lið 14", venue: "Heimavöllur", surface: "unknown", floodlights: null, europePath: "none" },
];
