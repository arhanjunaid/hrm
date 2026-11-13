import fs from "fs";
import path from "path";

/**
 * mysql2 `ssl` option decided for a DATABASE_URL.
 * - `undefined`: no TLS (local databases, or TLS explicitly disabled).
 * - `{ ca }`: verify the server against the given CA certificate.
 * - `{ rejectUnauthorized: false }`: TLS-encrypted, server cert unverified
 *   (self-hosted MySQL with a self-signed certificate).
 * - `{}`: TLS-encrypted, verified against the system CAs (strict mode).
 */
export type DbSslConfig =
  | { ca: Buffer }
  | { rejectUnauthorized: false }
  | Record<string, never>
  | undefined;

export function isLocalDbHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "";
}

/**
 * Pure SSL decision. The repo `ca.pem` is the Aiven project CA, so it must
 * only ever be offered to `*.aivencloud.com` hosts — offering it to any other
 * host makes Node reject that host's certificate with
 * "self-signed certificate in certificate chain".
 */
export function resolveDbSsl(
  connectionUri: string,
  opts: {
    /** Contents of the repo ca.pem (Aiven project CA). Only used for Aiven hosts. */
    aivenCa?: Buffer | null;
    /** Contents of a custom CA (DB_SSL_CA_PATH) for non-Aiven remote hosts. */
    customCa?: Buffer | null;
    /** Value of DB_SSL_REJECT_UNAUTHORIZED. */
    rejectUnauthorizedEnv?: string | undefined;
    /** Value of DB_SSL ("false" disables TLS entirely). */
    sslEnv?: string | undefined;
  } = {}
): DbSslConfig {
  if (opts.sslEnv === "false") {
    return undefined;
  }

  let hostname = "";
  try {
    hostname = new URL(connectionUri).hostname;
  } catch {
    hostname = "";
  }

  if (isLocalDbHost(hostname)) {
    return undefined;
  }

  if (connectionUri.includes("aivencloud.com")) {
    if (opts.aivenCa) {
      return { ca: opts.aivenCa };
    }
    return { rejectUnauthorized: false };
  }

  if (opts.customCa) {
    return { ca: opts.customCa };
  }
  if (opts.rejectUnauthorizedEnv === "true") {
    return {};
  }
  return { rejectUnauthorized: false };
}

/** Impure wrapper: reads the CA files and env vars, then delegates to resolveDbSsl. */
export function loadDbSsl(connectionUri: string): DbSslConfig {
  const aivenCaPath = path.resolve(process.cwd(), "ca.pem");
  const aivenCa = fs.existsSync(aivenCaPath) ? fs.readFileSync(aivenCaPath) : null;

  const customCaPath = process.env.DB_SSL_CA_PATH;
  const customCa =
    customCaPath && fs.existsSync(customCaPath) ? fs.readFileSync(customCaPath) : null;

  return resolveDbSsl(connectionUri, {
    aivenCa,
    customCa,
    rejectUnauthorizedEnv: process.env.DB_SSL_REJECT_UNAUTHORIZED,
    sslEnv: process.env.DB_SSL,
  });
}
