export type CupDepth = "none" | "round32" | "round16" | "quarter" | "semi" | "final";

export type CupTemplateRound = {
  id: Exclude<CupDepth, "none">;
  order: number;
  label: string;
  sourceStart: string;
  sourceEnd: string;
  sourceRepresentative: string;
  projectedStart: string;
  projectedEnd: string;
  projectedDate: string;
  note: string;
};

export const mjolkurbikarTemplateSource = {
  label: "KSÍ · Mjólkurbikar karla 2026",
  url: "https://www.ksi.is/oll-mot/mot?id=7059738",
};

// Fyrir 2027 er 2026 niðurröðunin aðeins hermisniðmát. Dagsetningar eru færðar
// um 364 daga til að halda sambærilegum vikudögum. Bestu-deildarliðin komu inn
// í 32-liða úrslit 2026.
export const mjolkurbikarTemplate2027: CupTemplateRound[] = [
  {
    id: "round32",
    order: 1,
    label: "32-liða úrslit",
    sourceStart: "2026-04-02",
    sourceEnd: "2026-04-06",
    sourceRepresentative: "2026-04-04",
    projectedStart: "2027-04-01",
    projectedEnd: "2027-04-05",
    projectedDate: "2027-04-03",
    note: "2026: flest Bestu-liðin léku um páskana 2.–6. apríl. 3. apríl 2027 er notaður sem fulltrúadagur.",
  },
  {
    id: "round16",
    order: 2,
    label: "16-liða úrslit",
    sourceStart: "2026-05-13",
    sourceEnd: "2026-05-14",
    sourceRepresentative: "2026-05-13",
    projectedStart: "2027-05-12",
    projectedEnd: "2027-05-13",
    projectedDate: "2027-05-12",
    note: "2026 leikirnir fóru fram 13.–14. maí.",
  },
  {
    id: "quarter",
    order: 3,
    label: "8-liða úrslit",
    sourceStart: "2026-06-10",
    sourceEnd: "2026-06-13",
    sourceRepresentative: "2026-06-10",
    projectedStart: "2027-06-09",
    projectedEnd: "2027-06-12",
    projectedDate: "2027-06-09",
    note: "2026 leikirnir dreifðust 10.–13. júní.",
  },
  {
    id: "semi",
    order: 4,
    label: "Undanúrslit",
    sourceStart: "2026-06-28",
    sourceEnd: "2026-07-21",
    sourceRepresentative: "2026-07-21",
    projectedStart: "2027-06-27",
    projectedEnd: "2027-07-20",
    projectedDate: "2027-07-20",
    note: "Undanúrslitin 2026 voru leikin 28. júní og 21. júlí. Hermirinn notar seinni daginn sem stress-próf þegar lið er sett alla leið í undanúrslit.",
  },
  {
    id: "final",
    order: 5,
    label: "Úrslitaleikur",
    sourceStart: "2026-09-11",
    sourceEnd: "2026-09-11",
    sourceRepresentative: "2026-09-11",
    projectedStart: "2027-09-10",
    projectedEnd: "2027-09-10",
    projectedDate: "2027-09-10",
    note: "Úrslitaleikur karla fór fram 11. september 2026 á Laugardalsvelli.",
  },
];

export const cupDepthOrder: Record<CupDepth, number> = {
  none: 0,
  round32: 1,
  round16: 2,
  quarter: 3,
  semi: 4,
  final: 5,
};

export function cupTemplateForDepth(depth: CupDepth) {
  const maxOrder = cupDepthOrder[depth];
  return mjolkurbikarTemplate2027.filter((round) => round.order <= maxOrder);
}
