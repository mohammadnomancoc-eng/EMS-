// src/components/PdfViewer.jsx
//
// Inline PDF viewer using Google Docs Viewer.
//
// WHY Google Docs Viewer instead of pdfjs-dist / <embed> / <object>:
//   - pdfjs-dist requires fetch() from your origin, which Cloudinary blocks
//     with CORS headers unless you whitelist every domain in your Cloudinary settings.
//   - <embed> and <object> are blocked by Chrome for cross-origin PDF URLs.
//   - <iframe src="mozilla.github.io/pdf.js/web/viewer.html?file=..."> blocks
//     cross-origin files by default (X-Frame-Options / CSP).
//   - Google Docs Viewer fetches the PDF server-side (no CORS) and streams HTML
//     to the iframe — works with any public URL including Cloudinary raw URLs.
//
// USAGE:
//   import PdfViewer from "../../components/PdfViewer";
//   <PdfViewer url={cloudinaryRawUrl} theme={theme} border={border} />

import { useState } from "react";
import { getOfferLetterViewUrl, getOfferLetterDownloadUrl, getGoogleDocsViewerUrl } from "../cloudinary/cloudinaryService";

export default function PdfViewer({ url, theme, border }) {
  const isDark    = theme === "dark";
  const labelColor = isDark ? "#666666" : "#999999";

  const [loaded, setLoaded] = useState(false);
  const [error,  setError]  = useState(false);

  if (!url) return null;

  const cleanUrl    = getOfferLetterViewUrl(url);
  const downloadUrl = getOfferLetterDownloadUrl(url);
  const isImage     = /\.(jpe?g|png|webp)(\?|$)/i.test(cleanUrl);
  const viewerUrl   = isImage ? cleanUrl : getGoogleDocsViewerUrl(cleanUrl);

  const containerStyle = {
    borderRadius: "10px",
    overflow: "hidden",
    border: `1px solid ${border}`,
    background: isDark ? "#111111" : "#F0F0F0",
    position: "relative",
    minHeight: "200px",
  };

  if (isImage) {
    return (
      <div style={containerStyle}>
        <img
          src={viewerUrl}
          alt="Document"
          style={{ width: "100%", display: "block", objectFit: "contain", maxHeight: "500px" }}
        />
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Loading / error state shown behind iframe */}
      {!loaded && !error && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "10px",
        }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{
            width: "20px", height: "20px", borderRadius: "50%",
            border: "2px solid #00B8B8", borderTopColor: "transparent",
            animation: "spin 0.8s linear infinite",
          }} />
          <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: labelColor }}>
            Loading PDF…
          </span>
        </div>
      )}
      {error && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "10px", padding: "24px",
        }}>
          <span style={{ fontFamily: "Mulish, sans-serif", fontSize: "12px", color: "#CC0000", textAlign: "center" }}>
            ⚠ Could not load PDF in viewer.
          </span>
          <a href={downloadUrl} target="_blank" rel="noopener noreferrer"
            style={{
              fontFamily: "Rajdhani, sans-serif", fontWeight: 700, fontSize: "12px",
              color: "#00B8B8", textDecoration: "none", letterSpacing: "0.06em",
            }}>
            DOWNLOAD TO VIEW ↗
          </a>
        </div>
      )}
      <iframe
        src={viewerUrl}
        title="PDF Viewer"
        style={{
          position: "relative", zIndex: 1,
          width: "100%", height: "480px",
          border: "none", display: "block",
          opacity: loaded ? 1 : 0,
          transition: "opacity 300ms",
        }}
        onLoad={() => setLoaded(true)}
        onError={() => { setError(true); setLoaded(true); }}
        allowFullScreen
      />
    </div>
  );
}