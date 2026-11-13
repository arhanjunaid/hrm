import "dotenv/config";
import assert from "assert";
import { loginUser } from "../services/auth.service";
import {
  createClient,
  updateClient,
  getClientById,
  uploadClientContract,
  getClientContractStream,
  createCommunication,
  listCommunications,
  updateCommunication,
  deleteCommunication,
} from "../services/client.service";
import { removeStoredFile } from "../services/storage.service";
import { db, pool } from "../db";
import { vendors, clientCommunications } from "../db/schema";
import { eq } from "drizzle-orm";

async function runTests() {
  console.log("=========================================");
  console.log("RUNNING CRM PROSPECT-TRACKING TESTS");
  console.log("=========================================");

  const adminSession = await loginUser("admin@example.com", "Admin123!@#");
  assert.strictEqual(adminSession.role, "ADMIN");

  const code = `CRM${Date.now().toString().slice(-6)}`;

  // 1. New clients default to Cold Prospect
  console.log("\n[Test 1] New client defaults to COLD_PROSPECT...");
  const clientId = await createClient(
    {
      name: "CRM Test Prospect",
      code,
      contactEmail: `crm.${Date.now()}@example.com`,
    },
    adminSession.id
  );
  let client = await getClientById(clientId);
  assert.strictEqual(client.crmStatus, "COLD_PROSPECT");
  console.log("✓ Default prospect stage is COLD_PROSPECT");

  // 2. Invalid prospect stage rejected on create and update
  console.log("\n[Test 2] Invalid prospect stage rejected...");
  try {
    await createClient(
      { name: "Bad", code: `BAD${Date.now()}`, contactEmail: "bad@example.com", crmStatus: "NOPE" },
      adminSession.id
    );
    assert.fail("Invalid crmStatus should be rejected on create.");
  } catch (err: any) {
    assert.ok(err.message.includes("INVALID_CRM_STATUS"));
  }
  try {
    await updateClient(clientId, { crmStatus: "NOPE" }, adminSession.id);
    assert.fail("Invalid crmStatus should be rejected on update.");
  } catch (err: any) {
    assert.ok(err.message.includes("INVALID_CRM_STATUS"));
  }
  console.log("✓ Invalid stages rejected");

  // 3. Prospect stage transitions
  console.log("\n[Test 3] Prospect stage transitions...");
  await updateClient(clientId, { crmStatus: "HOT_PROSPECT" }, adminSession.id);
  client = await getClientById(clientId);
  assert.strictEqual(client.crmStatus, "HOT_PROSPECT");
  await updateClient(clientId, { crmStatus: "SIGNED_UP_CLIENT" }, adminSession.id);
  client = await getClientById(clientId);
  assert.strictEqual(client.crmStatus, "SIGNED_UP_CLIENT");
  console.log("✓ Stage moves COLD -> HOT -> SIGNED_UP");

  // 4. Communication log CRUD
  console.log("\n[Test 4] Communication log CRUD...");
  const commId = await createCommunication(
    clientId,
    {
      contactDate: "2026-11-01",
      initiatedBy: "RF",
      source: "LINKEDIN",
      description: "Intro call with CTO, shared capability deck.",
      actionRequired: "Send proposal by Friday.",
      dueDate: "2026-11-14",
    },
    adminSession.id
  );
  let comms = await listCommunications(clientId);
  assert.strictEqual(comms.length, 1);
  assert.strictEqual(comms[0].id, commId);
  assert.strictEqual(comms[0].initiatedBy, "RF");
  assert.strictEqual(comms[0].source, "LINKEDIN");

  await updateCommunication(clientId, commId, { source: "FOLLOW_UP", dueDate: null }, adminSession.id);
  comms = await listCommunications(clientId);
  assert.strictEqual(comms[0].source, "FOLLOW_UP");
  assert.strictEqual(comms[0].dueDate, null);

  await deleteCommunication(clientId, commId, adminSession.id);
  comms = await listCommunications(clientId);
  assert.strictEqual(comms.length, 0);
  console.log("✓ Log entry create/update/delete works");

  // 5. Communication validation
  console.log("\n[Test 5] Communication validation...");
  const badInputs = [
    { contactDate: "not-a-date", initiatedBy: "RF", source: "LINKEDIN", description: "x" },
    { contactDate: "2026-11-01", initiatedBy: "VENDOR", source: "LINKEDIN", description: "x" },
    { contactDate: "2026-11-01", initiatedBy: "RF", source: "PIGEON", description: "x" },
    { contactDate: "2026-11-01", initiatedBy: "RF", source: "LINKEDIN", description: "  " },
    {
      contactDate: "2026-11-01",
      initiatedBy: "CLIENT",
      source: "WEB_ENQUIRY",
      description: "ok",
      dueDate: "14-11-2026",
    },
  ];
  for (const bad of badInputs) {
    try {
      await createCommunication(clientId, bad as any, adminSession.id);
      assert.fail(`Should reject: ${JSON.stringify(bad)}`);
    } catch (err: any) {
      assert.ok(
        err.message.includes("INVALID_") ||
          err.message.includes("REQUIRED"),
        `Unexpected error: ${err.message}`
      );
    }
  }
  console.log("✓ Bad dates, parties, sources, and empty descriptions rejected");

  // 6. Signed contract upload + view
  console.log("\n[Test 6] Signed contract upload + view...");
  const pdf = Buffer.from("%PDF-1.4 Mock Signed Contract");
  await uploadClientContract(
    clientId,
    { contractBuffer: pdf, contractFileName: "signed-contract.pdf", mimeType: "application/pdf" },
    adminSession.id
  );
  const viewed = await getClientContractStream(clientId, adminSession.id);
  assert.strictEqual(viewed.fileName, "signed-contract.pdf");
  assert.strictEqual(viewed.mimeType, "application/pdf");

  try {
    await uploadClientContract(
      clientId,
      { contractBuffer: pdf, contractFileName: "contract.exe", mimeType: "application/octet-stream" },
      adminSession.id
    );
    assert.fail("Non-document contract should be rejected.");
  } catch (err: any) {
    assert.ok(err.message.includes("INVALID_FILE_TYPE"));
  }
  console.log("✓ Contract upload/view works; bad file types rejected");

  // 7. Cross-client isolation for log entries
  console.log("\n[Test 7] Log entry cannot move across clients...");
  const otherId = await createClient(
    { name: "Other", code: `OTH${Date.now().toString().slice(-6)}`, contactEmail: `o${Date.now()}@example.com` },
    adminSession.id
  );
  const otherComm = await createCommunication(
    otherId,
    { contactDate: "2026-11-02", initiatedBy: "CLIENT", source: "EMAIL_MARKETING", description: "Reply." },
    adminSession.id
  );
  try {
    await updateCommunication(clientId, otherComm, { description: "hijack" }, adminSession.id);
    assert.fail("Cross-client update should be rejected.");
  } catch (err: any) {
    assert.ok(err.message.includes("COMMUNICATION_NOT_FOUND"));
  }
  try {
    await deleteCommunication(clientId, otherComm, adminSession.id);
    assert.fail("Cross-client delete should be rejected.");
  } catch (err: any) {
    assert.ok(err.message.includes("COMMUNICATION_NOT_FOUND"));
  }
  console.log("✓ Cross-client access blocked");

  // Cleanup
  console.log("\n[Cleanup] Removing test rows and files...");
  client = await getClientById(clientId);
  if (client.contractStorageKey) {
    await removeStoredFile(client.contractStorageKey, client.contractStorageProvider);
  }
  await db.delete(clientCommunications).where(eq(clientCommunications.clientId, otherId));
  await db.delete(clientCommunications).where(eq(clientCommunications.clientId, clientId));
  await db.delete(vendors).where(eq(vendors.id, otherId));
  await db.delete(vendors).where(eq(vendors.id, clientId));

  console.log("\n=========================================");
  console.log("ALL CRM TESTS PASSED");
  console.log("=========================================");

  await pool.end();
}

runTests().catch((err) => {
  console.error("CRM Test Suite Failed:", err);
  process.exit(1);
});
