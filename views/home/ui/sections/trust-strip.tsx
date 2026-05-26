import { getTranslations } from "next-intl/server";
import { getSiteSettingsServer } from "@/shared/lib/site-settings-server";
import { Stamp } from "@/shared/ui/stamp";
import { Counter } from "@/shared/ui/counter";
import { QrTile } from "@/shared/ui/qr-tile";

// Placeholder QR matrix — 21×21 visual stand-in until the real encoder
// lands in a follow-up. The shape, corners, and density read as a QR.
// TODO(next-wave-data): replace with a real QR encoded from the
// configured telegram deep-link via `qrcode` at request time (or
// compile time once the URL is build-stable).
function placeholderMatrix(size = 21): boolean[][] {
  const rows: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c++) {
      const corner =
        (r < 7 && c < 7) ||
        (r < 7 && c >= size - 7) ||
        (r >= size - 7 && c < 7);
      if (corner) {
        const ringR = r < 7 ? r : size - 1 - r;
        const ringC = c < 7 ? c : size - 1 - c;
        const onEdge =
          ringR === 0 || ringR === 6 || ringC === 0 || ringC === 6;
        const inCore = ringR >= 2 && ringR <= 4 && ringC >= 2 && ringC <= 4;
        row.push(onEdge || inCore);
      } else {
        row.push(((r * 17 + c * 31 + r * c) & 3) === 0);
      }
    }
    rows.push(row);
  }
  return rows;
}

/**
 * §5.4 — quiet evidence row between master-strip and gallery-strip.
 * Hairlines, no shadows; the visual job is "this is real" not "buy now".
 */
export async function TrustStrip() {
  const t = await getTranslations("Home");
  const settings = await getSiteSettingsServer();

  const telegramHref = settings.telegramUsername
    ? `https://t.me/${settings.telegramUsername}`
    : "https://t.me/violetta";

  return (
    <section
      aria-label={t("trust_strip_eyebrow")}
      className="px-[22px] py-10"
    >
      <div className="scroll-x flex gap-6 overflow-x-auto sm:grid sm:grid-cols-5 sm:gap-4 sm:overflow-visible">
        <div className="flex shrink-0 flex-col items-center gap-1.5 sm:items-start">
          <Stamp size="md">{t("trust_strip_eyebrow")}</Stamp>
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-text-3">
            {t("trust_strip_years", { n: 11 })}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1.5 sm:items-start">
          <span className="font-display italic text-4xl text-gold">
            <Counter value={612} />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-text-3">
            {t("trust_strip_sets", { n: 612 })}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1.5 sm:items-start">
          <Stamp size="md">SINGLE · CHAIR</Stamp>
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-text-3">
            {t("trust_strip_chair")}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1.5 sm:items-start">
          <span className="font-display italic text-4xl text-text">4.96 ★</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-text-3">
            {t("trust_strip_rating", { score: "4.96", n: 142 })}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-2 sm:items-start">
          <QrTile
            matrix={placeholderMatrix()}
            href={telegramHref}
            size={120}
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-text-3">
            {t("trust_strip_telegram_eyebrow")}
          </span>
        </div>
      </div>
    </section>
  );
}
