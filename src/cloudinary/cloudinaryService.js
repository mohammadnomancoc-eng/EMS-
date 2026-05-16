// ─────────────────────────────────────────────────────────────
//  src/cloudinary/cloudinaryService.js
// ─────────────────────────────────────────────────────────────

// ── Config ────────────────────────────────────────────────────
export const CLOUDINARY_CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "YOUR_CLOUD_NAME";

export const CLOUDINARY_UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "YOUR_UNSIGNED_PRESET";

const CLOUDINARY_BASE_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}`;

// ── Helpers ───────────────────────────────────────────────────
function validateFile(file, type) {
  if (type === "image") {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      throw new Error(`Unsupported image format: ${file.type}. Use JPG, PNG, WEBP, or GIF.`);
    }
    const maxMB = 10;
    if (file.size > maxMB * 1024 * 1024) {
      throw new Error(`Image too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${maxMB} MB.`);
    }
  }

  if (type === "video") {
    const allowed = ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo"];
    if (!allowed.includes(file.type)) {
      throw new Error(`Unsupported video format: ${file.type}. Use MP4, WEBM, or MOV.`);
    }
    const maxMB = 100;
    if (file.size > maxMB * 1024 * 1024) {
      throw new Error(`Video too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${maxMB} MB.`);
    }
  }
}

// ── Core Upload ───────────────────────────────────────────────
export async function uploadToCloudinary(file, type = "image", options = {}) {
  if (!CLOUDINARY_CLOUD_NAME || CLOUDINARY_CLOUD_NAME === "YOUR_CLOUD_NAME") {
    throw new Error(
      "Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file."
    );
  }

  validateFile(file, type);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  if (options.folder)   formData.append("folder",    options.folder);
  if (options.publicId) formData.append("public_id", options.publicId);

  const url = `${CLOUDINARY_BASE_URL}/${type}/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);

    if (options.onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          options.onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        let errMsg = `Upload failed (HTTP ${xhr.status})`;
        try {
          const err = JSON.parse(xhr.responseText);
          errMsg = err?.error?.message || errMsg;
        } catch (_) {}
        reject(new Error(errMsg));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(formData);
  });
}

// ── Convenience Wrappers ──────────────────────────────────────

export async function uploadEmployeePhoto(file, empId, onProgress) {
  return uploadToCloudinary(file, "image", {
    folder:     `ems/employees/${empId}`,
    publicId:   `${empId}_profile`,
    onProgress,
  });
}

export async function uploadDocument(file, docName, onProgress) {
  return uploadToCloudinary(file, "image", {
    folder:     "ems/documents",
    publicId:   `doc_${docName}_${Date.now()}`,
    onProgress,
  });
}

export async function uploadVideo(file, videoName, onProgress) {
  return uploadToCloudinary(file, "video", {
    folder:     "ems/videos",
    publicId:   `video_${videoName}_${Date.now()}`,
    onProgress,
  });
}

/**
 * Upload an employee's offer letter.
 *
 * PDFs  → uploaded as "raw" resource type (the correct Cloudinary type for PDFs).
 *          The raw URL is stored as-is. We use Google Docs Viewer to display it,
 *          which works perfectly with public Cloudinary raw URLs — no CORS, no auth issues.
 *
 * Images → uploaded as "image" resource type as normal.
 *
 * @param {File}     file
 * @param {string}   empId       - e.g. "RWT013"
 * @param {Function} onProgress  - (percent: number) => void
 * @returns {Promise<{secure_url, public_id, resource_type, ...}>}
 */
