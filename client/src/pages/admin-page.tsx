import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Wrench, DollarSign, Activity } from "lucide-react";

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalTools: number;
  pendingPayouts: number;
}

export default function AdminPage() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-admin-title">
          Admin <span className="gradient-text">Dashboard</span>
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Overview of platform activity and management.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total Users", value: stats?.totalUsers, icon: Users },
          { label: "Active Subscriptions", value: stats?.activeSubscriptions, icon: Activity },
          { label: "Total Tools", value: stats?.totalTools, icon: Wrench },
          { label: "Pending Payouts", value: stats?.pendingPayouts, icon: DollarSign },
        ].map((item) => (
          <Card key={item.label} className="stat-card">
            <CardContent className="pt-4 pb-4 sm:pt-5 sm:pb-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs sm:text-sm text-muted-foreground">{item.label}</p>
                <item.icon className="h-4 w-4 text-muted-foreground/60" />
              </div>
              <p className="text-xl sm:text-2xl font-semibold mt-2">
                {isLoading ? <Skeleton className="h-7 w-12" /> : item.value ?? 0}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
