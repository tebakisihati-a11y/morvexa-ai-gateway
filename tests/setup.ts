/**
 * Runs before each test file is imported.
 *
 * `jsonStore` resolves its data directory at module load, so the override has to
 * happen here rather than inside a test. Each file gets its own temporary
 * directory: tests never read the developer's .morvexa-data, and one test file
 * can no longer see another's records.
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.MORVEXA_DATA_DIR = mkdtempSync(join(tmpdir(), "morvexa-test-"));
process.env.AUTH_SESSION_SECRET = process.env.AUTH_SESSION_SECRET || "test-only-session-secret-value";

// Tests exercise the log transport unless they opt into Resend explicitly.
delete process.env.RESEND_API_KEY;
// Privileged-route secrets must not leak in from the developer's shell, or a
// test asserting "anonymous is refused" would pass or fail by environment.
delete process.env.ADMIN_SECRET_KEY;
delete process.env.OWNER_PASSCODE;
delete process.env.MORVEXA_PUBLIC_BASE_URL;
delete process.env.NEXT_PUBLIC_APP_URL;
