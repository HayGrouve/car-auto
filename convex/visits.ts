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
    ownerId: v.optional(v.id("owners")),
    animalId: v.optional(v.id("animals")),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const items = await ctx.db.query("visits").collect();
    const translitMap: Record<string, string> = {
      А: "A",
      а: "a",
      Б: "B",
      б: "b",
      В: "V",
      в: "v",
      Г: "G",
      г: "g",
      Д: "D",
      д: "d",
      Е: "E",
      е: "e",
      Ж: "zh",
      ж: "zh",
      З: "Z",
      з: "z",
      И: "i",
      и: "i",
      Й: "y",
      й: "y",
      К: "k",
      к: "k",
      Л: "l",
      л: "l",
      М: "m",
      м: "m",
      Н: "n",
      н: "n",
      О: "o",
      о: "o",
      П: "p",
      п: "p",
      Р: "r",
      р: "r",
      С: "s",
      с: "s",
      Т: "t",
      т: "t",
      У: "u",
      у: "u",
      Ф: "f",
      ф: "f",
      Х: "h",
      х: "h",
      Ц: "ts",
      ц: "ts",
      Ч: "ch",
      ч: "ch",
      Ш: "sh",
      ш: "sh",
      Щ: "sht",
      щ: "sht",
      Ъ: "a",
      ъ: "a",
      Ь: "",
      ь: "",
      Ю: "yu",
      ю: "yu",
      Я: "ya",
      я: "ya",
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

    const filtered = items.filter((vDoc: any) => {
      if (args.status && vDoc.status !== args.status) return false;
      if (args.ownerId && String(vDoc.ownerId) !== String(args.ownerId))
        return false;
      if (args.animalId && String(vDoc.animalId) !== String(args.animalId))
        return false;
      const t = vDoc.datetime ?? vDoc.createdAt;
      if (args.from && t < args.from) return false;
      if (args.to && t > args.to) return false;
      if (queryPair.base || queryPair.ascii) {
        const haystacks = [
          vDoc.code ?? vDoc._id,
          vDoc.subjective,
          vDoc.objective,
          ...(vDoc.procedures ?? []),
          ...(vDoc.medications ?? []),
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
    const start = Math.max(0, args.offset ?? 0);
    const size = args.limit ?? 50;
    return sorted.slice(start, start + size);
  },
});

export const visitsFilters = query({
  args: {},
  handler: async (ctx) => {
    const visits = await ctx.db.query("visits").collect();
    const statusCounts: Record<string, number> = {};
    const ownerIds = new Set<string>();
    const animalIds = new Set<string>();
    for (const visit of visits) {
      statusCounts[visit.status] = (statusCounts[visit.status] ?? 0) + 1;
      if (visit.ownerId) ownerIds.add(String(visit.ownerId));
      if (visit.animalId) animalIds.add(String(visit.animalId));
    }
    return {
      statusCounts,
      ownerIds: Array.from(ownerIds),
      animalIds: Array.from(animalIds),
    } as const;
  },
});

export const create = mutation({
  args: {
    ownerId: v.id("owners"),
    animalId: v.optional(v.id("animals")),
    datetime: v.optional(v.number()),
    // Measurements (optional)
    weight: v.optional(v.number()),
    temperature: v.optional(v.number()),
    pulse: v.optional(v.number()),
    soap: v.object({
      s: v.optional(v.string()),
      o: v.optional(v.string()),
      a: v.optional(v.string()),
      p: v.optional(v.string()),
    }),
    procedures: v.optional(v.array(v.string())),
    medications: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    // Prevent multiple draft visits per animal
    if (args.animalId) {
      const existing = await ctx.db.query("visits").collect();
      const existingDraft = existing.find(
        (v: any) =>
          v.status === "draft" && String(v.animalId) === String(args.animalId),
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
      ownerId: args.ownerId,
      animalId: args.animalId ?? null,
      datetime: args.datetime ?? now,
      weight: args.weight ?? null,
      temperature: args.temperature ?? null,
      pulse: args.pulse ?? null,
      soap: args.soap,
      procedures: args.procedures ?? [],
      medications: args.medications ?? [],
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
    // Upsert procedure/medication catalogs with simple frequency counts
    const procedures: string[] = (visit as any).procedures ?? [];
    const medications: string[] = (visit as any).medications ?? [];
    // We store catalogs as documents in a dedicated table if it exists; otherwise, no-op
    try {
      for (const name of procedures) {
        const existing = await ctx.db
          .query("procedureCatalog")
          .filter((q: any) => q.eq(q.field("name"), name))
          .first();
        if (existing)
          await ctx.db.patch(existing._id, {
            count: (existing as any).count + 1,
          } as any);
        else await ctx.db.insert("procedureCatalog", { name, count: 1 } as any);
      }
    } catch (_) {
      // table may not exist; ignore
    }
    try {
      for (const name of medications) {
        const existing = await ctx.db
          .query("medicationCatalog")
          .filter((q: any) => q.eq(q.field("name"), name))
          .first();
        if (existing)
          await ctx.db.patch(existing._id, {
            count: (existing as any).count + 1,
          } as any);
        else
          await ctx.db.insert("medicationCatalog", { name, count: 1 } as any);
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
    return await ctx.db.get(args.id);
  },
});

export const update = mutation({
  args: {
    id: v.id("visits"),
    datetime: v.optional(v.union(v.number(), v.null())),
    weight: v.optional(v.union(v.number(), v.null())),
    temperature: v.optional(v.union(v.number(), v.null())),
    pulse: v.optional(v.union(v.number(), v.null())),
    soap: v.optional(
      v.object({
        s: v.optional(v.string()),
        o: v.optional(v.string()),
        a: v.optional(v.string()),
        p: v.optional(v.string()),
      }),
    ),
    animalId: v.optional(v.union(v.id("animals"), v.null())),
    status: v.optional(v.string()),
    procedures: v.optional(v.array(v.string())),
    medications: v.optional(v.array(v.string())),
    ownerId: v.optional(v.union(v.id("owners"), v.null())),
    invoiceCode: v.optional(v.union(v.string(), v.null())),
    outstandingAmount: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const patch: any = { updatedAt: Date.now() };
    if (args.datetime !== undefined) patch.datetime = args.datetime;
    if (args.weight !== undefined) patch.weight = args.weight;
    if (args.temperature !== undefined) patch.temperature = args.temperature;
    if (args.pulse !== undefined) patch.pulse = args.pulse;
    if (args.soap !== undefined) patch.soap = args.soap;
    if (args.animalId !== undefined) patch.animalId = args.animalId;
    if (args.status !== undefined) patch.status = args.status;
    if (args.procedures !== undefined) patch.procedures = args.procedures;
    if (args.medications !== undefined) patch.medications = args.medications;
    if (args.ownerId !== undefined) patch.ownerId = args.ownerId;
    if (args.invoiceCode !== undefined) patch.invoiceCode = args.invoiceCode;
    if (args.outstandingAmount !== undefined)
      patch.outstandingAmount = args.outstandingAmount;
    await ctx.db.patch(args.id, patch);
    return { ok: true } as const;
  },
});

// Suggestions for procedures/medications (most frequent first)
export const suggestProcedures = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    try {
      const list = await ctx.db.query("procedureCatalog").collect();
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

export const suggestMedications = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    try {
      const list = await ctx.db.query("medicationCatalog").collect();
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
