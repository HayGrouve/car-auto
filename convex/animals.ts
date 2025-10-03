import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    sort: v.optional(v.string()), // 'createdAtAsc' | 'createdAtDesc'
    ownerId: v.optional(v.id("owners")),
    species: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("animals").collect();
    const owners = await ctx.db.query("owners").collect();
    const ownerMap = new Map<string, { name: string; phone?: string }>();
    owners.forEach((owner: any) => {
      if (!owner?.deletedAt) {
        ownerMap.set(String(owner._id), { name: owner.name, phone: owner.phone ?? undefined });
      }
    });
    let filtered = all;
    if (args.ownerId) {
      filtered = filtered.filter((a: any) => String(a.ownerId ?? "") === String(args.ownerId));
    }
    if (args.species) {
      const speciesLower = args.species.toLocaleLowerCase("bg");
      filtered = filtered.filter((a: any) => String(a.species ?? "").toLocaleLowerCase("bg") === speciesLower);
    }
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
    const toAscii = (s: string) => Array.from(String(s)).map((ch) => translitMap[ch] ?? ch).join("");
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
    const sliceWithOwner = (rows: any[]) => {
      const start = Math.max(0, args.offset ?? 0);
      const end = (args.limit ?? rows.length) + start;
      return rows.slice(start, end).map((doc: any) => {
        const ownerInfo = doc.ownerId ? ownerMap.get(String(doc.ownerId)) : undefined;
        return {
          ...doc,
          ownerName: ownerInfo?.name ?? null,
          ownerPhone: ownerInfo?.phone ?? null,
        };
      });
    };
    if (!q.base && !q.ascii) {
      const sorted = (args.sort === "createdAtAsc" ? filtered.sort(byDateAsc) : filtered.sort(byDateDesc));
      return sliceWithOwner(sorted);
    }
    const matches = (value: unknown) => {
      const p = normalizePair(String(value ?? ""));
      return (
        (p.base && q.base && p.base.includes(q.base)) ||
        (p.ascii && q.ascii && p.ascii.includes(q.ascii)) ||
        (p.base && q.ascii && p.base.includes(q.ascii)) ||
        (p.ascii && q.base && p.ascii.includes(q.base))
      );
    };
    const matched = filtered
      .filter((a: any) => [a.name, a.species, a.breed, a.microchip]
        .filter(Boolean).some((v: string) => matches(v)));
    const sorted = (args.sort === "createdAtAsc" ? matched.sort(byDateAsc) : matched.sort(byDateDesc));
    return sliceWithOwner(sorted);
  },
});

export const speciesOptions = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("animals").collect();
    const set = new Set<string>();
    for (const doc of all) {
      if (doc?.species) {
        set.add(String(doc.species));
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "bg"));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    species: v.string(),
    breed: v.optional(v.string()),
    sex: v.optional(v.string()),
    neutered: v.optional(v.boolean()),
    dob: v.optional(v.number()),
    microchip: v.optional(v.string()),
    ownerId: v.optional(v.id("owners")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const micro = args.microchip?.trim();
    if (micro) {
      const dup = (await ctx.db
        .query("animals")
        .filter((q) => q.eq(q.field("microchip"), micro))
        .collect())[0];
      if (dup) return { ok: false, reason: "microchip" } as any;
    }
    const id = await ctx.db.insert("animals", {
      name: args.name,
      species: args.species,
      breed: args.breed ?? null,
      sex: args.sex ?? null,
      neutered: args.neutered ?? false,
      dob: args.dob ?? null,
      microchip: micro ?? null,
      ownerId: args.ownerId ?? null,
      createdAt: now,
    } as any);
    return { ok: true, id } as any;
  },
});

export const getById = query({
  args: { id: v.id("animals") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const update = mutation({
  args: {
    id: v.id("animals"),
    name: v.optional(v.string()),
    species: v.optional(v.string()),
    breed: v.optional(v.union(v.string(), v.null())),
    sex: v.optional(v.union(v.string(), v.null())),
    neutered: v.optional(v.boolean()),
    dob: v.optional(v.union(v.number(), v.null())),
    microchip: v.optional(v.union(v.string(), v.null())),
    ownerId: v.optional(v.union(v.id("owners"), v.null())),
  },
  handler: async (ctx, args) => {
    const patch: any = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.species !== undefined) patch.species = args.species;
    if (args.breed !== undefined) patch.breed = args.breed;
    if (args.sex !== undefined) patch.sex = args.sex;
    if (args.neutered !== undefined) patch.neutered = args.neutered;
    if (args.dob !== undefined) patch.dob = args.dob;
    if (args.microchip !== undefined) patch.microchip = args.microchip?.trim() || null;
    if (args.ownerId !== undefined) patch.ownerId = args.ownerId;
    await ctx.db.patch(args.id, patch);
    return { ok: true } as const;
  },
});

export const listByOwner = query({
  args: { ownerId: v.id("owners") },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("animals").collect();
    return all.filter((a: any) => a.ownerId === args.ownerId);
  },
});


