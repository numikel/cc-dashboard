const MAX_MESSAGE_LENGTH = 256;
const PATH_PLACEHOLDER = "<path>";
const USER_PLACEHOLDER = "<user>";
const CONTENT_PLACEHOLDER = "<content>";

const WINDOWS_PATH_PATTERN = /[A-Za-z]:[\\/](?:[^\s"'<>:*?|]+[\\/])*[^\s"'<>:*?|]+/g;
const POSIX_USER_PATH_PATTERN = /(^|[\s=:"'(])\/(?:home|Users|root|tmp|var|opt|data|claude-data|mnt)\/[^\s"'<>)]+/g;
const QUOTED_LONG_FRAGMENT_PATTERN = /"[^"]{120,}"/g;

function stripEnvUsername(message: string): string {
  const candidates = [process.env.USERNAME, process.env.USER, process.env.LOGNAME].filter(
    (value): value is string => typeof value === "string" && value.length >= 2
  );
  if (candidates.length === 0) {
    return message;
  }

  let result = message;
  for (const username of candidates) {
    const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`\\b${escaped}\\b`, "g"), USER_PLACEHOLDER);
  }
  return result;
}

/**
 * Sanitize error messages before they leave the server boundary (API responses,
 * database persistence). Strips absolute filesystem paths, username references
 * (HOME/USERPROFILE/USERNAME), long quoted JSON fragments and truncates the
 * result to a fixed length.
 *
 * Defence in depth for ADR-0002: even if the parser leaks a path or content
 * fragment in an error message, the user/file system layout stays private.
 */
export function sanitizeErrorMessage(input: unknown): string {
  if (input === null || input === undefined) {
    return "Unknown error";
  }

  const raw = input instanceof Error ? input.message : String(input);
  if (!raw.trim()) {
    return "Unknown error";
  }

  let result = raw;
  result = result.replace(WINDOWS_PATH_PATTERN, PATH_PLACEHOLDER);
  result = result.replace(POSIX_USER_PATH_PATTERN, (_match, lead: string) => `${lead ?? ""}${PATH_PLACEHOLDER}`);
  result = stripEnvUsername(result);
  result = result.replace(QUOTED_LONG_FRAGMENT_PATTERN, CONTENT_PLACEHOLDER);

  result = result.replace(/\s+/g, " ").trim();

  if (result.length > MAX_MESSAGE_LENGTH) {
    result = `${result.slice(0, MAX_MESSAGE_LENGTH - 1)}…`;
  }

  return result || "Unknown error";
}

/**
 * Sanitize a file identifier (e.g. JSONL source path) for inclusion in
 * structured error responses. Returns just the basename so consumers can
 * correlate without leaking directory layout.
 */
export function sanitizeFileLabel(filePath: string): string {
  if (!filePath) {
    return "<unknown>";
  }
  const segments = filePath.split(/[\\/]/);
  return segments[segments.length - 1] || "<unknown>";
}
