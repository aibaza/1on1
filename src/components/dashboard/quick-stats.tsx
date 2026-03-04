import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Calendar, TrendingUp } from "lucide-react";
import type { QuickStats as QuickStatsData } from "@/lib/queries/dashboard";

interface QuickStatsProps {
  stats: QuickStatsData;
}

export function QuickStats({ stats }: QuickStatsProps) {
  const items = [
    {
      label: "Direct Reports",
      value: stats.totalReports.toString(),
      icon: Users,
    },
    {
      label: "Sessions This Month",
      value: stats.sessionsThisMonth.toString(),
      icon: Calendar,
    },
    {
      label: "Average Score",
      value: stats.avgScore !== null ? stats.avgScore.toFixed(1) : "N/A",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.label}
            </CardTitle>
            <item.icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
