import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Master } from "@/entities/master";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { LetterpressRule } from "@/shared/ui/letterpress-rule";
import { buttonClassName } from "@/shared/ui/button";

function ArrowRight() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export interface MasterAttributionProps {
  master: Master;
  serviceId: string;
}

export function MasterAttribution({
  master,
  serviceId,
}: MasterAttributionProps) {
  const t = useTranslations("ServiceDetail");
  const initial = master.name.trim().charAt(0).toUpperCase();
  return (
    <section className="px-[22px] py-7">
      <Eyebrow>{t("master_eyebrow")}</Eyebrow>
      <LetterpressRule className="mt-3" />
      <div className="gilded glass-top mt-4 flex items-center gap-[18px] rounded-[20px] p-[18px]">
        <span className="relative inline-flex size-[64px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-accent/60 p-[6px]">
          {master.image ? (
            <Image
              src={master.image.src}
              alt={master.image.alt ?? master.name}
              fill
              sizes="64px"
              placeholder={master.image.blurDataURL ? "blur" : undefined}
              blurDataURL={master.image.blurDataURL}
              className="rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="block size-full rounded-full border border-accent/40"
              style={{
                background:
                  "radial-gradient(circle at 35% 30%, #f3ead8 0%, var(--color-accent) 45%, var(--color-plum) 100%)",
              }}
            />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[9px] uppercase tracking-[0.32em] text-accent">
            {master.role}
          </div>
          <div className="mt-1 font-display text-[22px] italic leading-none">
            {master.name}
          </div>
        </div>
      </div>
      <Link
        href={`/booking/service?selected=${encodeURIComponent(serviceId)}`}
        className={buttonClassName({
          variant: "gold",
          size: "md",
          block: true,
          className: "mt-3 gap-2",
        })}
      >
        {t("master_cta", { initial })} <ArrowRight />
      </Link>
    </section>
  );
}
