"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { fmtNumberBG } from "@/lib/format";

type StatusBarChartProps = {
  unpaidInvoices: number;
  draftVisits: number;
};

const chartConfig = {
  unpaidInvoices: {
    label: "Неплатени фактури",
    color: "hsl(0, 84%, 60%)", // Red color
  },
  draftVisits: {
    label: "Активни посещения",
    color: "hsl(38, 92%, 50%)", // Orange color
  },
} satisfies ChartConfig;

export function StatusBarChart({
  unpaidInvoices,
  draftVisits,
}: StatusBarChartProps) {
  const data = [
    {
      name: "Неплатени фактури",
      value: unpaidInvoices,
      fill: "var(--color-unpaidInvoices)",
    },
    {
      name: "Активни посещения",
      value: draftVisits,
      fill: "var(--color-draftVisits)",
    },
  ];

  const total = unpaidInvoices + draftVisits;

  if (total === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Статус</h3>
        <div className="text-muted-foreground flex h-[300px] items-center justify-center rounded-lg border">
          Няма неплатени фактури или активни посещения
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <h3 className="mb-2 text-lg font-medium">Общ статус</h3>
      <ChartContainer config={chartConfig} className="min-h-0 w-full flex-1">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={true}
            tickMargin={8}
            className="text-xs"
          />
          <YAxis
            tickLine={false}
            axisLine={true}
            tickMargin={8}
            className="text-xs"
            tickFormatter={(value) =>
              fmtNumberBG(Number(value) ?? 0, { maximumFractionDigits: 0 })
            }
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => {
                  const numValue =
                    typeof value === "number" ? value : (Number(value) ?? 0);
                  return `${fmtNumberBG(numValue, { maximumFractionDigits: 0 })}`;
                }}
                labelFormatter={(label) => String(label ?? "")}
              />
            }
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
