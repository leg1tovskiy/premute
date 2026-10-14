import { getSql } from "../db";
import type { StaffProfile } from "@/lib/types";

export type ProofItem = {
  id: string;
  recordId: number;
  kind: string;
  proofUrl: string;
  comment: string | null;
  authorUserId: string | null;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function ensureProofsTable(): Promise<void> {
  const sql = await getSql();
  await sql.query(`
    CREATE TABLE IF NOT EXISTS punishment_proofs (
      id TEXT PRIMARY KEY,
      record_id BIGINT NOT NULL,
      kind TEXT NOT NULL,
      proof_url TEXT NOT NULL,
      comment TEXT,
      author_user_id TEXT,
      author_name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  try {
    await sql.query(`CREATE INDEX IF NOT EXISTS punishment_proofs_lookup_idx ON punishment_proofs (kind, record_id);`);
  } catch {}
}

export async function getProofsMap(): Promise<Record<string, { url: string; comment?: string | null; authorName?: string | null; updatedAt?: string }>> {
  await ensureProofsTable();
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    proof_url: string;
    comment: string | null;
    author_name: string | null;
    updated_at: unknown;
  }>`
    SELECT id, proof_url, comment, author_name, updated_at
    FROM punishment_proofs
  `;

  const map: Record<string, { url: string; comment?: string | null; authorName?: string | null; updatedAt?: string }> = {};
  for (const r of rows) {
    map[r.id] = {
      url: r.proof_url,
      comment: r.comment,
      authorName: r.author_name,
      updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at || ""),
    };
  }
  return map;
}

export async function attachProof(
  actor: StaffProfile,
  data: {
    recordId: number;
    kind: "ban" | "mute";
    proofUrl: string;
    comment?: string | null;
  },
): Promise<{ url: string; comment: string | null; authorName: string | null; updatedAt: string }> {
  await ensureProofsTable();
  const sql = await getSql();

  const cleanUrl = String(data.proofUrl || "").trim();
  if (!cleanUrl || !/^https?:\/\//i.test(cleanUrl)) {
    throw new Error("Укажите корректную ссылку на доказательство (начинается с http:// или https://)");
  }

  const cleanComment = data.comment ? String(data.comment).trim().slice(0, 500) : null;
  const kind = data.kind === "ban" ? "ban" : "mute";
  const proofId = `${kind}_${data.recordId}`;
  const authorName = actor.displayName || actor.username || "Модератор";

  await sql`
    INSERT INTO punishment_proofs (
      id, record_id, kind, proof_url, comment, author_user_id, author_name, created_at, updated_at
    ) VALUES (
      ${proofId}, ${data.recordId}, ${kind}, ${cleanUrl}, ${cleanComment}, ${actor.userId}, ${authorName}, NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      proof_url = EXCLUDED.proof_url,
      comment = EXCLUDED.comment,
      author_user_id = EXCLUDED.author_user_id,
      author_name = EXCLUDED.author_name,
      updated_at = NOW()
  `;

  const { writeLog } = await import("./staff");
  await writeLog(
    actor.userId,
    "attach_proof",
    `Прикреплено доказательство к ${kind === "ban" ? "бану" : "муту"} #${data.recordId}: ${cleanUrl.slice(0, 80)}`,
  );

  return {
    url: cleanUrl,
    comment: cleanComment,
    authorName,
    updatedAt: new Date().toISOString(),
  };
}

export async function removeProof(
  actor: StaffProfile,
  data: {
    recordId: number;
    kind: "ban" | "mute";
  },
): Promise<void> {
  await ensureProofsTable();
  const sql = await getSql();
  const kind = data.kind === "ban" ? "ban" : "mute";
  const proofId = `${kind}_${data.recordId}`;

  await sql`
    DELETE FROM punishment_proofs WHERE id = ${proofId}
  `;

  const { writeLog } = await import("./staff");
  await writeLog(
    actor.userId,
    "remove_proof",
    `Удалено доказательство к ${kind === "ban" ? "бану" : "муту"} #${data.recordId}`,
  );
}
