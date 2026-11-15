import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import { pool } from "./index";

/**
 * One-time repair for databases created via `drizzle-kit push` (which does
 * not record migration history). It inspects the real schema, inserts the
 * missing `__drizzle_migrations` history rows, and tells you what to run
 * next. It never alters your tables — only the history bookkeeping table
 * (plus the idempotent COMM_SOURCE seed rows when needed).
 *
 *   npx tsx src/db/baseline.ts
 */
async function main() {
  const journal = JSON.parse(fs.readFileSync("./drizzle/meta/_journal.json").toString());
  const entries = journal.entries.map((e: any) => {
    const sql = fs.readFileSync(`./drizzle/${e.tag}.sql`).toString();
    return {
      tag: e.tag,
      when: e.when as number,
      sql,
      hash: crypto.createHash("sha256").update(sql).digest("hex"),
    };
  });
  const latest = entries[entries.length - 1];
  console.log(`Journal has ${entries.length} entries, latest: ${latest.tag}`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash TEXT NOT NULL,
      created_at BIGINT
    )
  `);
  const [histRows] = await pool.query(
    "SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at DESC"
  );
  const recorded = new Set((histRows as any[]).map((r) => Number(r.created_at)));
  console.log(`Recorded history rows: ${recorded.size}`);

  const dbName = (process.env.DATABASE_URL?.split("/").pop()?.split("?")[0] || "").trim();
  async function hasColumn(table: string, column: string): Promise<boolean> {
    const [rows] = await pool.query(
      "SELECT 1 FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ? LIMIT 1",
      [dbName, table, column]
    );
    return (rows as any[]).length > 0;
  }
  async function hasTable(table: string): Promise<boolean> {
    const [rows] = await pool.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = ? LIMIT 1",
      [dbName, table]
    );
    return (rows as any[]).length > 0;
  }
  async function charLength(table: string, column: string): Promise<number | null> {
    const [rows] = await pool.query(
      "SELECT CHARACTER_MAXIMUM_LENGTH AS len FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ? LIMIT 1",
      [dbName, table, column]
    );
    return (rows as any[])[0]?.len ?? null;
  }

  // 0004-level objects (pre-change schema)
  const has0004 =
    (await hasColumn("vendors", "crm_status")) &&
    (await hasColumn("vendors", "contract_file_name")) &&
    (await hasTable("client_communications"));
  // 0005-level objects (this change)
  const has0005 =
    (await hasColumn("vendors", "client_type")) &&
    (await hasColumn("files", "description")) &&
    (await hasColumn("files", "is_obsolete")) &&
    (await hasColumn("client_communications", "file_name")) &&
    ((await charLength("client_communications", "source")) === 50);

  console.log(`Schema state: 0004-objects=${has0004}, 0005-objects=${has0005}`);

  async function record(entry: { tag: string; when: number; hash: string }) {
    if (recorded.has(entry.when)) return;
    await pool.query("INSERT INTO __drizzle_migrations (`hash`, `created_at`) VALUES (?, ?)", [
      entry.hash,
      entry.when,
    ]);
    recorded.add(entry.when);
    console.log(`  recorded ${entry.tag}`);
  }

  if (has0005) {
    // Schema already pushed; only history (+ maybe seed rows) is missing.
    const [srcRows] = await pool.query(
      "SELECT COUNT(*) AS n FROM status_masters WHERE entity_type = 'COMM_SOURCE'"
    );
    if (Number((srcRows as any[])[0]?.n || 0) === 0) {
      console.log("Seeding COMM_SOURCE rows...");
      const inserts = latest.sql
        .split("--> statement-breakpoint")
        .map((s: string) => s.trim())
        .filter((s: string) => s.toUpperCase().startsWith("INSERT"));
      for (const stmt of inserts) {
        await pool.query(stmt);
      }
    } else {
      console.log("COMM_SOURCE rows already present.");
    }
    for (const e of entries) await record(e);
    console.log("\nDone — history is complete. No migrate needed. Restart the app and log in.");
  } else if (has0004) {
    // Normal case: baseline everything before 0005, then migrate applies 0005.
    for (const e of entries.slice(0, -1)) await record(e);
    console.log("\nDone — now run:  npm run db:migrate");
  } else {
    console.log(
      "\nThis database looks older than 0004 or empty. Do NOT baseline — just run:  npm run db:migrate"
    );
    if (!(await hasTable("file_blobs"))) {
      console.log("(file_blobs is absent, so the 0003 conflict should not occur.)");
    } else {
      console.log(
        "WARNING: file_blobs exists but 0004 objects are missing — the schema is in a mixed state. " +
          "Back up the DB, then either restore consistency or ask for help before migrating."
      );
    }
  }

  await pool.end();
}

main().catch((err) => {
  console.error("Baseline failed:", err);
  process.exit(1);
});