export async function uploadOfferLetter(file, empId, onProgress) {
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    throw new Error("Unsupported format. Please upload a PDF, JPG, PNG, or WEBP file.");
  }
  const maxMB = 20;
  if (file.size > maxMB * 1024 * 1024) {
    throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${maxMB} MB.`);
  }
  if (!CLOUDINARY_CLOUD_NAME || CLOUDINARY_CLOUD_NAME === "YOUR_CLOUD_NAME") {
    throw new Error(
      "Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file."
    );
  }

  const isPdf = file.type === "application/pdf";
  // PDFs must be uploaded as "raw" — Cloudinary's correct resource type for documents.
  // Images go as "image" as normal.
  const resourceType = isPdf ? "raw" : "image";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder",      `ems/offer-letters/${empId}`);
  formData.append("public_id",   `${empId}_offer_letter_${Date.now()}`);

  const uploadUrl = `${CLOUDINARY_BASE_URL}/${resourceType}/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl, true);

    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        // Store the URL exactly as Cloudinary returns it.
        // For PDFs this is a /raw/upload/ URL — that's correct and intentional.
        // getOfferLetterDownloadUrl() will add fl_attachment when needed for downloads.
        // Google Docs Viewer handles display without needing URL transforms.
        resolve(data);
      } else {
        let errMsg = `Upload failed (HTTP ${xhr.status})`;
        try {
          const err = JSON.parse(xhr.responseText);
          errMsg = err?.error?.message || errMsg;
        } catch (_) {}
        reject(new Error(errMsg));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(formData);
  });
}

// ── URL Helpers ───────────────────────────────────────────────

/**
 * Thumbnail URL for Cloudinary images.
 */
export function getThumbnailUrl(secureUrl, size = 150) {
  if (!secureUrl || !secureUrl.includes("cloudinary.com")) return secureUrl;
  return secureUrl.replace(
    "/upload/",
    `/upload/c_fill,g_face,h_${size},w_${size},q_auto,f_auto/`
  );
}

/**
 * Auto-quality, auto-format URL for any Cloudinary image.
 */
export function getOptimizedUrl(secureUrl) {
  if (!secureUrl || !secureUrl.includes("cloudinary.com")) return secureUrl;
  return secureUrl.replace("/upload/", "/upload/q_auto,f_auto/");
}

/**
 * Returns the clean, publicly-accessible offer letter URL (no transforms).
 * Safe to pass to Google Docs Viewer or use as an <img> src.
 *
 * Strips any transformation flags (fl_attachment, c_fill, etc.) that may
 * have been written to Firestore by older app versions.
 *
 * @param {string} url - Raw URL stored in Firestore
 * @returns {string}
 */
export function getOfferLetterViewUrl(url) {
  if (!url) return url;
  let clean = url;
  // Strip any transform segment between /upload/ and the version token (v1234567890)
  // This removes fl_attachment/, c_fill,.../ or any other flags stored by mistake.
  // Matches: /upload/anything_here/v1234567890 → /upload/v1234567890
  clean = clean.replace(/\/upload\/(?!v\d)([^/]+\/)+/, "/upload/");
  return clean;
}

/**
 * Returns a force-download URL for the offer letter.
 * Works for both raw (PDF) and image URLs stored in Firestore.
 *
 * For PDFs (raw URLs):  adds fl_attachment so browser downloads the PDF.
 * For images:           adds fl_attachment so browser downloads the image.
 *
 * @param {string} url - Raw URL stored in Firestore
 * @returns {string}
 */
export function getOfferLetterDownloadUrl(url) {
  if (!url) return url;
  const clean = getOfferLetterViewUrl(url);
  // Insert fl_attachment after /upload/
  return clean.replace("/upload/", "/upload/fl_attachment/");
}

/**
 * Wraps any public URL in Google Docs Viewer for reliable in-browser PDF viewing.
 * Works cross-origin, no CORS issues, no plugins needed, works on mobile too.
 *
 * Use this for both Cloudinary raw PDF URLs and image URLs stored as PDFs.
 *
 * @param {string} url - The clean offer letter URL (from getOfferLetterViewUrl)
 * @returns {string}   - Google Docs Viewer iframe src
 */
export function getGoogleDocsViewerUrl(url) {
  if (!url) return "";
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
}