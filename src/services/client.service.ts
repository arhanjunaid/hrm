import { db } from "@/db";
import {
  vendors,
  NewVendor,
  clientCommunications,
  NewClientCommunication,
} from "@/db/schema";
import {
  DEFAULT_CRM_CLIENT_STATUS,
  isCrmClientStatus,
  isCommunicationInitiatedBy,
  isCommunicationSource,
} from "@/lib/crm/constants";
import { randomUUID } from "crypto";
import { eq, desc } from "drizzle-orm";
import { createAuditLog } from "./audit.service";
import {
  getStorageProvider,
  getStorageProviderName,
  removeStoredFile,
} from "./storage.service";

const ALLOWED_CONTRACT_EXTENSIONS = [".pdf", ".doc", ".docx"];

function assertContractFileName(fileName: string) {
  const ext = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_CONTRACT_EXTENSIONS.includes(ext)) {
    throw new Error("INVALID_FILE_TYPE: Only PDF, DOC, and DOCX contract formats are supported.");
  }
  return ext;
}

function assertValidDate(value: string, field: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error(`INVALID_${field}: Expected a valid date as YYYY-MM-DD.`);
  }
}

export interface CreateClientInput {
  name: string;
  code: string;
  contactName?: string;
  contactEmail: string;
  contactPhone?: string;
  notes?: string;
  status?: string;
  crmStatus?: string;
}

export async function createClient(input: CreateClientInput, adminUserId: string) {
  if (!input.name?.trim()) {
    throw new Error("CLIENT_NAME_REQUIRED: Client name is required.");
  }
  if (!input.code?.trim()) {
    throw new Error("CLIENT_CODE_REQUIRED: Client code is required.");
  }
  if (!input.contactEmail?.trim()) {
    throw new Error("CLIENT_EMAIL_REQUIRED: Contact email is required.");
  }
  if (input.crmStatus !== undefined && !isCrmClientStatus(input.crmStatus)) {
    throw new Error(`INVALID_CRM_STATUS: '${input.crmStatus}' is not a valid prospect status.`);
  }

  const id = randomUUID();
  const newClient: NewVendor = {
    id,
    name: input.name.trim(),
    code: input.code.trim().toUpperCase(),
    contactName: input.contactName?.trim() || null,
    contactEmail: input.contactEmail.trim(),
    contactPhone: input.contactPhone?.trim() || null,
    notes: input.notes?.trim() || null,
    status: input.status || "ACTIVE",
    crmStatus: input.crmStatus ?? DEFAULT_CRM_CLIENT_STATUS,
  };

  await db.transaction(async (tx) => {
    await tx.insert(vendors).values(newClient);
    await createAuditLog(
      {
        userId: adminUserId,
        action: "CREATE_CLIENT",
        entityType: "Vendor",
        entityId: id,
        newValue: newClient,
      },
      tx
    );
  });

  return id;
}

export interface UpdateClientInput {
  name?: string;
  code?: string;
  contactName?: string | null;
  contactEmail?: string;
  contactPhone?: string | null;
  notes?: string | null;
  status?: string;
  crmStatus?: string;
}

export async function updateClient(
  clientId: string,
  input: UpdateClientInput,
  adminUserId: string
) {
  const existing = await db.query.vendors.findFirst({
    where: eq(vendors.id, clientId),
  });
  if (!existing) {
    throw new Error("CLIENT_NOT_FOUND");
  }
  if (input.crmStatus !== undefined && !isCrmClientStatus(input.crmStatus)) {
    throw new Error(`INVALID_CRM_STATUS: '${input.crmStatus}' is not a valid prospect status.`);
  }
  if (input.name !== undefined && !input.name.trim()) {
    throw new Error("CLIENT_NAME_REQUIRED: Client name is required.");
  }
  if (input.code !== undefined && !input.code.trim()) {
    throw new Error("CLIENT_CODE_REQUIRED: Client code is required.");
  }
  if (input.contactEmail !== undefined && !input.contactEmail.trim()) {
    throw new Error("CLIENT_EMAIL_REQUIRED: Contact email is required.");
  }

  const updateData: Partial<NewVendor> = {};
  if (input.name !== undefined) updateData.name = input.name.trim();
  if (input.code !== undefined) updateData.code = input.code.trim().toUpperCase();
  if (input.contactName !== undefined) updateData.contactName = input.contactName?.trim() || null;
  if (input.contactEmail !== undefined) updateData.contactEmail = input.contactEmail.trim();
  if (input.contactPhone !== undefined) updateData.contactPhone = input.contactPhone?.trim() || null;
  if (input.notes !== undefined) updateData.notes = input.notes?.trim() || null;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.crmStatus !== undefined) updateData.crmStatus = input.crmStatus;

  await db.transaction(async (tx) => {
    await tx.update(vendors).set(updateData).where(eq(vendors.id, clientId));
    await createAuditLog(
      {
        userId: adminUserId,
        action: "UPDATE_CLIENT",
        entityType: "Vendor",
        entityId: clientId,
        oldValue: existing,
        newValue: { ...existing, ...updateData },
      },
      tx
    );
  });
}

