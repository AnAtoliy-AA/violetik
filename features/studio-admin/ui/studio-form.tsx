"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import type {
  SiteSettings,
  SiteSettingsPatch,
} from "@/entities/site-settings";
import { buttonClassName } from "@/shared/ui/button";
import type { CountryEntry } from "@/shared/config/countries";

export type SubmitStudioFn = (
  patch: SiteSettingsPatch,
) => Promise<{ ok: true } | { ok: false; error: string }>;

export interface StudioFormProps {
  initial: SiteSettings;
  countries: readonly CountryEntry[];
  timeZones: readonly string[];
  onSubmit: SubmitStudioFn;
}

type Status =
  | { kind: "idle" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

export function StudioForm({
  initial,
  countries,
  timeZones,
  onSubmit,
}: StudioFormProps) {
  const t = useTranslations("AdminStudio");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const [addressEn, setAddressEn] = useState(initial.addressEn);
  const [addressRu, setAddressRu] = useState(initial.addressRu);
  const [addressBy, setAddressBe] = useState(initial.addressBy);
  const [country, setCountry] = useState(initial.country);
  const [cityEn, setCityEn] = useState(initial.cityEn);
  const [cityRu, setCityRu] = useState(initial.cityRu);
  const [cityBy, setCityBe] = useState(initial.cityBy);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [latitude, setLatitude] = useState(
    initial.latitude == null ? "" : String(initial.latitude),
  );
  const [longitude, setLongitude] = useState(
    initial.longitude == null ? "" : String(initial.longitude),
  );
  const [mapVisible, setMapVisible] = useState(initial.mapVisible);
  const [telegramUsername, setTelegramUsername] = useState<string | null>(
    initial.telegramUsername,
  );

  const latNum = latitude === "" ? null : Number(latitude);
  const lngNum = longitude === "" ? null : Number(longitude);
  const coordsBothFilled =
    latNum != null &&
    lngNum != null &&
    Number.isFinite(latNum) &&
    Number.isFinite(lngNum);

  function handleTimezoneChange(next: string) {
    if (next === timezone) return;
    const ok = window.confirm(t("timezone_confirm"));
    if (ok) setTimezone(next);
  }

  function buildPatch(): SiteSettingsPatch {
    return {
      addressEn,
      addressRu,
      addressBy,
      country,
      cityEn,
      cityRu,
      cityBy,
      timezone,
      latitude: coordsBothFilled ? latNum : null,
      longitude: coordsBothFilled ? lngNum : null,
      mapVisible: coordsBothFilled ? mapVisible : false,
      telegramUsername,
    };
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const result = await onSubmit(buildPatch());
      if (result.ok) setStatus({ kind: "saved" });
      else setStatus({ kind: "error", message: result.error });
    });
  }

  const inputClass =
    "w-full rounded border border-line bg-surface px-3 py-2.5 text-base text-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
  const labelClass =
    "block font-mono text-[10px] uppercase tracking-[0.18em] text-text-3";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-8 px-[22px] py-6"
    >
      <fieldset>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_address")}
        </legend>
        <div className="flex flex-col gap-3">
          <label className={labelClass}>
            {t("label_address_en")}
            <input
              maxLength={200}
              className={cn(inputClass, "mt-1")}
              value={addressEn}
              onChange={(e) => setAddressEn(e.target.value)}
            />
          </label>
          <label className={labelClass}>
            {t("label_address_ru")}
            <input
              maxLength={200}
              className={cn(inputClass, "mt-1")}
              value={addressRu}
              onChange={(e) => setAddressRu(e.target.value)}
            />
          </label>
          <label className={labelClass}>
            {t("label_address_by")}
            <input
              maxLength={200}
              className={cn(inputClass, "mt-1")}
              value={addressBy}
              onChange={(e) => setAddressBe(e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_country")}
        </legend>
        <label className={labelClass}>
          {t("label_country")}
          <select
            className={cn(inputClass, "mt-1")}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.nameEn} ({c.code})
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_city")}
        </legend>
        <div className="flex flex-col gap-3">
          <label className={labelClass}>
            {t("label_city_en")}
            <input
              maxLength={120}
              className={cn(inputClass, "mt-1")}
              value={cityEn}
              onChange={(e) => setCityEn(e.target.value)}
            />
          </label>
          <label className={labelClass}>
            {t("label_city_ru")}
            <input
              maxLength={120}
              className={cn(inputClass, "mt-1")}
              value={cityRu}
              onChange={(e) => setCityRu(e.target.value)}
            />
          </label>
          <label className={labelClass}>
            {t("label_city_by")}
            <input
              maxLength={120}
              className={cn(inputClass, "mt-1")}
              value={cityBy}
              onChange={(e) => setCityBe(e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_coords")}
        </legend>
        <p className="mb-2 text-[11px] text-text-3">{t("coords_hint")}</p>
        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>
            {t("label_latitude")}
            <input
              type="number"
              inputMode="decimal"
              step="any"
              className={cn(inputClass, "mt-1")}
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
          </label>
          <label className={labelClass}>
            {t("label_longitude")}
            <input
              type="number"
              inputMode="decimal"
              step="any"
              className={cn(inputClass, "mt-1")}
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          </label>
        </div>
        {coordsBothFilled ? (
          <a
            href={`https://www.openstreetmap.org/?mlat=${latNum}&mlon=${lngNum}#map=17/${latNum}/${lngNum}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-[11px] underline"
          >
            {t("preview_pin")}
          </a>
        ) : null}
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_timezone")}
        </legend>
        <label className={labelClass}>
          {t("label_timezone")}
          <select
            className={cn(inputClass, "mt-1")}
            value={timezone}
            onChange={(e) => handleTimezoneChange(e.target.value)}
          >
            {timeZones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_map_visible")}
        </legend>
        <label
          className={cn(
            "flex items-center gap-2 text-[13px]",
            !coordsBothFilled && "opacity-50",
          )}
          title={coordsBothFilled ? undefined : t("map_visible_disabled_hint")}
        >
          <input
            type="checkbox"
            checked={mapVisible}
            disabled={!coordsBothFilled}
            onChange={(e) => setMapVisible(e.target.checked)}
          />
          {t("label_show_map")}
        </label>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-3">
          {t("section_telegram")}
        </legend>
        <label className={labelClass}>
          {t("label_telegram")}
          <input
            aria-label={t("label_telegram")}
            type="text"
            value={telegramUsername ?? ""}
            onChange={(e) =>
              setTelegramUsername(e.target.value || null)
            }
            placeholder="violetta"
            className={cn(inputClass, "mt-1")}
          />
        </label>
        <p className="mt-1 text-[11px] text-text-3">{t("telegram_hint")}</p>
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className={buttonClassName({ variant: "gold", size: "md" })}
        >
          {t("save")}
        </button>
        {status.kind === "saved" ? (
          <span role="status" className="text-[12px] text-text-2">
            {t("saved")}
          </span>
        ) : status.kind === "error" ? (
          <span role="alert" className="text-[12px] text-rose">
            {t("error", { error: status.message })}
          </span>
        ) : null}
      </div>
    </form>
  );
}
