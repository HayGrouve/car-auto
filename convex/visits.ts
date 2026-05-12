import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function generateHumanCode(prefix: string): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  const letters =
    String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
    String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `${prefix}${num}-${letters}`;
}

export const list = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    sort: v.optional(v.string()), // 'datetimeAsc' | 'datetimeDesc'
    status: v.optional(v.string()),
    customerId: v.optional(v.id("customers")),
    vehicleId: v.optional(v.id("vehicles")),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const allVisits = await ctx.db.query("visits").collect();
    const translitMap: Record<string, string> = {
      А: "A", а: "a", Б: "B", б: "b", В: "V", в: "v", Г: "G", г: "g",
      Д: "D", д: "d", Е: "E", е: "e", Ж: "zh", ж: "zh", З: "Z", з: "z",
      И: "i", и: "i", Й: "y", й: "y", К: "k", к: "k", Л: "l", л: "l",
      М: "m", м: "m", Н: "n", н: "n", О: "o", о: "o", П: "p", п: "p",
      Р: "r", р: "r", С: "s", с: "s", Т: "t", т: "t", У: "u", у: "u",
      Ф: "f", ф: "f", Х: "h", х: "h", Ц: "ts", ц: "ts", Ч: "ch", ч: "ch",
      Ш: "sh", ш: "sh", Щ: "sht", щ: "sht", Ъ: "a", ъ: "a", Ь: "", ь: "",
      Ю: "yu", ю: "yu", Я: "ya", я: "ya",
    };
    const toAscii = (s: string) =>
      Array.from(String(s))
        .map((ch) => translitMap[ch] ?? ch)
        .join("");
    const normalizePair = (s: string) => {
      const base = String(s ?? "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("bg")
        .replace(/["'`„“”]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      const ascii = toAscii(base).toLowerCase();
      return { base, ascii };
    };
    const queryPair = normalizePair(args.search ?? "");
    const matchesSearch = (value: unknown) => {
      if (!queryPair.base && !queryPair.ascii) return true;
      const p = normalizePair(String(value ?? ""));
      return (
        (p.base && queryPair.base && p.base.includes(queryPair.base)) ||
        (p.ascii && queryPair.ascii && p.ascii.includes(queryPair.ascii)) ||
        (p.base && queryPair.ascii && p.base.includes(queryPair.ascii)) ||
        (p.ascii && queryPair.base && p.ascii.includes(queryPair.base))
      );
    };

    const filtered = allVisits.filter((vDoc: any) => {
      if (args.status && vDoc.status !== args.status) return false;
      if (args.customerId && String(vDoc.customerId) !== String(args.customerId))
        return false;
      if (args.vehicleId && String(vDoc.vehicleId) !== String(args.vehicleId))
        return false;
      const t = vDoc.datetime ?? vDoc.createdAt;
      if (args.from && t < args.from) return false;
      if (args.to && t > args.to) return false;
      if (queryPair.base || queryPair.ascii) {
        const haystacks = [
          vDoc.code ?? vDoc._id,
          vDoc.notes?.issue,
          vDoc.notes?.inspection,
          vDoc.notes?.diagnosis,
          vDoc.notes?.plan,
          ...(vDoc.services ?? []),
          ...(vDoc.parts ?? []),
        ];
        if (!haystacks.some((v: any) => matchesSearch(v))) return false;
      }
      return true;
    });
    const byDesc = (a: any, b: any) =>
      (b.datetime ?? b.createdAt) - (a.datetime ?? a.createdAt);
    const byAsc = (a: any, b: any) =>
      (a.datetime ?? a.createdAt) - (b.datetime ?? b.createdAt);
    const sorted =
      args.sort === "datetimeAsc"
        ? filtered.sort(byAsc)
        : filtered.sort(byDesc);
    const total = sorted.length;
    const start = Math.max(0, args.offset ?? 0);
    const limit = args.limit ?? 50;
    const end = start + limit;
    const items = sorted.slice(start, end);
    const hasMore = end < total;
    return { items, total, hasMore };
  },
});

