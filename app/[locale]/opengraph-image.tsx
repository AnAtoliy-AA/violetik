import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

export const alt = "Violetta Beauty";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Site" });
  const name = t("name");
  const tagline = t("tagline");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(ellipse at 50% 30%, #1f0e25 0%, #100612 70%)",
          color: "#f4ead8",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 168,
            fontStyle: "italic",
            fontFamily: "serif",
            fontWeight: 300,
            letterSpacing: "-0.03em",
            lineHeight: 1,
            backgroundImage:
              "linear-gradient(135deg, #b8956a 0%, #e8cf99 25%, #fff5d6 45%, #d4b27a 65%, #a07b48 100%)",
            backgroundClip: "text",
            color: "transparent",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {name.split(" ")[0]}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 26,
            fontFamily: "monospace",
            letterSpacing: "0.5em",
            color: "#c9a96e",
            textTransform: "uppercase",
          }}
        >
          {name.split(" ").slice(1).join(" ") || "Atelier"}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 80,
            fontSize: 28,
            color: "rgba(244, 234, 216, 0.72)",
            textAlign: "center",
            maxWidth: 800,
            fontStyle: "italic",
            fontFamily: "serif",
          }}
        >
          {tagline}
        </div>
      </div>
    ),
    { ...size },
  );
}
