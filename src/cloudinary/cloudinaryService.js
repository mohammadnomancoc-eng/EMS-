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
    publicId:   `${empId}_profile_${Date.now()}`,
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
 * Upload the company logo to Cloudinary.
 * Store the returned secure_url in VITE_COMPANY_LOGO_URL or your Firestore settings doc.
 *
 * Folder: ems/company
 * The public_id is fixed so re-uploading replaces it.
 * NOTE: fixed public_ids require your upload preset to allow overwrites,
 *       OR append a timestamp to always create a new version.
 */
export async function uploadCompanyLogo(file, onProgress) {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
  if (!allowed.includes(file.type)) {
    throw new Error("Logo must be JPG, PNG, WEBP, or SVG.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Logo file must be under 5 MB.");
  }
  return uploadToCloudinary(file, "image", {
    folder:     "ems/company",
    publicId:   `logo_${Date.now()}`,
    onProgress,
  });
}

/**
 * Upload an ID card background image to Cloudinary.
 * Used by the ID card template builder (IdCardTemplateBuilder).
 * Images are stored under ems/idcard-backgrounds/.
 *
 * @param {File}     file
 * @param {string}   templateId  - template name or ID used as part of public_id
 * @param {Function} onProgress  - (percent: number) => void
 */
export async function uploadIdCardBackground(file, templateId = "custom", onProgress) {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    throw new Error("Background must be JPG, PNG, or WEBP.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Background image must be under 5 MB.");
  }
  return uploadToCloudinary(file, "image", {
    folder:     "ems/idcard-backgrounds",
    publicId:   `bg_${templateId}_${Date.now()}`,
    onProgress,
  });
}

/**
 * Upload an employee's offer letter.
 *
 * PDFs  → uploaded as "raw" resource type.
 * Images → uploaded as "image" resource type as normal.
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

// ── URL Helpers ───────────────────────────────────────────────

/**
 * Thumbnail URL for Cloudinary images.
 */
export function getThumbnailUrl(secureUrl, size = 150) {
  if (!secureUrl || !secureUrl.includes("cloudinary.com")) return secureUrl;
  const transformed = secureUrl.replace(
    "/upload/",
    `/upload/c_fill,g_face,h_${size},w_${size},q_auto,f_auto/`
  );
  const vMatch = secureUrl.match(/\/v(\d+)\//);
  return vMatch ? `${transformed}?v=${vMatch[1]}` : transformed;
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
 */
export function getOfferLetterViewUrl(url) {
  if (!url) return url;
  let clean = url;
  clean = clean.replace(/\/upload\/(?!v\d)([^/]+\/)+/, "/upload/");
  return clean;
}

/**
 * Returns a force-download URL for the offer letter.
 */
export function getOfferLetterDownloadUrl(url) {
  if (!url) return url;
  const clean = getOfferLetterViewUrl(url);
  return clean.replace("/upload/", "/upload/fl_attachment/");
}

/**
 * Wraps any public URL in Google Docs Viewer for reliable in-browser PDF viewing.
 */
export function getGoogleDocsViewerUrl(url) {
  if (!url) return "";
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
}