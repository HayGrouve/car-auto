import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const run = action({
  args: {
    owners: v.optional(v.number()),
    animalsPerOwner: v.optional(v.number()),
    visitsPerAnimal: v.optional(v.number()),
    invoicesPerVisit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const ownersCount = Math.max(1, args.owners ?? 5);
    const animalsPerOwner = Math.max(1, args.animalsPerOwner ?? 2);
    const visitsPerAnimal = Math.max(1, args.visitsPerAnimal ?? 1);
    const invoicesPerVisit = Math.max(0, args.invoicesPerVisit ?? 1);

    const ownerFirstNames = [
      "Иван",
      "Мария",
      "Георги",
      "Елена",
      "Петър",
      "Николай",
      "Румяна",
      "Даниела",
    ];
    const ownerLastNames = [
      "Иванов",
      "Георгиева",
      "Петров",
      "Николова",
      "Попов",
      "Симеонова",
      "Димитров",
      "Костова",
    ];
    const streets = [
      "ул. Шипка 10",
      "бул. Витоша 25",
      "ул. Раковски 14",
      "бул. България 101",
      "ул. Славянска 7",
    ];

    const animalNames = [
      "Рекс",
      "Мая",
      "Луна",
      "Макс",
      "Сара",
      "Оскар",
      "Чара",
      "Коко",
    ];
    const species = ["Куче", "Котка", "Заек", "Морско свинче"];
    const breedsBySpecies: Record<string, string[]> = {
      Куче: ["Лабрадор", "Джак Ръсел", "Бигъл", "Немска овчарка"],
      Котка: ["Европейска", "Сиамска", "Мейн Кун"],
      Заек: ["Холандско джудже", "Рекс"],
      "Морско свинче": ["Абисинско", "Ангорско"],
    };

    const procedurePool = [
      "Ваксинация",
      "Обезпаразитяване",
      "Почистване на зъби",
      "Преглед",
    ];
    const medsPool = [
      "Амоксицилин",
      "Ибупрофен (вет.)",
      "Витамини",
      "Антибиотик",
    ];

    const owners: string[] = [];
    const animals: string[] = [];
    const visits: string[] = [];
    const invoices: string[] = [];

    // Create owners
    for (let i = 0; i < ownersCount; i++) {
      const name = `${pick(ownerFirstNames)} ${pick(ownerLastNames)}`;
      const phone = `0${randInt(87, 89)}${randInt(1000000, 9999999)}`; // 0 87x yyyyyyy
      const email = `user${Date.now()}_${i}@example.com`;
      const address = pick(streets);
      const o = (await ctx.runMutation(api.owners.create, {
        name,
        phone,
        email,
        address,
        gdprConsent: true,
      })) as unknown as { ok: boolean; id: string };
      if (o?.ok && o.id) owners.push(o.id);
    }

    // Create animals for each owner
    for (const ownerId of owners) {
      for (let j = 0; j < animalsPerOwner; j++) {
        const sp = pick(species);
        const a = (await ctx.runMutation(api.animals.create, {
          name: pick(animalNames),
          species: sp,
          breed: pick(breedsBySpecies[sp] ?? [""]) || undefined,
          neutered: Math.random() < 0.5,
          ownerId: ownerId as any,
        })) as unknown as { ok: boolean; id: string };
        if (a?.ok && a.id) animals.push(a.id);
      }
    }

    // Create visits per animal
    for (const animalId of animals) {
      // Random owner from created (for relational realism could lookup actual owner, keeping simple here)
      const ownerId = pick(owners);
      for (let k = 0; k < visitsPerAnimal; k++) {
        const when = Date.now() - randInt(0, 14) * 24 * 60 * 60 * 1000; // within last 2 weeks
        const vCreated = (await ctx.runMutation(api.visits.create, {
          ownerId: ownerId as any,
          animalId: animalId as any,
          datetime: when,
          soap: {
            s: "Собственикът съобщава за намален апетит.",
            o: "Температурата е в норма, пулсът нормален.",
            a: "Лека вирусна инфекция",
            p: "Покой, витамини, хидратация",
          },
          procedures: [pick(procedurePool)],
          medications: Math.random() < 0.5 ? [pick(medsPool)] : [],
        })) as unknown as { ok: boolean; id: string };
        if (vCreated?.ok && vCreated.id) {
          visits.push(vCreated.id);
          // Randomly finalize some visits
          if (Math.random() < 0.6) {
            await ctx.runMutation(api.visits.finalize, {
              id: vCreated.id as any,
            });
          }

          // Optionally create invoices per visit
          for (let m = 0; m < invoicesPerVisit; m++) {
            const items = [
              { description: "Преглед", quantity: 1, price: 30, total: 30 },
              ...(Math.random() < 0.5
                ? [
                    {
                      description: "Ваксина",
                      quantity: 1,
                      price: 25,
                      total: 25,
                    },
                  ]
                : []),
            ];
            const inv = (await ctx.runMutation(api.invoices.create, {
              ownerId: ownerId as any,
              animalId: animalId as any,
              visitId: vCreated.id as any,
              items,
            })) as unknown as { ok: boolean; id: string };
            if (inv?.ok && inv.id) {
              invoices.push(inv.id);
              if (Math.random() < 0.5) {
                await ctx.runMutation(api.invoices.markPaid, {
                  id: inv.id as any,
                });
              }
            }
          }
        }
      }
    }

    return {
      ok: true,
      created: {
        owners: owners.length,
        animals: animals.length,
        visits: visits.length,
        invoices: invoices.length,
      },
    } as const;
  },
});
