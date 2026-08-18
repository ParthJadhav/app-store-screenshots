/**
 * Guards for the two API routes that WRITE TO DISK.
 *
 * THE EXPOSURE
 * ------------
 * `POST /api/upload` writes a file into `public/screenshots/uploaded/`, and
 * `POST /api/project` OVERWRITES `app-store-screenshots.json`, which is
 * normally git-tracked. Neither had an origin check.
 *
 * While the dev server is running, any page in any other tab can send a
 * cross-origin POST. If that request is a CORS-"simple" request — which
 * `Content-Type: text/plain` makes it — the browser sends it WITH NO
 * PREFLIGHT. The attacker cannot read the response, and does not need to: the
 * write has already happened. `Request.json()` ignores the declared
 * Content-Type and parses the body anyway, so a text/plain body containing
 * JSON is accepted.
 *
 * Realistic harm: a malicious page plants files inside the user's repository,
 * or blanks the canonical project state, while they have the editor open.
 *
 * "It only listens on localhost" is NOT a defence. The victim's own browser is
 * inside localhost, and it is the browser that makes the request.
 *
 * THE GUARD
 * ---------
 * `rejectCrossSiteWrite` applies three checks, in increasing specificity:
 *
 *  1. Require `Content-Type: application/json`. This is the load-bearing one.
 *     That header is NOT CORS-simple, so requiring it forces the browser to
 *     send a preflight, and the preflight fails because these routes send no
 *     CORS headers. This alone closes the no-preflight hole.
 *  2. Reject a non-loopback `Origin`.
 *  3. Reject a cross-site `Sec-Fetch-Site`.
 *
 * Checks 2 and 3 SKIP WHEN THE HEADER IS ABSENT. That is deliberate, and it is
 * not a hole: the attack vector here is the victim's browser, and a browser
 * cannot be made to omit those headers on a cross-origin request. Skipping on
 * absence is what keeps curl, scripts and tests working.
 *
 * `sniffImageType` closes a separate issue: the stored file extension came
 * from the MIME string inside the data URL, which the caller writes by hand,
 * so arbitrary bytes could be stored as `<hash>.png`. This is not a path
 * traversal — the filename is a content hash plus a whitelisted extension —
 * and Next serves `public/` by extension, so it cannot be made to execute.
 * The realistic harm is junk that looks like an image getting committed.
 */

const LOOPBACK = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

export type GuardFailure = { error: string; status: number };

/**
 * Returns a failure to respond with, or null when the request is allowed.
 * Call at the top of every route handler that writes to disk.
 */
export function rejectCrossSiteWrite(req: Request): GuardFailure | null {
  // 1. Content-Type must be application/json. Not CORS-simple, so a
  //    cross-origin caller is forced into a preflight that fails.
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().split(";")[0].trim().startsWith("application/json")) {
    return { error: "Content-Type must be application/json", status: 415 };
  }

  // 2. Origin, when present, must be loopback.
  const origin = req.headers.get("origin");
  if (origin && !LOOPBACK.test(origin)) {
    return { error: "Cross-origin write rejected", status: 403 };
  }

  // 3. Sec-Fetch-Site, when present, must not be cross-site.
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "same-site" && site !== "none") {
    return { error: "Cross-site write rejected", status: 403 };
  }

  return null;
}

/** Magic-byte sniff. Returns the real type, or null if it is neither. */
export function sniffImageType(bytes: Buffer): "image/png" | "image/jpeg" | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  return null;
}
