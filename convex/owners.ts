import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    sort: v.optional(v.string()), // 'createdAtAsc' | 'createdAtDesc'
    phone: v.optional(v.string()),
    gdpr: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("owners").collect();
    let filtered = all.filter((o: any) => !o.deletedAt);
    if (args.phone) {
      const normalized = args.phone.replace(/\D/g, "");
      filtered = filtered.filter((o: any) =>
        String(o.phone ?? "").includes(normalized),
      );
    }
    if (args.gdpr !== undefined) {
      filtered = filtered.filter(
        (o: any) => Boolean(o.gdprConsent) === Boolean(args.gdpr),
      );
    }
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
      const base = String(s)
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("bg")
        .replace(/["'`„“”]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      const ascii = toAscii(base).toLowerCase();
      return { base, ascii };
    };
    const q = normalizePair(args.search ?? "");
    const byDateDesc = (a: any, b: any) => b.createdAt - a.createdAt;
    const byDateAsc = (a: any, b: any) => a.createdAt - b.createdAt;
    let sorted: any[];
    if (!q.base && !q.ascii) {
      sorted =
        args.sort === "createdAtAsc"
          ? filtered.sort(byDateAsc)
          : filtered.sort(byDateDesc);
    } else {
      const matches = (value: unknown) => {
        const p = normalizePair(String(value ?? ""));
        return (
          (p.base && q.base && p.base.includes(q.base)) ||
          (p.ascii && q.ascii && p.ascii.includes(q.ascii)) ||
          (p.base && q.ascii && p.base.includes(q.ascii)) ||
          (p.ascii && q.base && p.ascii.includes(q.base))
        );
      };
      const matched = filtered.filter((o: any) =>
        [o.name, o.phone, o.email]
          .filter(Boolean)
          .some((v: string) => matches(v)),
      );
      sorted =
        args.sort === "createdAtAsc"
          ? matched.sort(byDateAsc)
          : matched.sort(byDateDesc);
    }
    const total = sorted.length;
    const start = Math.max(0, args.offset ?? 0);
    const limit = args.limit ?? total;
    const end = limit + start;
    const items = sorted.slice(start, end);
    const hasMore = end < total;
    return { items, total, hasMore };
  },
});

export const ownersFilters = query({
  args: {},
  handler: async (ctx) => {
    const owners = await ctx.db.query("owners").collect();
    const phonePrefixes = new Set<string>();
    let gdprGranted = 0;
    for (const owner of owners) {
      const phone = String(owner.phone ?? "");
      if (phone.length >= 2) {
        phonePrefixes.add(phone.slice(0, 2));
      }
      if (owner.gdprConsent) gdprGranted += 1;
    }
    return {
      phonePrefixes: Array.from(phonePrefixes).sort(),
      statistics: {
        total: owners.length,
        gdprGranted,
        gdprMissing: owners.length - gdprGranted,
      },
    } as const;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    gdprConsent: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const phoneNormalized = args.phone.replace(/\D/g, "");
    // Prevent duplicates by phone or email (if provided)
    const dupByPhone = (
      await ctx.db
        .query("owners")
        .filter((q) => q.eq(q.field("phone"), phoneNormalized))
        .collect()
    )[0];
    if (dupByPhone) {
      return { ok: false, reason: "phone" } as any;
    }
    if (args.email) {
      const dupByEmail = (
        await ctx.db
          .query("owners")
          .filter((q) => q.eq(q.field("email"), args.email))
          .collect()
      )[0];
      if (dupByEmail) {
        return { ok: false, reason: "email" } as any;
      }
    }
    const doc = {
      name: args.name,
      phone: phoneNormalized,
      email: args.email ?? null,
      address: args.address ?? null,
      gdprConsent: args.gdprConsent,
      createdAt: now,
      deletedAt: null,
      // GDPR: legal hold prevents deletion when enabled
      legalHold: false,
    } as any;
    const id = await ctx.db.insert("owners", doc);
    // Audit log: owner created
    await ctx.db.insert("auditLogs", {
      at: now,
      actor: "system",
      entityType: "owner",
      entityId: id,
      action: "create",
      details: { name: doc.name, phone: doc.phone },
    } as any);
    return { ok: true, id } as any;
  },
});

export const getById = query({
  args: { id: v.id("owners") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const update = mutation({
  args: {
    id: v.id("owners"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.union(v.string(), v.null())),
    address: v.optional(v.union(v.string(), v.null())),
    gdprConsent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const patch: any = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.phone !== undefined) patch.phone = args.phone?.replace(/\D/g, "");
    if (args.email !== undefined) patch.email = args.email ?? null;
    if (args.address !== undefined) patch.address = args.address ?? null;
    if (args.gdprConsent !== undefined) patch.gdprConsent = args.gdprConsent;
    await ctx.db.patch(args.id, patch);
    await ctx.db.insert("auditLogs", {
      at: Date.now(),
      actor: "system",
      entityType: "owner",
      entityId: args.id,
      action: "update",
      details: Object.keys(patch),
    } as any);
    return { ok: true } as const;
  },
});

export const softDelete = mutation({
  args: { id: v.id("owners") },
  handler: async (ctx, args) => {
    const current = await ctx.db.get(args.id);
    if (current?.legalHold) {
      return { ok: false, reason: "legalHold" } as any;
    }
    await ctx.db.patch(args.id, { deletedAt: Date.now() } as any);
    await ctx.db.insert("auditLogs", {
      at: Date.now(),
      actor: "system",
      entityType: "owner",
      entityId: args.id,
      action: "softDelete",
    } as any);
    return { ok: true } as const;
  },
});

export const setLegalHold = mutation({
  args: { id: v.id("owners"), legalHold: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { legalHold: args.legalHold } as any);
    await ctx.db.insert("auditLogs", {
      at: Date.now(),
      actor: "system",
      entityType: "owner",
      entityId: args.id,
      action: args.legalHold ? "legalHold:on" : "legalHold:off",
    } as any);
    return { ok: true } as const;
  },
});
