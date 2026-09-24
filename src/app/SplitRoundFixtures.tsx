import { splitPreviewForRound } from "@/lib/split-fixtures";
import type { FormatPreset } from "@/lib/types";

import styles from "./SplitRoundFixtures.module.css";

function seedLabel(seed: number) {
  return `${seed}. sæti`;
}

export default function SplitRoundFixtures({ preset, roundNumber }: { preset: FormatPreset; roundNumber: number }) {
  const preview = splitPreviewForRound(preset, roundNumber);
  if (!preview) return null;

  const upper = preview.fixtures.filter((fixture) => fixture.group === "upper");
  const lower = preview.fixtures.filter((fixture) => fixture.group === "lower");
  const upperBye = preview.byes.find((bye) => bye.group === "upper");
  const lowerBye = preview.byes.find((bye) => bye.group === "lower");
  const splitAfter = preset === "ten-split" ? 18 : 22;

  return (
    <div className={styles.wrap}>
      <div className={styles.note}>
        <strong>Split {preview.splitRound}</strong>
        <span>Liðin koma inn hér eftir stöðu að loknum {splitAfter} leikjum. Sætin sýna leikjauppbygginguna, ekki spá um hvaða lið enda þar.</span>
      </div>

      <div className={styles.groups}>
        <section>
          <div className={styles.groupHead}><b>Efri hluti</b>{upperBye && <span>{seedLabel(upperBye.seed)} á frí</span>}</div>
          <div className={styles.games}>
            {upper.map((fixture) => (
              <div className={styles.game} key={`upper-${fixture.homeSeed}-${fixture.awaySeed}`}>
                <strong>{seedLabel(fixture.homeSeed)}</strong><span>–</span><strong>{seedLabel(fixture.awaySeed)}</strong>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className={styles.groupHead}><b>Neðri hluti</b>{lowerBye && <span>{seedLabel(lowerBye.seed)} á frí</span>}</div>
          <div className={styles.games}>
            {lower.map((fixture) => (
              <div className={styles.game} key={`lower-${fixture.homeSeed}-${fixture.awaySeed}`}>
                <strong>{seedLabel(fixture.homeSeed)}</strong><span>–</span><strong>{seedLabel(fixture.awaySeed)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
