import type { Service } from "@/entities/studio";

export interface DetailDescriptionProps {
  service: Service;
}

export function DetailDescription({ service }: DetailDescriptionProps) {
  return (
    <section className="px-[22px] pb-5 pt-9">
      <p className="dropcap m-0 text-[16px] leading-[1.65] text-text-2">
        {service.blurb}
      </p>
    </section>
  );
}
