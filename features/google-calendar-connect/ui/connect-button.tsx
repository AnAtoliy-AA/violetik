import { startGoogleOAuth } from "../api/start";
import { buttonClassName } from "@/shared/ui/button";

export interface ConnectButtonProps {
  label: string;
}

export function ConnectButton({ label }: ConnectButtonProps) {
  return (
    <form action={startGoogleOAuth}>
      <button
        type="submit"
        className={buttonClassName({ variant: "solid", size: "md" })}
      >
        {label}
      </button>
    </form>
  );
}
