import { ImageResponse } from "next/og";

// Branded social-share card (Open Graph + Twitter). Site-wide default; routes
// can override. English, on-brand: cream background, teal wordmark + mark.
export const alt = "Tollysplit — split shared expenses";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#faf8f4",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand row: logo mark + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 96,
              height: 96,
              borderRadius: 24,
              background: "#0d9488",
            }}
          >
            <svg width="60" height="60" viewBox="0 0 64 64" fill="none">
              <path
                d="M28 13v27a9 9 0 0 0 9 9h4"
                stroke="#fff"
                strokeWidth="9"
                strokeLinecap="round"
              />
              <path d="M17 26h22" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ fontSize: 56, fontWeight: 800, color: "#0d9488", letterSpacing: -1 }}>
            tollysplit
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 92, fontWeight: 800, color: "#1c1917", lineHeight: 1.05, letterSpacing: -2 }}>
            Split expenses.
          </div>
          <div style={{ fontSize: 92, fontWeight: 800, color: "#0d9488", lineHeight: 1.05, letterSpacing: -2 }}>
            Skip the fuss.
          </div>
          <div style={{ fontSize: 38, color: "#57534e", marginTop: 28, maxWidth: 900 }}>
            Create a split, share the link, settle up. No accounts — just a link.
          </div>
        </div>

        {/* Footer accent */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, color: "#78716c" }}>
          <div style={{ display: "flex", height: 10, width: 10, borderRadius: 5, background: "#f59e0b" }} />
          Swish · Lightning · USDC · IBAN — pay however suits you
        </div>
      </div>
    ),
    size
  );
}
