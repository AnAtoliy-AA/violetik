import { cn } from "@/shared/lib/cn";

export type AuroraIntensity = "subtle" | "vivid";

export interface AuroraProps {
  className?: string;
  intensity?: AuroraIntensity;
}

export function Aurora({ className, intensity = "subtle" }: AuroraProps) {
  const opacity = intensity === "vivid" ? 0.85 : 0.55;
  return (
    <div
      aria-hidden="true"
      role="presentation"
      data-testid="aurora"
      data-intensity={intensity}
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className,
      )}
      style={{ opacity }}
    >
      <div
        className="absolute -left-[20%] -top-[20%] h-[60vh] w-[60vw] rounded-full blur-[120px]"
        style={{
          background:
            "radial-gradient(circle at center, var(--color-accent), transparent 65%)",
          animation: "var(--animate-aurora)",
          animationDelay: "-2s",
          willChange: "transform, opacity",
        }}
      />
      <div
        className="absolute -right-[15%] top-[10%] h-[55vh] w-[55vw] rounded-full blur-[120px]"
        style={{
          background:
            "radial-gradient(circle at center, var(--color-violet), transparent 65%)",
          animation: "var(--animate-aurora)",
          animationDelay: "-8s",
          willChange: "transform, opacity",
        }}
      />
      <div
        className="absolute bottom-[-20%] left-[20%] h-[50vh] w-[50vw] rounded-full blur-[120px]"
        style={{
          background:
            "radial-gradient(circle at center, var(--color-plum), transparent 70%)",
          animation: "var(--animate-aurora)",
          animationDelay: "-14s",
          willChange: "transform, opacity",
        }}
      />
    </div>
  );
}
