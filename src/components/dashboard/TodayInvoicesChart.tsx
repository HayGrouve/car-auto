"use client";

import { Pie, PieChart, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { fmtNumberBG } from "@/lib/format";

type TodayInvoicesChartProps = {
  paid: number;
  unpaid: number;
};

const chartConfig = {
  paid: {
    label: "Платено",
    color: "hsl(142, 76%, 36%)", // Green color
  },
  unpaid: {
    label: "Неплатено",
    color: "hsl(0, 84%, 60%)", // Red color
  },
} satisfies ChartConfig;

export function TodayInvoicesChart({ paid, unpaid }: TodayInvoicesChartProps) {
  const total = paid + unpaid;
  const data = [
    { name: "paid", value: paid, fill: "var(--color-paid)" },
    { name: "unpaid", value: unpaid, fill: "var(--color-unpaid)" },
  ].filter((item) => item.value > 0); // Only show segments with values

  if (total === 0) {
    return (
      <div className="flex h-[300px] flex-col space-y-2 sm:h-[400px]">
        <h3 className="text-base font-medium sm:text-lg">Приходи днес</h3>
        <div className="text-muted-foreground flex flex-1 items-center justify-center rounded-lg border">
          Няма фактури за днес
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[300px] flex-col sm:h-[400px]">
      <h3 className="mb-2 text-base font-medium sm:text-lg">Приходи днес</h3>
      <ChartContainer config={chartConfig} className="min-h-0 w-full flex-1">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => {
                  const numValue =
                    typeof value === "number" ? value : (Number(value) ?? 0);
                  const label =
                    typeof name === "string"
                      ? (chartConfig[name as keyof typeof chartConfig]?.label ??
                        name)
                      : String(name ?? "");
                  const formatted = fmtNumberBG(numValue, {
                    style: "currency",
                    currency: "EUR",
                  });
                  return [formatted, label];
                }}
              />
            }
          />
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="40%"
            outerRadius="70%"
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <ChartLegend
            content={<ChartLegendContent nameKey="name" />}
            verticalAlign="bottom"
            className="mt-2"
          />
        </PieChart>
      </ChartContainer>
      <div className="text-muted-foreground mt-2 text-center text-xs sm:text-sm">
        Общо: {fmtNumberBG(total, { style: "currency", currency: "EUR" })}
      </div>
    </div>
  );
}