export async function getClientById(clientId: string) {
  const client = await db.query.vendors.findFirst({
    where: eq(vendors.id, clientId),
    with: {
      communications: {
        orderBy: [desc(clientCommunications.contactDate), desc(clientCommunications.createdAt)],
        with: { createdByUser: { columns: { id: true, name: true, email: true } } },
      },
      projects: true,
      users: { columns: { id: true, name: true, email: true, role: true, status: true } },
    },
  });
  if (!client) {
    throw new Error("CLIENT_NOT_FOUND");
  }
  return client;
}

export async function uploadClientContract(
  clientId: string,
  input: { contractBuffer: Buffer; contractFileName: string; mimeType: string },
  adminUserId: string
) {
  assertContractFileName(input.contractFileName);

  const client = await db.query.vendors.findFirst({
    where: eq(vendors.id, clientId),
  });
  if (!client) {
    throw new Error("CLIENT_NOT_FOUND");
  }

  const storageKey = `contracts/${clientId}/${randomUUID()}-${input.contractFileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const storageProviderName = getStorageProviderName();
  await getStorageProvider().upload(input.contractBuffer, storageKey);

  const oldKey = client.contractStorageKey;
  const oldProvider = client.contractStorageProvider;

  await db
    .update(vendors)
    .set({
      contractFileName: input.contractFileName,
      contractStorageKey: storageKey,
      contractStorageProvider: storageProviderName,
      contractMimeType: input.mimeType,
      contractFileSize: input.contractBuffer.length,
      contractUploadedBy: adminUserId,
      contractUploadedAt: new Date(),
    })
    .where(eq(vendors.id, clientId));

  if (oldKey) {
    await removeStoredFile(oldKey, oldProvider);
  }

  await createAuditLog({
    userId: adminUserId,
    action: oldKey ? "REPLACE_CLIENT_CONTRACT" : "UPLOAD_CLIENT_CONTRACT",
    entityType: "Vendor",
    entityId: clientId,
    oldValue: oldKey ? { fileName: client.contractFileName, storageKey: oldKey } : null,
    newValue: { fileName: input.contractFileName, storageKey },
  });
}

export async function getClientContractStream(clientId: string, adminUserId: string) {
  const client = await db.query.vendors.findFirst({
    where: eq(vendors.id, clientId),
  });
  if (!client) {
    throw new Error("CLIENT_NOT_FOUND");
  }
  if (!client.contractStorageKey) {
    throw new Error("CONTRACT_NOT_FOUND: No signed contract has been uploaded for this client.");
  }

  const storageProvider = getStorageProvider();
  const stream = await storageProvider.getStream(client.contractStorageKey);

  await createAuditLog({
    userId: adminUserId,
    action: "VIEW_CLIENT_CONTRACT",
    entityType: "Vendor",
    entityId: clientId,
  });

  return {
    stream,
    fileName: client.contractFileName || "contract",
    mimeType: client.contractMimeType || "application/octet-stream",
    fileSize: client.contractFileSize || undefined,
  };
}

export interface CreateCommunicationInput {
  contactDate: string;
  initiatedBy: string;
  source: string;
  description: string;
  actionRequired?: string;
  dueDate?: string;
}

function assertCommunicationInput(input: CreateCommunicationInput) {
  assertValidDate(input.contactDate, "CONTACT_DATE");
  if (!isCommunicationInitiatedBy(input.initiatedBy)) {
    throw new Error("INVALID_INITIATED_BY: Initiated by must be CLIENT or RF.");
  }
  if (!isCommunicationSource(input.source)) {
    throw new Error(`INVALID_SOURCE: '${input.source}' is not a valid communication source.`);
  }
  if (!input.description?.trim()) {
    throw new Error("DESCRIPTION_REQUIRED: Description is required.");
  }
  if (input.dueDate) {
    assertValidDate(input.dueDate, "DUE_DATE");
  }
}

export async function createCommunication(
  clientId: string,
  input: CreateCommunicationInput,
  adminUserId: string
) {
  const client = await db.query.vendors.findFirst({
    where: eq(vendors.id, clientId),
    columns: { id: true },
  });
  if (!client) {
    throw new Error("CLIENT_NOT_FOUND");
  }
  assertCommunicationInput(input);

  const id = randomUUID();
  const newComm: NewClientCommunication = {
    id,
    clientId,
    contactDate: input.contactDate as any,
    initiatedBy: input.initiatedBy,
    source: input.source,
    description: input.description.trim(),
    actionRequired: input.actionRequired?.trim() || null,
    dueDate: (input.dueDate || null) as any,
    createdBy: adminUserId,
  };

  await db.transaction(async (tx) => {
    await tx.insert(clientCommunications).values(newComm);
    await createAuditLog(
      {
        userId: adminUserId,
        action: "CREATE_CLIENT_COMMUNICATION",
        entityType: "ClientCommunication",
        entityId: id,
        newValue: { ...newComm, clientId },
      },
      tx
    );
  });

  return id;
}

export async function listCommunications(clientId: string) {
  return await db.query.clientCommunications.findMany({
    where: eq(clientCommunications.clientId, clientId),
    orderBy: [desc(clientCommunications.contactDate), desc(clientCommunications.createdAt)],
    with: {
      createdByUser: { columns: { id: true, name: true, email: true } },
    },
  });
}

export interface UpdateCommunicationInput {
  contactDate?: string;
  initiatedBy?: string;
  source?: string;
  description?: string;
  actionRequired?: string | null;
  dueDate?: string | null;
}

export async function updateCommunication(
  clientId: string,
  communicationId: string,
  input: UpdateCommunicationInput,
  adminUserId: string
) {
  const existing = await db.query.clientCommunications.findFirst({
    where: eq(clientCommunications.id, communicationId),
  });
  if (!existing || existing.clientId !== clientId) {
    throw new Error("COMMUNICATION_NOT_FOUND");
  }
  if (input.contactDate !== undefined) assertValidDate(input.contactDate, "CONTACT_DATE");
  if (input.initiatedBy !== undefined && !isCommunicationInitiatedBy(input.initiatedBy)) {
    throw new Error("INVALID_INITIATED_BY: Initiated by must be CLIENT or RF.");
  }
  if (input.source !== undefined && !isCommunicationSource(input.source)) {
    throw new Error(`INVALID_SOURCE: '${input.source}' is not a valid communication source.`);
  }
  if (input.description !== undefined && !input.description.trim()) {
    throw new Error("DESCRIPTION_REQUIRED: Description is required.");
  }
  if (input.dueDate) assertValidDate(input.dueDate, "DUE_DATE");

  const updateData: Partial<NewClientCommunication> = {};
  if (input.contactDate !== undefined) updateData.contactDate = input.contactDate as any;
  if (input.initiatedBy !== undefined) updateData.initiatedBy = input.initiatedBy;
  if (input.source !== undefined) updateData.source = input.source;
  if (input.description !== undefined) updateData.description = input.description.trim();
  if (input.actionRequired !== undefined) updateData.actionRequired = input.actionRequired?.trim() || null;
  if (input.dueDate !== undefined) updateData.dueDate = (input.dueDate || null) as any;

  await db.transaction(async (tx) => {
    await tx
      .update(clientCommunications)
      .set(updateData)
      .where(eq(clientCommunications.id, communicationId));
    await createAuditLog(
      {
        userId: adminUserId,
        action: "UPDATE_CLIENT_COMMUNICATION",
        entityType: "ClientCommunication",
        entityId: communicationId,
        oldValue: existing,
        newValue: { ...existing, ...updateData },
      },
      tx
    );
  });
}

export async function deleteCommunication(
  clientId: string,
  communicationId: string,
  adminUserId: string
) {
  const existing = await db.query.clientCommunications.findFirst({
    where: eq(clientCommunications.id, communicationId),
  });
  if (!existing || existing.clientId !== clientId) {
    throw new Error("COMMUNICATION_NOT_FOUND");
  }

  await db.transaction(async (tx) => {
    await tx.delete(clientCommunications).where(eq(clientCommunications.id, communicationId));
    await createAuditLog(
      {
        userId: adminUserId,
        action: "DELETE_CLIENT_COMMUNICATION",
        entityType: "ClientCommunication",
        entityId: communicationId,
        oldValue: { ...existing, clientId },
      },
      tx
    );
  });
}
