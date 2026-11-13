import assert from "node:assert/strict";
import { resolveDbSsl, isLocalDbHost } from "../db/db-ssl";

// Uses only in-memory fixtures: no filesystem, no network, no live database.
// Run with: npx tsx src/tests/db-ssl-config.ts

const FAKE_AIVEN_CA = Buffer.from("fake-aiven-ca");
const FAKE_CUSTOM_CA = Buffer.from("fake-custom-ca");

// 1. Local databases never use TLS, even when a CA file is present.
assert.equal(
  resolveDbSsl("mysql://root:@127.0.0.1:3306/recruitment_portal", { aivenCa: FAKE_AIVEN_CA }),
  undefined
);
assert.equal(
  resolveDbSsl("mysql://root:pw@localhost:3306/recruitment_portal", { aivenCa: FAKE_AIVEN_CA }),
  undefined
);
assert.ok(isLocalDbHost("localhost"));
assert.ok(isLocalDbHost("127.0.0.1"));
assert.ok(!isLocalDbHost("13.239.109.137"));

// 2. Aiven hosts verify against the project CA when present.
assert.deepEqual(
  resolveDbSsl("mysql://u:p@xyz.aivencloud.com:25060/db", { aivenCa: FAKE_AIVEN_CA }),
  { ca: FAKE_AIVEN_CA }
);

// 3. Aiven hosts without the CA keep the previous unverified-TLS fallback.
assert.deepEqual(resolveDbSsl("mysql://u:p@xyz.aivencloud.com:25060/db"), {
  rejectUnauthorized: false,
});

// 4. REGRESSION: a non-Aiven remote host must NOT receive the Aiven CA.
// Offering it there made Node reject the server certificate with
// "self-signed certificate in certificate chain" on login.
assert.deepEqual(
  resolveDbSsl("mysql://avien:avien@123@13.239.109.137:3306/rightfit", {
    aivenCa: FAKE_AIVEN_CA,
  }),
  { rejectUnauthorized: false }
);

// 5. A custom CA (DB_SSL_CA_PATH) wins for non-Aiven remote hosts.
assert.deepEqual(
  resolveDbSsl("mysql://u:p@db.example.com:3306/db", {
    aivenCa: FAKE_AIVEN_CA,
    customCa: FAKE_CUSTOM_CA,
  }),
  { ca: FAKE_CUSTOM_CA }
);

// 6. Strict verification against the system CAs can be enforced.
assert.deepEqual(
  resolveDbSsl("mysql://u:p@db.example.com:3306/db", { rejectUnauthorizedEnv: "true" }),
  {}
);

// 7. TLS can be disabled entirely.
assert.equal(
  resolveDbSsl("mysql://u:p@db.example.com:3306/db", { sslEnv: "false" }),
  undefined
);

console.log("db-ssl-config: all assertions passed");