export const visitsFilters = query({
  args: {},
  handler: async (ctx) => {
    const visits = await ctx.db.query("visits").collect();
    const statusCounts: Record<string, number> = {};
    const customerIds = new Set<string>();
    const vehicleIds = new Set<string>();
    for (const visit of visits) {
      statusCounts[visit.status] = (statusCounts[visit.status] ?? 0) + 1;
      if (visit.customerId) customerIds.add(String(visit.customerId));
      if (visit.vehicleId) vehicleIds.add(String(visit.vehicleId));
    }
    return {
      statusCounts,
      customerIds: Array.from(customerIds),
      vehicleIds: Array.from(vehicleIds),
    } as const;
  },
});

export const create = mutation({
  args: {
    customerId: v.id("customers"),
    vehicleId: v.optional(v.id("vehicles")),
    datetime: v.optional(v.number()),
    mileage: v.optional(v.number()),
    notes: v.object({
      issue: v.optional(v.string()),
      inspection: v.optional(v.string()),
      diagnosis: v.optional(v.string()),
      plan: v.optional(v.string()),
    }),
    services: v.optional(v.array(v.string())),
    parts: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    // Prevent multiple draft visits per vehicle
    if (args.vehicleId) {
      const existing = await ctx.db.query("visits").collect();
      const existingDraft = existing.find(
        (vDoc: any) =>
          vDoc.status === "draft" && String(vDoc.vehicleId) === String(args.vehicleId),
      );
      if (existingDraft) {
        return {
          ok: false,
          reason: "draft_exists",
          id: existingDraft._id,
        } as const;
      }
    }
    // Generate human-friendly code (best-effort uniqueness)
    const existing = await ctx.db.query("visits").collect();
    let code = "";
    for (let i = 0; i < 5; i++) {
      const cand = generateHumanCode("VIS-");
      if (!existing.some((d: any) => d.code === cand)) {
        code = cand;
        break;
      }
    }
    const id = await ctx.db.insert("visits", {
      customerId: args.customerId,
      vehicleId: args.vehicleId ?? null,
      datetime: args.datetime ?? now,
      mileage: args.mileage ?? null,
      notes: args.notes,
      services: args.services ?? [],
      parts: args.parts ?? [],
      status: "draft",
      code,
      createdAt: now,
      updatedAt: now,
    } as any);
    return { ok: true, id } as const;
  },
});

export const finalize = mutation({
  args: { id: v.id("visits") },
  handler: async (ctx, args) => {
    const visit = await ctx.db.get(args.id);
    if (!visit) return { ok: false } as const;
    await ctx.db.patch(args.id, { status: "finalized", updatedAt: Date.now() });

    // Update schedule slot status to "completed" if linked to this visit
    try {
      const slots = await ctx.db
        .query("schedule")
        .filter((q: any) => q.eq(q.field("visitId"), args.id))
        .collect();
      for (const slot of slots) {
        await ctx.db.patch(slot._id, {
          status: "completed",
          updatedAt: Date.now(),
        } as any);
      }
    } catch (_) {
      // optional; ignore failures
    }

    // Upsert service/part catalogs with simple frequency counts
    const services: string[] = (visit as any).services ?? [];
    const parts: string[] = (visit as any).parts ?? [];
    // We store catalogs as documents in a dedicated table if it exists; otherwise, no-op
    try {
      for (const name of services) {
        const existing = await ctx.db
          .query("serviceCatalog")
          .filter((q: any) => q.eq(q.field("name"), name))
          .first();
        if (existing)
          await ctx.db.patch(existing._id, {
            count: (existing as any).count + 1,
          } as any);
        else await ctx.db.insert("serviceCatalog", { name, count: 1 } as any);
      }
    } catch (_) {
      // table may not exist; ignore
    }
    try {
      for (const name of parts) {
        const existing = await ctx.db
          .query("partCatalog")
          .filter((q: any) => q.eq(q.field("name"), name))
          .first();
        if (existing)
          await ctx.db.patch(existing._id, {
            count: (existing as any).count + 1,
          } as any);
        else
          await ctx.db.insert("partCatalog", { name, count: 1 } as any);
      }
    } catch (_) {
      // table may not exist; ignore
    }
    return { ok: true } as const;
  },
});

export const getById = query({
  args: { id: v.id("visits") },
  handler: async (ctx, args) => {
    const visit = await ctx.db.get(args.id);
    if (!visit) return null;

    const documents = (visit as any).documents ?? [];
    if (documents.length === 0) return visit;

    const documentsWithUrls = await Promise.all(
      documents.map(async (doc: any) => {
        if (doc.storageId) {
          const url = await ctx.storage.getUrl(doc.storageId);
          return { ...doc, url: url ?? undefined };
        }
        return doc;
      }),
    );

    return { ...visit, documents: documentsWithUrls };
  },
});

