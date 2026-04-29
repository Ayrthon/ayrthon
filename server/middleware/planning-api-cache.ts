import { defineEventHandler, getRequestURL, setHeader } from "h3";

/** Netlify edge/CDN must not cache authenticated planner API responses (stale empty JSON). */
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname;
  if (!path.startsWith("/api/planning")) return;

  setHeader(event, "Cache-Control", "private, no-store, must-revalidate, max-age=0");
  setHeader(event, "CDN-Cache-Control", "no-store");
  setHeader(event, "Surrogate-Control", "no-store");
  setHeader(event, "Vary", "Cookie");
});
