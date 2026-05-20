import { disconnectGoogleCalendar } from "../api/disconnect";
import { buttonClassName } from "@/shared/ui/button";

export interface ConnectionStatusProps {
  email: string;
  connectedAt: Date;
  disconnectLabel: string;
  connectedLabel: string;
}

export function ConnectionStatus({
  email,
  connectedAt,
  disconnectLabel,
  connectedLabel,
}: ConnectionStatusProps) {
  return (
    <div className="flex flex-col gap-3 rounded-[18px] border-[0.5px] border-line bg-surface p-5">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
          {connectedLabel}
        </div>
        <div className="mt-1 text-sm text-text">{email}</div>
        <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">
          {connectedAt.toISOString().slice(0, 10)}
        </div>
      </div>
      <form action={disconnectGoogleCalendar}>
        <button
          type="submit"
          className={buttonClassName({ variant: "outline", size: "sm" })}
        >
          {disconnectLabel}
        </button>
      </form>
    </div>
  );
}
