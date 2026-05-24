import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppHeader } from "@/widgets/app-header";
import { SpotlightCard } from "@/shared/ui/spotlight-card";
import type { Master } from "@/entities/master";

export interface MastersListPageProps {
  masters: readonly Master[];
}

export async function MastersListPage({ masters }: MastersListPageProps) {
  const t = await getTranslations("Master");
  return (
    <div className="pb-10">
      <AppHeader back="/home" title={t("plate_title")} />
      <section className="px-[22px] py-6">
        <h1 className="mb-4 font-display text-[40px] font-light italic leading-[1.05] tracking-[-0.02em]">
          {t("plate_title")}
        </h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {masters.map((m) => (
            <Link key={m.id} href={`/master/${m.id}`}>
              <SpotlightCard className="overflow-hidden rounded-[20px]">
                {m.image ? (
                  <Image
                    src={m.image.src}
                    alt={m.image.alt ?? m.name}
                    width={400}
                    height={480}
                    sizes="(max-width: 420px) 100vw, 420px"
                    className="aspect-[1/1.2] w-full object-cover"
                  />
                ) : (
                  <div
                    aria-hidden
                    className="aspect-[1/1.2] w-full bg-surface"
                  />
                )}
                <div className="p-4">
                  <h2 className="font-display text-[22px] italic">{m.name}</h2>
                  <p className="text-[12px] text-text-2">{m.role}</p>
                </div>
              </SpotlightCard>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
