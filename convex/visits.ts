import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const items = await ctx.db.query("visits").collect();
    const sorted = items.sort((a: any, b: any) => b.createdAt - a.createdAt);
    return sorted.slice(0, args.limit ?? 50);
  },
});

export const create = mutation({
  args: {
    ownerId: v.id("owners"),
    animalId: v.optional(v.id("animals")),
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
    const id = await ctx.db.insert("visits", {
      ownerId: args.ownerId,
      animalId: args.animalId ?? null,
      soap: args.soap,
      procedures: args.procedures ?? [],
      medications: args.medications ?? [],
      status: "draft",
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
  },
  handler: async (ctx, args) => {
    const patch: any = { updatedAt: Date.now() };
    if (args.soap !== undefined) patch.soap = args.soap;
    if (args.animalId !== undefined) patch.animalId = args.animalId;
    if (args.status !== undefined) patch.status = args.status;
    if (args.procedures !== undefined) patch.procedures = args.procedures;
    if (args.medications !== undefined) patch.medications = args.medications;
    await ctx.db.patch(args.id, patch);
    return { ok: true } as const;
  },
});


