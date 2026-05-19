import { useTranslations } from "next-intl";

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

export function AnnouncementCapsule() {
  const t = useTranslations("Home");
  return (
    <div className="relative mx-[22px] flex items-center gap-4 overflow-hidden rounded-[18px] border-[0.5px] border-line-strong bg-surface px-[22px] py-[18px]">
      <span
        aria-hidden
        className="absolute bottom-0 left-0 top-0 w-[3px] bg-gold"
      />
      <div className="min-w-0 flex-1">
        <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-accent">
          {t("capsule_eyebrow")}
        </span>
        <div className="mt-1 font-display text-[19px] italic">
          {t("capsule_title")}
        </div>
      </div>
      <ArrowRight />
    </div>
  );
}
