import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { signInMock } = vi.hoisted(() => ({ signInMock: vi.fn() }));
vi.mock("next-auth/react", () => ({ signIn: signInMock }));

import { TelegramAuthCallback } from "./telegram-auth-callback";

function setSearch(search: string) {
  window.history.replaceState({}, "", `/en/auth/telegram${search}`);
}

describe("TelegramAuthCallback", () => {
  beforeEach(() => {
    signInMock.mockClear();
  });
  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("forwards the Telegram payload to signIn('telegram') with the callbackUrl", () => {
    setSearch(
      "?id=42&first_name=Vi&username=vi&auth_date=1700000000&hash=abc&callbackUrl=/ru/profile",
    );
    render(<TelegramAuthCallback callbackUrl="/ru/profile" />);

    expect(signInMock).toHaveBeenCalledTimes(1);
    expect(signInMock).toHaveBeenCalledWith("telegram", {
      id: "42",
      first_name: "Vi",
      username: "vi",
      auth_date: "1700000000",
      hash: "abc",
      callbackUrl: "/ru/profile",
      redirect: true,
    });
  });

  it("does nothing when there is no hash param (not a Telegram return)", () => {
    setSearch("?callbackUrl=/admin");
    render(<TelegramAuthCallback />);
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("only forwards known Telegram fields, ignoring extras", () => {
    setSearch("?id=7&hash=zzz&evil=<script>&callbackUrl=/admin");
    render(<TelegramAuthCallback callbackUrl="/admin" />);

    const [, payload] = signInMock.mock.calls[0];
    expect(payload).not.toHaveProperty("evil");
    expect(payload.id).toBe("7");
    expect(payload.hash).toBe("zzz");
  });
});
