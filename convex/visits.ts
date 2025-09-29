import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function generateHumanCode(prefix: string): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  const letters = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `${prefix}${num}-${letters}`;
}

export const list = query({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(v.string()),
    ownerId: v.optional(v.id("owners")),
    animalId: v.optional(v.id("animals")),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const items = await ctx.db.query("visits").collect();
    const filtered = items.filter((vDoc: any) => {
      if (args.status && vDoc.status !== args.status) return false;
      if (args.ownerId && String(vDoc.ownerId) !== String(args.ownerId)) return false;
      if (args.animalId && String(vDoc.animalId) !== String(args.animalId)) return false;
      const t = vDoc.datetime ?? vDoc.createdAt;
      if (args.from && t < args.from) return false;
      if (args.to && t > args.to) return false;
      return true;
    });
    const sorted = filtered.sort((a: any, b: any) => (b.datetime ?? b.createdAt) - (a.datetime ?? a.createdAt));
    return sorted.slice(0, args.limit ?? 50);
  },
});

export const create = mutation({
  args: {
    ownerId: v.id("owners"),
    animalId: v.optional(v.id("animals")),
    datetime: v.optional(v.number()),
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
    // Generate human-friendly code (best-effort uniqueness)
    const existing = await ctx.db.query("visits").collect();
    let code = "";
    for (let i = 0; i < 5; i++) {
      const cand = generateHumanCode("VIS-");
      if (!existing.some((d: any) => d.code === cand)) { code = cand; break; }
    }
    const id = await ctx.db.insert("visits", {
      ownerId: args.ownerId,
      animalId: args.animalId ?? null,
      datetime: args.datetime ?? now,
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
    soap: v.optional(v.object({
      s: v.optional(v.string()),
      o: v.optional(v.string()),
      a: v.optional(v.string()),
      p: v.optional(v.string()),
    })),
    animalId: v.optional(v.union(v.id("animals"), v.null())),
    status: v.optional(v.string()),
    procedures: v.optional(v.array(v.string())),
    medications: v.optional(v.array(v.string())),
    ownerId: v.optional(v.union(v.id("owners"), v.null())),
  },
  handler: async (ctx, args) => {
    const patch: any = { updatedAt: Date.now() };
    if (args.datetime !== undefined) patch.datetime = args.datetime;
    if (args.soap !== undefined) patch.soap = args.soap;
    if (args.animalId !== undefined) patch.animalId = args.animalId;
    if (args.status !== undefined) patch.status = args.status;
    if (args.procedures !== undefined) patch.procedures = args.procedures;
    if (args.medications !== undefined) patch.medications = args.medications;
    if (args.ownerId !== undefined) patch.ownerId = args.ownerId;
    await ctx.db.patch(args.id, patch);
    return { ok: true } as const;
  },
});


