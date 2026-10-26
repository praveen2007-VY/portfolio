import { ImageResponse } from "next/og";
import { getPublishedPortfolio } from "@/lib/data/portfolio";
import { ACCENT_HEX } from "@/lib/theme";

export const alt = "Portfolio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const { profile, settings } = await getPublishedPortfolio();
  const accent = ACCENT_HEX[settings.accent];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#ffffff",
          backgroundImage: `radial-gradient(circle at 85% 15%, ${accent}33, transparent 45%)`,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#0a0d14",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            {profile.full_name
              .split(/\s+/)
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div style={{ fontSize: 28, color: "#262b36", fontWeight: 600 }}>{profile.full_name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 66, fontWeight: 700, color: "#0a0d14", letterSpacing: -2, lineHeight: 1.05 }}>
            {settings.hero_title}
          </div>
          {profile.headline && (
            <div style={{ marginTop: 28, fontSize: 26, color: "#586070" }}>{profile.headline}</div>
          )}
        </div>
        <div style={{ height: 6, width: 160, borderRadius: 3, background: accent }} />
      </div>
    ),
    size,
  );
}
