import type { EuropePath } from "@/lib/types";

export type UefaTemplateSlot = {
  id: string;
  path: Exclude<EuropePath, "none">;
  phase: "qualifying" | "league";
  label: string;
  sourceDate: string;
  projectedDate: string;
  note: string;
};

export const uefaTemplateSource = {
  label: "UEFA · 2026 European football calendar",
  url: "https://www.uefa.com/news-media/news/02a0-1f71bdf70a9a-b6067bd647f2-1000--2026-european-football-calendar-match-and-draw-dates-for-a/",
};

// 2026 leikjadagatalið er notað sem hermisniðmát fyrir 2027. Dagarnir eru
// færðir um 364 daga svo vikudagarnir og staðsetning vikna haldist sambærileg.
// Þetta eru EKKI staðfestir UEFA-leikdagar 2027/28.
export const uefaTemplate2027: UefaTemplateSlot[] = [
  { id: "ucl-q1-1", path: "champions", phase: "qualifying", label: "UCL Q1 · fyrri", sourceDate: "2026-07-08", projectedDate: "2027-07-07", note: "2026 sniðmát · miðvikudagur úr 7/8 júlí glugga" },
  { id: "ucl-q1-2", path: "champions", phase: "qualifying", label: "UCL Q1 · seinni", sourceDate: "2026-07-15", projectedDate: "2027-07-14", note: "2026 sniðmát · miðvikudagur úr 14/15 júlí glugga" },
  { id: "ucl-q2-1", path: "champions", phase: "qualifying", label: "UCL Q2 · fyrri", sourceDate: "2026-07-22", projectedDate: "2027-07-21", note: "2026 sniðmát · miðvikudagur úr 21/22 júlí glugga" },
  { id: "ucl-q2-2", path: "champions", phase: "qualifying", label: "UCL Q2 · seinni", sourceDate: "2026-07-29", projectedDate: "2027-07-28", note: "2026 sniðmát · miðvikudagur úr 28/29 júlí glugga" },
  { id: "ucl-q3-1", path: "champions", phase: "qualifying", label: "UCL Q3 · fyrri", sourceDate: "2026-08-05", projectedDate: "2027-08-04", note: "2026 sniðmát · miðvikudagur úr 4/5 ágúst glugga" },
  { id: "ucl-q3-2", path: "champions", phase: "qualifying", label: "UCL Q3 · seinni", sourceDate: "2026-08-11", projectedDate: "2027-08-10", note: "2026 sniðmát · leikdagur 11. ágúst" },
  { id: "ucl-po-1", path: "champions", phase: "qualifying", label: "UCL umspil · fyrri", sourceDate: "2026-08-19", projectedDate: "2027-08-18", note: "2026 sniðmát · miðvikudagur úr 18/19 ágúst glugga" },
  { id: "ucl-po-2", path: "champions", phase: "qualifying", label: "UCL umspil · seinni", sourceDate: "2026-08-26", projectedDate: "2027-08-25", note: "2026 sniðmát · miðvikudagur úr 25/26 ágúst glugga" },
  { id: "ucl-md1", path: "champions", phase: "league", label: "UCL deild · 1", sourceDate: "2026-09-09", projectedDate: "2027-09-08", note: "2026 sniðmát · fulltrúadagur úr 8–10 september glugga" },
  { id: "ucl-md2", path: "champions", phase: "league", label: "UCL deild · 2", sourceDate: "2026-10-14", projectedDate: "2027-10-13", note: "2026 sniðmát · miðvikudagur úr 13/14 október glugga" },
  { id: "ucl-md3", path: "champions", phase: "league", label: "UCL deild · 3", sourceDate: "2026-10-21", projectedDate: "2027-10-20", note: "2026 sniðmát · miðvikudagur úr 20/21 október glugga" },
  { id: "ucl-md4", path: "champions", phase: "league", label: "UCL deild · 4", sourceDate: "2026-11-04", projectedDate: "2027-11-03", note: "2026 sniðmát · miðvikudagur úr 3/4 nóvember glugga" },
  { id: "ucl-md5", path: "champions", phase: "league", label: "UCL deild · 5", sourceDate: "2026-11-25", projectedDate: "2027-11-24", note: "2026 sniðmát · miðvikudagur úr 24/25 nóvember glugga" },
  { id: "ucl-md6", path: "champions", phase: "league", label: "UCL deild · 6", sourceDate: "2026-12-09", projectedDate: "2027-12-08", note: "2026 sniðmát · miðvikudagur úr 8/9 desember glugga" },

  { id: "uecl-q1-1", path: "conference", phase: "qualifying", label: "UECL Q1 · fyrri", sourceDate: "2026-07-09", projectedDate: "2027-07-08", note: "2026 sniðmát · fimmtudagur úr 7–9 júlí glugga" },
  { id: "uecl-q1-2", path: "conference", phase: "qualifying", label: "UECL Q1 · seinni", sourceDate: "2026-07-16", projectedDate: "2027-07-15", note: "2026 sniðmát · fimmtudagur úr 14–16 júlí glugga" },
  { id: "uecl-q2-1", path: "conference", phase: "qualifying", label: "UECL Q2 · fyrri", sourceDate: "2026-07-23", projectedDate: "2027-07-22", note: "2026 sniðmát · fimmtudagur úr 21–23 júlí glugga" },
  { id: "uecl-q2-2", path: "conference", phase: "qualifying", label: "UECL Q2 · seinni", sourceDate: "2026-07-30", projectedDate: "2027-07-29", note: "2026 sniðmát · fimmtudagur úr 28–30 júlí glugga" },
  { id: "uecl-q3-1", path: "conference", phase: "qualifying", label: "UECL Q3 · fyrri", sourceDate: "2026-08-06", projectedDate: "2027-08-05", note: "2026 sniðmát · 6. ágúst" },
  { id: "uecl-q3-2", path: "conference", phase: "qualifying", label: "UECL Q3 · seinni", sourceDate: "2026-08-13", projectedDate: "2027-08-12", note: "2026 sniðmát · 13. ágúst" },
  { id: "uecl-po-1", path: "conference", phase: "qualifying", label: "UECL umspil · fyrri", sourceDate: "2026-08-20", projectedDate: "2027-08-19", note: "2026 sniðmát · 20. ágúst" },
  { id: "uecl-po-2", path: "conference", phase: "qualifying", label: "UECL umspil · seinni", sourceDate: "2026-08-27", projectedDate: "2027-08-26", note: "2026 sniðmát · 27. ágúst" },
  { id: "uecl-md1", path: "conference", phase: "league", label: "UECL deild · 1", sourceDate: "2026-10-15", projectedDate: "2027-10-14", note: "2026 sniðmát · 15. október" },
  { id: "uecl-md2", path: "conference", phase: "league", label: "UECL deild · 2", sourceDate: "2026-10-22", projectedDate: "2027-10-21", note: "2026 sniðmát · 22. október" },
  { id: "uecl-md3", path: "conference", phase: "league", label: "UECL deild · 3", sourceDate: "2026-11-05", projectedDate: "2027-11-04", note: "2026 sniðmát · 5. nóvember" },
  { id: "uecl-md4", path: "conference", phase: "league", label: "UECL deild · 4", sourceDate: "2026-11-26", projectedDate: "2027-11-25", note: "2026 sniðmát · 26. nóvember" },
  { id: "uecl-md5", path: "conference", phase: "league", label: "UECL deild · 5", sourceDate: "2026-12-10", projectedDate: "2027-12-09", note: "2026 sniðmát · 10. desember" },
  { id: "uecl-md6", path: "conference", phase: "league", label: "UECL deild · 6", sourceDate: "2026-12-17", projectedDate: "2027-12-16", note: "2026 sniðmát · 17. desember" },
];

export function uefaTemplateForPath(path: EuropePath) {
  if (path === "none") return [];
  return uefaTemplate2027.filter((slot) => slot.path === path);
}
