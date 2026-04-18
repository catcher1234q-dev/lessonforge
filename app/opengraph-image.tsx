import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/config/site";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 48%, #fff7ed 100%)",
          color: "#0f172a",
          padding: "72px",
          fontFamily: "Arial",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "18px",
              fontSize: 34,
              fontWeight: 800,
            }}
          >
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 18,
                background: "#2563eb",
              }}
            />
            {siteConfig.productName}
          </div>
          <div
            style={{
              borderRadius: 999,
              background: "rgba(37, 99, 235, 0.1)",
              color: "#1d4ed8",
              padding: "14px 22px",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            Teacher marketplace
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 880 }}>
          <div
            style={{
              fontSize: 76,
              lineHeight: 0.95,
              letterSpacing: "-0.055em",
              fontWeight: 900,
            }}
          >
            Buy, sell, and create classroom resources.
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 30,
              lineHeight: 1.35,
              color: "#475569",
            }}
          >
            A clearer marketplace for teachers, protected downloads, and plan-based seller payouts.
          </div>
        </div>

        <div style={{ display: "flex", gap: 18, color: "#334155", fontSize: 22 }}>
          <span>Secure checkout</span>
          <span>Protected library access</span>
          <span>Teacher-focused selling</span>
        </div>
      </div>
    ),
    size,
  );
}
