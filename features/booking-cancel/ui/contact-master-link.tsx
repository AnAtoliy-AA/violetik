import { useTranslations } from "next-intl";

export interface ContactMasterLinkProps {
  masterName: string;
  masterTelegram: string | null;
  studioTelegram: string | null;
  className?: string;
}

function normalizeUsername(raw: string): string {
  return raw.startsWith("@") ? raw.slice(1) : raw;
}

export function ContactMasterLink({
  masterName,
  masterTelegram,
  studioTelegram,
  className,
}: ContactMasterLinkProps) {
  const t = useTranslations("Profile");

  const username = masterTelegram ?? studioTelegram;
  if (!username) {
    return (
      <p className={className} role="note">
        {t("contact_offline_cta")}
      </p>
    );
  }

  const href = `https://t.me/${normalizeUsername(username)}`;
  const label = masterTelegram
    ? t("contact_master_cta", { name: masterName })
    : t("contact_studio_cta");

  return (
    <a
      href={href}
      rel="noreferrer noopener"
      target="_blank"
      className={className}
    >
      {label}
    </a>
  );
}
