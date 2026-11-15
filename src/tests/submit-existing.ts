import "dotenv/config";
import assert from "assert";
import { loginUser } from "../services/auth.service";
import { getJobById } from "../services/job.service";
import {
  createCandidate,
  addCandidateResume,
  setResumeObsolete,
  deleteCandidate,
} from "../services/candidate.service";
import { submitCandidateToJob } from "../services/submission.service";
import { createClient, createCommunication } from "../services/client.service";
import { db, pool } from "../db";
import { vendors, candidateSubmissions, clientCommunications } from "../db/schema";
import { eq } from "drizzle-orm";

const pdf = Buffer.from("%PDF-1.4 focused regression test resume");

/**
 * Focused regression tests for the multi-CV + submit-existing-candidate +
 * client-type changes. Requires a migrated, seeded database:
 *   npm run db:migrate && npm run db:seed && npm run test:submit-existing
 */
async function runTests() {
  console.log("=========================================");
  console.log("SUBMIT-EXISTING / MULTI-CV REGRESSION TESTS");
  console.log("=========================================");

  const admin = await loginUser("admin@example.com", "Admin123!@#");
  assert.strictEqual(admin.role, "ADMIN");

  // Seed jobs we submit against (job1 already has a seeded submission).
  const job2 = await getJobById("j2222222-2222-2222-2222-222222222222");
  const job3 = await getJobById("j3333333-3333-3333-3333-333333333333");
  assert.ok(job2 && job3);

  // 1. Create candidate with a described first CV, then add a second CV.
  console.log("\n[Test 1] Multi-CV upload with descriptions...");
  const { candidateId, fileId: cv1 } = await createCandidate(
    {
      name: "Regression Tester",
      email: `regression.${Date.now()}@example.com`,
      phone: "+10000000001",
      totalExperience: "3.0",
      relevantExperience: "2.0",
      skills: "Testing, QA",
      description: "General CV",
      resumeBuffer: pdf,
      resumeFileName: "regression-general.pdf",
      mimeType: "application/pdf",
    },
    admin.id
  );
  const { fileId: cv2 } = await addCandidateResume(
    candidateId,
    {
      resumeBuffer: pdf,
      resumeFileName: "regression-devops.pdf",
      mimeType: "application/pdf",
      description: "Tailored for DevOps JD",
    },
    admin.id
  );
  assert.notStrictEqual(cv1, cv2);
  console.log("✓ Candidate holds two CVs");

  // 2. Submit the existing candidate with the SECOND CV only.
  console.log("\n[Test 2] Submit existing candidate with chosen CV...");
  const submissionId = await submitCandidateToJob(job2.id, candidateId, cv2, admin.id);
  assert.ok(submissionId);
  const sub = await db.query.candidateSubmissions.findFirst({
    where: eq(candidateSubmissions.id, submissionId),
  });
  assert.strictEqual(sub?.resumeFileId, cv2);
  console.log("✓ Only the selected CV is linked to the JD");

  // 3. Obsolete CVs cannot be submitted to new JDs.
  console.log("\n[Test 3] Obsolete CV rejected for new submissions...");
  await setResumeObsolete(candidateId, cv1, true, admin.id);
  try {
    await submitCandidateToJob(job3.id, candidateId, cv1, admin.id);
    assert.fail("Obsolete CV should have been rejected!");
  } catch (err: any) {
    assert.ok(err.message.includes("RESUME_OBSOLETE"));
    console.log("✓ Obsolete CV rejected");
  }
  // ...but a current CV of the same candidate still submits fine.
  await submitCandidateToJob(job3.id, candidateId, cv2, admin.id);
  console.log("✓ Current CV of the same candidate still accepted");

  // 4. A CV belonging to another candidate is rejected.
  console.log("\n[Test 4] Cross-candidate CV rejected...");
  const other = await createCandidate(
    {
      name: "Other Candidate",
      email: `other.${Date.now()}@example.com`,
      phone: "+10000000002",
      totalExperience: "1.0",
      relevantExperience: "1.0",
      skills: "Testing",
      resumeBuffer: pdf,
      resumeFileName: "other.pdf",
      mimeType: "application/pdf",
    },
    admin.id
  );
  try {
    await submitCandidateToJob(job3.id, other.candidateId, cv2, admin.id);
    assert.fail("Another candidate's CV should have been rejected!");
  } catch (err: any) {
    assert.ok(err.message.includes("RESUME_NOT_FOUND"));
    console.log("✓ Cross-candidate CV rejected");
  }

  // 5. Client type validation + prospect creation.
  console.log("\n[Test 5] Client type C/P...");
  try {
    await createClient(
      { name: "Bad Type", code: `BAD${Date.now()}`, contactEmail: "bad@example.com", clientType: "X" },
      admin.id
    );
    assert.fail("Invalid client type should have been rejected!");
  } catch (err: any) {
    assert.ok(err.message.includes("INVALID_CLIENT_TYPE"));
    console.log("✓ Invalid client type rejected");
  }
  const prospectId = await createClient(
    {
      name: "Regression Prospect",
      code: `REG${String(Date.now()).slice(-6)}`,
      contactEmail: "prospect@example.com",
      clientType: "P",
    },
    admin.id
  );
  const prospect = await db.query.vendors.findFirst({ where: eq(vendors.id, prospectId) });
  assert.strictEqual(prospect?.clientType, "P");
  console.log("✓ Prospect created with Type = P");

  // 6. Communication source must come from Status Masters.
  console.log("\n[Test 6] Communication source validated against Status Masters...");
  try {
    await createCommunication(
      prospectId,
      {
        contactDate: "2026-11-15",
        initiatedBy: "RF",
        source: "NOT_A_REAL_SOURCE",
        description: "Should fail validation",
      },
      admin.id
    );
    assert.fail("Invalid source should have been rejected!");
  } catch (err: any) {
    assert.ok(err.message.includes("INVALID_SOURCE"));
    console.log("✓ Unknown source rejected");
  }
  const commId = await createCommunication(
    prospectId,
    {
      contactDate: "2026-11-15",
      initiatedBy: "RF",
      source: "FOLLOW_UP",
      description: "Seeded Status Masters source accepted",
    },
    admin.id
  );
  assert.ok(commId);
  console.log("✓ Status Masters source accepted");

  // Cleanup created rows.
  await deleteCandidate(candidateId, admin.id);
  await deleteCandidate(other.candidateId, admin.id);
  await db.delete(clientCommunications).where(eq(clientCommunications.clientId, prospectId));
  await db.delete(vendors).where(eq(vendors.id, prospectId));
  console.log("\n✓ Cleanup done");

  console.log("\n=========================================");
  console.log("ALL SUBMIT-EXISTING TESTS PASSED");
  console.log("=========================================");

  await pool.end();
}

runTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
