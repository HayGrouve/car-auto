import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Only fields allowed by `invoices.create` — strips e.g. legacy `total` so Convex validation passes. */
function invoiceLineItems(
  items: Array<{ name: string; quantity: number; price: number }>,
): Array<{ name: string; quantity: number; price: number }> {
  return items.map(({ name, quantity, price }) => ({
    name,
    quantity,
    price,
  }));
}

export const run = action({
  args: {
    customers: v.optional(v.number()),
    vehiclesPerCustomer: v.optional(v.number()),
    visitsPerVehicle: v.optional(v.number()),
    invoicesPerVisit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const customersCount = Math.max(1, args.customers ?? 5);
    const vehiclesPerCustomer = Math.max(1, args.vehiclesPerCustomer ?? 2);
    const visitsPerVehicle = Math.max(1, args.visitsPerVehicle ?? 1);
    const invoicesPerVisit = Math.max(0, args.invoicesPerVisit ?? 1);

    const firstNames = [
      "Иван", "Мария", "Георги", "Елена", "Петър", "Николай", "Румяна", "Даниела"
    ];
    const lastNames = [
      "Иванов", "Георгиева", "Петров", "Николова", "Попов", "Симеонова", "Димитров", "Костова"
    ];
    const streets = [
      "ул. Шипка 10", "бул. Витоша 25", "ул. Раковски 14", "бул. България 101", "ул. Славянска 7"
    ];

    const carMakes = ["Toyota", "Volkswagen", "BMW", "Mercedes-Benz", "Audi", "Ford", "Honda"];
    const modelsByMake: Record<string, string[]> = {
      "Toyota": ["Corolla", "Camry", "RAV4", "Yaris"],
      "Volkswagen": ["Golf", "Passat", "Tiguan", "Polo"],
      "BMW": ["3 Series", "5 Series", "X3", "X5"],
      "Mercedes-Benz": ["C-Class", "E-Class", "GLC", "GLE"],
      "Audi": ["A3", "A4", "Q5", "Q7"],
      "Ford": ["Focus", "Fiesta", "Kuga", "Mondeo"],
      "Honda": ["Civic", "CR-V", "Accord", "HR-V"],
    };
    const colors = ["Черен", "Бял", "Сребрист", "Сив", "Син", "Червен"];

    const servicePool = [
      "Смяна на масло и филтри",
      "Смяна на накладки",
      "Компютърна диагностика",
      "Реглаж на преден мост",
      "Смяна на ангренажен ремък"
    ];
    const partsPool = [
      "Моторно масло 5W-30",
      "Маслен филтър",
      "Въздушен филтър",
      "Предни накладки",
      "Спирачен диск"
    ];

    const visitNoteSamples = [
      {
        issue: "Странен скърцащ шум при спиране.",
        plan: "Проверка на спирачна система; смяна на предни накладки и дискове при нужда.",
      },
      {
        issue: "Просрочена смяна на масло; колата е за годишен преглед.",
        plan: "Смяна на моторно масло 5W-30, маслен, въздушен и поленов филтър; визуален преглед.",
      },
      {
        issue: "Тракане от мотора при студен старт.",
        plan: "Преглед на ангренаж; при износ — смяна на ремък/верига и ролки по препоръка.",
      },
      {
        issue: "Автомобилът дръпва наляво при спускане от ръцете на волана.",
        plan: "Проверка на геометрия преден мост; регулаж и баланс на колелата.",
      },
      {
        issue: "Свети check engine; усеща се леко механе при ускорение.",
        plan: "Компютърна диагностика; при грешка за сонда — смяна на ламбда сонда и зануляване.",
      },
      {
        issue: "Климатикът охлажда слабо; шум от компресора.",
        plan: "Проверка на налягане и изтичания; дозареждане или ремонт според констатацията.",
      },
      {
        issue: "Трудно палене сутрин; батерията е на 4+ години.",
        plan: "Тест на акумулатор и генератор; смяна на акумулатор при паднал капацитет.",
      },
      {
        issue: "Съединителят прихлъзва при по-силно ускорение.",
        plan: "Демонтаж на КПП; смяна на съединителен комплект и преглед на маховик.",
      },
    ] as const;

    const customers: string[] = [];
    const vehicles: string[] = [];
    const visits: string[] = [];
    const invoices: string[] = [];

    // Create customers
    for (let i = 0; i < customersCount; i++) {
      const name = `${pick(firstNames)} ${pick(lastNames)}`;
      const phone = `0${randInt(87, 89)}${randInt(1000000, 9999999)}`;
      const email = `user${Date.now()}_${i}@example.com`;
      const address = pick(streets);
      const o = (await ctx.runMutation(api.customers.create, {
        name,
        phone,
        email,
        address,
        gdprConsent: true,
        notes: "Редовен клиент",
      })) as unknown as { ok: boolean; id: string };
      if (o?.ok && o.id) customers.push(o.id);
    }

    // Create vehicles for each customer
    for (const customerId of customers) {
      for (let j = 0; j < vehiclesPerCustomer; j++) {
        const make = pick(carMakes);
        const model = pick(modelsByMake[make] ?? [""]);
        const licensePlate = `СВ${randInt(1000, 9999)}${String.fromCharCode(65 + randInt(0, 25))}${String.fromCharCode(65 + randInt(0, 25))}`;
        const a = (await ctx.runMutation(api.vehicles.create, {
          licensePlate,
          make,
          model,
          color: pick(colors),
          year: randInt(2005, 2024),
          vin: `WBA${randInt(10000000000000, 99999999999999)}`,
          customerId: customerId as any,
        })) as unknown as { ok: boolean; id: string };
        if (a?.ok && a.id) vehicles.push(a.id);
      }
    }

    // Create visits per vehicle
    for (const vehicleId of vehicles) {
      const customerId = pick(customers);
      for (let k = 0; k < visitsPerVehicle; k++) {
        const when = Date.now() - randInt(0, 14) * 24 * 60 * 60 * 1000;
        const vCreated = (await ctx.runMutation(api.visits.create, {
          customerId: customerId as any,
          vehicleId: vehicleId as any,
          datetime: when,
          mileage: randInt(50000, 250000),
          notes: pick(visitNoteSamples),
          services: [pick(servicePool)],
          parts: Math.random() < 0.5 ? [pick(partsPool)] : [],
        })) as unknown as { ok: boolean; id: string };
        
        if (vCreated?.ok && vCreated.id) {
          visits.push(vCreated.id);
          if (Math.random() < 0.6) {
            await ctx.runMutation(api.visits.finalize, {
              id: vCreated.id as any,
            });
          }

          for (let m = 0; m < invoicesPerVisit; m++) {
            const parts = invoiceLineItems([
              { name: "Предни накладки", quantity: 1, price: 80 },
            ]);
            const labor = invoiceLineItems([
              { name: "Смяна на накладки", quantity: 1, price: 50 },
            ]);
            const inv = (await ctx.runMutation(api.invoices.create, {
              customerId: customerId as any,
              vehicleId: vehicleId as any,
              visitId: vCreated.id as any,
              parts,
              labor,
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
        customers: customers.length,
        vehicles: vehicles.length,
        visits: visits.length,
        invoices: invoices.length,
      },
    } as const;
  },
});
