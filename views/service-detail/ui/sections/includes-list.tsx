import { useTranslations } from "next-intl";
import { Eyebrow } from "@/shared/ui/eyebrow";

export interface IncludesListProps {
  items: readonly string[];
}

export function IncludesList({ items }: IncludesListProps) {
  const t = useTranslations("ServiceDetail");
  return (
    <section className="px-[22px] py-5">
      <Eyebrow>{t("includes_eyebrow")}</Eyebrow>
      <ul className="m-0 mt-[18px] list-none p-0">
        {items.map((line, i) => (
          <li
            key={`${line}-${i}`}
            className="flex items-center gap-4 border-b-[0.5px] border-line py-4"
          >
            <span className="w-8 shrink-0 font-display text-[18px] italic text-accent">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-[14.5px]">{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