export const update = mutation({
  args: {
    id: v.id("visits"),
    datetime: v.optional(v.union(v.number(), v.null())),
    mileage: v.optional(v.union(v.number(), v.null())),
    notes: v.optional(
      v.object({
        issue: v.optional(v.string()),
        inspection: v.optional(v.string()),
        diagnosis: v.optional(v.string()),
        plan: v.optional(v.string()),
      }),
    ),
    vehicleId: v.optional(v.union(v.id("vehicles"), v.null())),
    status: v.optional(v.string()),
    services: v.optional(v.array(v.string())),
    parts: v.optional(v.array(v.string())),
    customerId: v.optional(v.union(v.id("customers"), v.null())),
    invoiceCode: v.optional(v.union(v.string(), v.null())),
    outstandingAmount: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const patch: any = { updatedAt: Date.now() };
    if (args.datetime !== undefined) patch.datetime = args.datetime;
    if (args.mileage !== undefined) patch.mileage = args.mileage;
    if (args.notes !== undefined) patch.notes = args.notes;
    if (args.vehicleId !== undefined) patch.vehicleId = args.vehicleId;
    if (args.status !== undefined) patch.status = args.status;
    if (args.services !== undefined) patch.services = args.services;
    if (args.parts !== undefined) patch.parts = args.parts;
    if (args.customerId !== undefined) patch.customerId = args.customerId;
    if (args.invoiceCode !== undefined) patch.invoiceCode = args.invoiceCode;
    if (args.outstandingAmount !== undefined)
      patch.outstandingAmount = args.outstandingAmount;
    await ctx.db.patch(args.id, patch);
    return { ok: true } as const;
  },
});

// Suggestions for services/parts (most frequent first)
export const suggestServices = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    try {
      const list = await ctx.db.query("serviceCatalog").collect();
      const sorted = list.sort(
        (a: any, b: any) => (b.count ?? 0) - (a.count ?? 0),
      );
      const limit = args.limit ?? 10;
      return sorted.slice(0, limit).map((r: any) => r.name);
    } catch (_) {
      return [] as string[];
    }
  },
});

export const suggestParts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    try {
      const list = await ctx.db.query("partCatalog").collect();
      const sorted = list.sort(
        (a: any, b: any) => (b.count ?? 0) - (a.count ?? 0),
      );
      const limit = args.limit ?? 10;
      return sorted.slice(0, limit).map((r: any) => r.name);
    } catch (_) {
      return [] as string[];
    }
  },
});

export const addAttachment = mutation({
  args: {
    visitId: v.id("visits"),
    storageId: v.string(),
    name: v.string(),
    type: v.optional(v.string()),
    size: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const visit = await ctx.db.get(args.visitId);
    if (!visit) throw new Error("Visit not found");
    if (visit.status !== "draft")
      throw new Error("Cannot add attachments to finalized visits");

    const documents = (visit as any).documents ?? [];
    const newDoc = {
      id: Math.random().toString(36).substring(2, 11),
      name: args.name,
      type: args.type,
      storageId: args.storageId,
      size: args.size,
      uploadedAt: Date.now(),
    };

    await ctx.db.patch(args.visitId, {
      documents: [...documents, newDoc],
      updatedAt: Date.now(),
    });

    return { ok: true };
  },
});

export const removeAttachment = mutation({
  args: {
    visitId: v.id("visits"),
    attachmentId: v.string(),
  },
  handler: async (ctx, args) => {
    const visit = await ctx.db.get(args.visitId);
    if (!visit) throw new Error("Visit not found");
    if (visit.status !== "draft")
      throw new Error("Cannot remove attachments from finalized visits");

    const documents = (visit as any).documents ?? [];
    const docToRemove = documents.find((d: any) => d.id === args.attachmentId);

    if (docToRemove?.storageId) {
      await ctx.storage.delete(docToRemove.storageId);
    }

    const newDocuments = documents.filter(
      (d: any) => d.id !== args.attachmentId,
    );

    await ctx.db.patch(args.visitId, {
      documents: newDocuments,
      updatedAt: Date.now(),
    });

    return { ok: true };
  },
});

export const generateAttachmentUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const remove = mutation({
  args: {
    id: v.id("visits"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { ok: true } as const;
  },
});
