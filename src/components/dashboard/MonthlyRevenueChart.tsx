"use client";

import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { fmtNumberBG, APP_CURRENCY } from "@/lib/format";

type MonthlyRevenueChartProps = {
  data: {
    name: string;
    paid: number;
    unpaid: number;
  }[];
};

const chartConfig = {
  paid: {
    label: " Платено",
    color: "hsl(142, 76%, 36%)",
  },
  unpaid: {
    label: " Неплатено",
    color: "hsl(0, 84%, 60%)",
  },
} satisfies ChartConfig;

export function MonthlyRevenueChart({ data }: MonthlyRevenueChartProps) {
  return (
    <div className="flex h-[300px] flex-col sm:h-[400px]">
      <h3 className="mb-2 text-base font-medium sm:text-lg">
        Приходи по месеци
      </h3>
      <ChartContainer config={chartConfig} className="min-h-0 w-full flex-1">
        <BarChart
          data={data}
          barCategoryGap="20%"
          margin={{
            top: 20,
            right: 10,
            left: 10,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            fontSize={12}
            interval={0}
            padding={{ left: 10, right: 10 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tickFormatter={(value) =>
              fmtNumberBG(Number(value) || 0, {
                style: "currency",
                currency: APP_CURRENCY,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })
            }
          />
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
                  return [
                    fmtNumberBG(numValue, {
                      style: "currency",
                      currency: APP_CURRENCY,
                    }),
                    label,
                  ];
                }}
              />
            }
          />
          <Bar
            dataKey="paid"
            stackId="a"
            fill="var(--color-paid)"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="unpaid"
            stackId="a"
            fill="var(--color-unpaid)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
