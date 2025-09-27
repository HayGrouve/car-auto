import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { unpaidOnly: v.optional(v.boolean()), ownerId: v.optional(v.id("owners")) },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("invoices").collect();
    let filtered = all;
    if (args.unpaidOnly) filtered = filtered.filter((i: any) => !i.paid);
    if (args.ownerId) filtered = filtered.filter((i: any) => String(i.ownerId) === String(args.ownerId));
    return filtered.sort((a: any, b: any) => b.createdAt - a.createdAt);
  },
});

export const create = mutation({
  args: {
    ownerId: v.id("owners"),
    animalId: v.optional(v.id("animals")),
    items: v.array(v.object({ description: v.string(), quantity: v.number(), price: v.number(), total: v.number() })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const total = args.items.reduce((sum, it) => sum + it.total, 0);
    const id = await ctx.db.insert("invoices", {
      ownerId: args.ownerId,
      animalId: args.animalId ?? null,
      items: args.items,
      total,
      paid: false,
      paidAt: null,
      createdAt: now,
    } as any);
    return { ok: true, id } as const;
  },
});

export const markPaid = mutation({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { paid: true, paidAt: Date.now() } as any);
    return { ok: true } as const;
  },
});

export const totals = query({
  args: { day: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const list = await ctx.db.query("invoices").collect();
    const dayStart = args.day ? new Date(args.day) : new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const rows = list.filter((i: any) => i.createdAt >= dayStart.getTime() && i.createdAt <= dayEnd.getTime());
    const paidTotal = rows.filter((r: any) => r.paid).reduce((s: number, r: any) => s + (r.total ?? 0), 0);
    const unpaidTotal = rows.filter((r: any) => !r.paid).reduce((s: number, r: any) => s + (r.total ?? 0), 0);
    return { paidTotal, unpaidTotal, count: rows.length } as const;
  },
});


