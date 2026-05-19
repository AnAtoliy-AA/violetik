import type { Service } from "@/entities/studio";

export interface DetailDescriptionProps {
  service: Service;
}

export function DetailDescription({ service }: DetailDescriptionProps) {
  const [first, ...rest] = service.blurb;
  return (
    <section className="px-[22px] pb-5 pt-9">
      <p className="m-0 text-[16px] leading-[1.65] text-text-2">
        <span className="float-left mr-2.5 mt-1 font-display text-[56px] font-normal italic leading-[0.85] text-accent">
          {first}
        </span>
        {rest.join("")}
      </p>
    </section>
  );
}
