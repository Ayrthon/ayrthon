import process from "node:process";
import type { Store } from "@netlify/blobs";

const STORE_NAME = "job-planner";

/**
 * Netlify Blobs needs `siteID` + `token` on the API client. The automatic
 * `NETLIFY_BLOBS_CONTEXT` injection is unreliable inside Nitro's bundled
 * Netlify Function, so we prefer explicit credentials when present.
 *
 * - `SITE_ID`: read-only in Functions (see Netlify docs).
 * - `NETLIFY_AUTH_TOKEN`: Personal Access Token with Blobs scope (site env, Functions scope).
 */
export async function getPlannerBlobStore(): Promise<Store> {
  const { getStore } = await import("@netlify/blobs");

  const siteID =
    process.env.NETLIFY_BLOB_SITE_ID?.trim()
    || process.env.NETLIFY_SITE_ID?.trim()
    || process.env.SITE_ID?.trim();

  const token = process.env.NETLIFY_AUTH_TOKEN?.trim();

  if (siteID && token) {
    return getStore({
      name: STORE_NAME,
      siteID,
      token,
    });
  }

  return getStore(STORE_NAME);
}
