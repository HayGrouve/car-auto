import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const list = query({
  args: {
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    date: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let items = await ctx.db.query("schedule").collect();

    if (args.date !== undefined) {
      const dayStart = new Date(args.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(args.date);
      dayEnd.setHours(23, 59, 59, 999);
      items = items.filter(
        (item: any) =>
          item.date >= dayStart.getTime() && item.date <= dayEnd.getTime(),
      );
    } else if (args.from !== undefined && args.to !== undefined) {
      items = items.filter(
        (item: any) =>
          item.date >= args.from! && item.date <= args.to!,
      );
    }

    return items.sort((a: any, b: any) => a.startTime - b.startTime);
  },
});

export const getByDate = query({
  args: {
    date: v.number(),
  },
  handler: async (ctx, args) => {
    // args.date is already start of day timestamp
    const dayStart = args.date;
    const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1; // end of day
    const items = await ctx.db
      .query("schedule")
      .filter((q: any) => q.gte(q.field("date"), dayStart))
      .filter((q: any) => q.lte(q.field("date"), dayEnd))
      .collect();
    return items.sort((a: any, b: any) => a.startTime - b.startTime);
  },
});

export const create = mutation({
  args: {
    date: v.number(),
    startTime: v.number(),
    endTime: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    visitId: v.optional(v.id("visits")),
    ownerId: v.optional(v.id("owners")),
    animalId: v.optional(v.id("animals")),
    status: v.optional(v.union(v.literal("scheduled"), v.literal("completed"), v.literal("cancelled"))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("schedule", {
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      title: args.title,
      description: args.description ?? null,
      visitId: args.visitId ?? null,
      ownerId: args.ownerId ?? null,
      animalId: args.animalId ?? null,
      status: args.status ?? "scheduled",
      createdAt: now,
      updatedAt: now,
    } as any);
    return { ok: true, id };
  },
});

export const update = mutation({
  args: {
    id: v.id("schedule"),
    date: v.optional(v.number()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    visitId: v.optional(v.id("visits")),
    ownerId: v.optional(v.id("owners")),
    animalId: v.optional(v.id("animals")),
    status: v.optional(v.union(v.literal("scheduled"), v.literal("completed"), v.literal("cancelled"))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      return { ok: false, reason: "not_found" };
    }
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    } as any);
    return { ok: true };
  },
});

export const remove = mutation({
  args: {
    id: v.id("schedule"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

export const move = mutation({
  args: {
    id: v.id("schedule"),
    date: v.number(),
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      return { ok: false, reason: "not_found" };
    }
    await ctx.db.patch(args.id, {
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      updatedAt: Date.now(),
    } as any);
    return { ok: true };
  },
});

