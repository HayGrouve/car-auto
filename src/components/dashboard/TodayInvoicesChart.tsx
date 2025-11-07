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

export function TodayInvoicesChart({
  paid,
  unpaid,
}: TodayInvoicesChartProps) {
  const total = paid + unpaid;
  const data = [
    { name: "paid", value: paid, fill: "var(--color-paid)" },
    { name: "unpaid", value: unpaid, fill: "var(--color-unpaid)" },
  ].filter((item) => item.value > 0); // Only show segments with values

  if (total === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Фактури днес</h3>
        <div className="flex h-[300px] items-center justify-center rounded-lg border text-muted-foreground">
          Няма фактури за днес
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <h3 className="mb-2 text-lg font-medium">Фактури днес</h3>
      <ChartContainer config={chartConfig} className="flex-1 w-full min-h-0">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => {
                  const numValue = typeof value === "number" ? value : Number(value) ?? 0;
                  const label = typeof name === "string"
                    ? (chartConfig[name as keyof typeof chartConfig]?.label ?? name)
                    : String(name ?? "");
                  return [
                    `${fmtNumberBG(numValue, { style: "currency", currency: "BGN" })}`,
                    label,
                  ];
                }}
              />
            }
          />
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
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
          />
        </PieChart>
      </ChartContainer>
      <div className="text-center text-sm text-muted-foreground">
        Общо: {fmtNumberBG(total, { style: "currency", currency: "BGN" })}
      </div>
    </div>
  );
}

