// ─────────────────────────────────────────────────────────────
//  src/cloudinary/cloudinaryService.js
//
//  Handles all Cloudinary uploads (images & videos) via the
//  unsigned upload API — no server required.
//
//  Setup:
//    1. Create a free account at https://cloudinary.com
//    2. Go to Settings → Upload → Upload Presets → Add preset
//       → set Signing Mode = "Unsigned" → save
//    3. Copy your Cloud Name and the preset name into
//       src/cloudinary/config.js (see below)
//
//  Firestore stores only the returned `secure_url` (and
//  optionally `public_id` for future deletion/transforms).
// ─────────────────────────────────────────────────────────────

// ── Config ────────────────────────────────────────────────────
// Replace these with your own Cloudinary credentials.
// Alternatively, move them into a .env file:
//   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
//   VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
export const CLOUDINARY_CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "YOUR_CLOUD_NAME";

export const CLOUDINARY_UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "YOUR_UNSIGNED_PRESET";

// Base URL for Cloudinary's unsigned upload endpoint
const CLOUDINARY_BASE_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}`;

// ── Types ─────────────────────────────────────────────────────
/**
 * @typedef {Object} UploadResult
 * @property {string} secure_url  - HTTPS URL to the uploaded asset
 * @property {string} public_id   - Cloudinary public ID (use for deletions/transforms)
 * @property {string} resource_type - "image" | "video" | "raw"
 * @property {number} width       - (images only)
 * @property {number} height      - (images only)
 * @property {number} bytes       - File size in bytes
 * @property {string} format      - e.g. "jpg", "mp4"
 */

// ── Helpers ───────────────────────────────────────────────────

/**
 * Validate file before uploading.
 * @param {File} file
 * @param {"image"|"video"} type
 */
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

/**
 * Upload a File to Cloudinary via unsigned upload preset.
 *
 * @param {File}   file              - The File object from an <input type="file">
 * @param {"image"|"video"} type     - Resource type
 * @param {Object} [options]
 * @param {string} [options.folder]  - Cloudinary folder path, e.g. "ems/employees"
 * @param {string} [options.publicId] - Custom public_id (without extension)
 * @param {Function} [options.onProgress] - Progress callback: (percent: number) => void
 * @returns {Promise<UploadResult>}
 */
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

  // Use XMLHttpRequest so we can track upload progress
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
        const data = JSON.parse(xhr.responseText);
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

// ── Convenience Wrappers ──────────────────────────────────────

/**
 * Upload an employee profile photo.
 * Stored under folder: "ems/employees/{empId}"
 *
 * @param {File}   file
 * @param {string} empId            - e.g. "RWT013"
 * @param {Function} [onProgress]   - (percent: number) => void
 * @returns {Promise<UploadResult>}
 */
export async function uploadEmployeePhoto(file, empId, onProgress) {
  return uploadToCloudinary(file, "image", {
    folder:     `ems/employees/${empId}`,
    publicId:   `${empId}_profile`,
    onProgress,
  });
}

/**
 * Upload a document or company-related image.
 * Stored under folder: "ems/documents"
 *
 * @param {File}   file
 * @param {string} docName           - Identifier for the document
 * @param {Function} [onProgress]
 * @returns {Promise<UploadResult>}
 */
export async function uploadDocument(file, docName, onProgress) {
  return uploadToCloudinary(file, "image", {
    folder:     "ems/documents",
    publicId:   `doc_${docName}_${Date.now()}`,
    onProgress,
  });
}

/**
 * Upload a video (e.g. training material, announcements).
 * Stored under folder: "ems/videos"
 *
 * @param {File}   file
 * @param {string} videoName         - Identifier for the video
 * @param {Function} [onProgress]
 * @returns {Promise<UploadResult>}
 */
export async function uploadVideo(file, videoName, onProgress) {
  return uploadToCloudinary(file, "video", {
    folder:     "ems/videos",
    publicId:   `video_${videoName}_${Date.now()}`,
    onProgress,
  });
}

// ── URL Transform Helpers ─────────────────────────────────────
// Build optimised Cloudinary URLs without re-uploading.

/**
 * Generate a thumbnail URL for a Cloudinary image.
 * @param {string} secureUrl  - Original secure_url from Cloudinary
 * @param {number} [size=150] - Square size in pixels
 * @returns {string}
 */
export function getThumbnailUrl(secureUrl, size = 150) {
  if (!secureUrl || !secureUrl.includes("cloudinary.com")) return secureUrl;
  return secureUrl.replace(
    "/upload/",
    `/upload/c_fill,g_face,h_${size},w_${size},q_auto,f_auto/`
  );
}

/**
 * Generate an auto-quality, auto-format URL for any Cloudinary asset.
 * @param {string} secureUrl
 * @returns {string}
 */
export function getOptimizedUrl(secureUrl) {
  if (!secureUrl || !secureUrl.includes("cloudinary.com")) return secureUrl;
  return secureUrl.replace("/upload/", "/upload/q_auto,f_auto/");
}
