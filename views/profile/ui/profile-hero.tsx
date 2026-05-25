import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Aurora } from "@/shared/ui/aurora";
import { PaperGrain } from "@/shared/ui/paper-grain";
import { VipBadge } from "@/shared/ui/vip-badge";
import { getCurrentTier } from "@/db/vip-requests";
import type { User } from "@/db/schema";
import { getCachedProfileWithPhoto } from "../api/loaders";

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("");
}

export async function ProfileHero({ user }: { user: User }) {
  const [t, profile, tier] = await Promise.all([
    getTranslations("Profile"),
    getCachedProfileWithPhoto(),
    getCurrentTier(user.id),
  ]);

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    profile.name;
  const joinedYear = user.createdAt
    ? new Date(user.createdAt).getUTCFullYear()
    : new Date().getUTCFullYear();

  return (
    <section className="relative overflow-hidden px-[22px] pt-4 pb-7">
      <Aurora intensity="subtle" />
      <PaperGrain />
      <div className="relative z-10 flex items-center gap-4">
        {profile.avatar ? (
          <div className="gilded glass-top relative size-[68px] overflow-hidden rounded-full">
            <Image
              src={profile.avatar.src}
              alt={profile.avatar.alt ?? displayName}
              fill
              sizes="68px"
              placeholder={profile.avatar.blurDataURL ? "blur" : undefined}
              blurDataURL={profile.avatar.blurDataURL}
              className="object-cover"
            />
          </div>
        ) : (
          <div
            aria-hidden
            className="gilded glass-top grid size-[68px] place-items-center rounded-full font-display text-[24px] italic text-bg"
            style={{
              background: `linear-gradient(135deg, ${profile.palette[0]}, ${profile.palette[1]})`,
            }}
          >
            {initialsOf(displayName)}
          </div>
        )}
        <div>
          {tier.state === "vip" && <VipBadge label={t("badge_vip")} />}
          {tier.state === "member-pending" && (
            <span className="rounded-full border-[0.5px] border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-text-2">
              {t("badge_pending_vip")}
            </span>
          )}
          <h1 className="mt-1.5 font-display text-[40px] font-light italic leading-none tracking-[-0.025em]">
            {displayName}
          </h1>
          <p className="mt-1.5 text-[12px] text-text-3">
            {t("joined", { year: joinedYear.toString() })}
          </p>
        </div>
      </div>
    </section>
  );
}
