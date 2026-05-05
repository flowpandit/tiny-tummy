import { nowISO } from "../utils";
import { getDb } from "./connection";
import { softDeleteById, softDeleteWhere, withTransaction } from "./mutations";

export async function deleteCaregiver(id: string): Promise<void> {
  const conn = await getDb();

  await withTransaction(conn, async () => {
    const now = nowISO();
    await softDeleteWhere(conn, "child_caregivers", "caregiver_id = ?", [id], now);
    await softDeleteById(conn, "caregivers", id, now);
  });
}

export async function deleteChildCaregiverLink(id: string): Promise<void> {
  const conn = await getDb();
  await softDeleteById(conn, "child_caregivers", id);
}

export async function deleteAttachmentMetadata(id: string): Promise<void> {
  const conn = await getDb();
  await softDeleteById(conn, "attachments", id);
}

export async function deleteAttachmentMetadataForOwner(ownerTable: string, ownerId: string): Promise<void> {
  const conn = await getDb();
  await softDeleteWhere(conn, "attachments", "owner_table = ? AND owner_id = ?", [ownerTable, ownerId]);
}
