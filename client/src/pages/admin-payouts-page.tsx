import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, CheckCircle, Banknote } from "lucide-react";

interface PayoutWithUser {
  id: string;
  userId: string;
  amount: number;
  bsb: string;
  accountNumber: string;
  accountName: string;
  status: string;
  createdAt: string;
  userEmail: string;
}

export default function AdminPayoutsPage() {
  const { toast } = useToast();

  const { data: payouts, isLoading } = useQuery<PayoutWithUser[]>({
    queryKey: ["/api/admin/payouts"],
  });

  const updatePayout = useMutation({
    mutationFn: async ({ payoutId, status }: { payoutId: string; status: string }) => {
      await apiRequest("PATCH", `/api/admin/payouts/${payoutId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
      toast({ title: "Updated", description: "Payout status updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const statusVariant = (status: string) => {
    switch (status) {
      case "paid": return "default";
      case "approved": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-admin-payouts-title">
          Payout Requests
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Review and process affiliate payout requests.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-4 pb-4">
                <Skeleton className="h-6 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : payouts && payouts.length > 0 ? (
        <div className="space-y-2">
          {payouts.map((p) => (
            <Card key={p.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium" data-testid={`text-payout-user-${p.id}`}>
                        {p.userEmail}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ${(p.amount / 100).toFixed(2)} &middot; {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(p.status) as any} data-testid={`badge-admin-payout-${p.id}`}>
                      {p.status}
                    </Badge>
                    {p.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updatePayout.mutate({ payoutId: p.id, status: "approved" })}
                        data-testid={`button-approve-${p.id}`}
                      >
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Approve
                      </Button>
                    )}
                    {p.status === "approved" && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => updatePayout.mutate({ payoutId: p.id, status: "paid" })}
                        data-testid={`button-mark-paid-${p.id}`}
                      >
                        <Banknote className="mr-1 h-3 w-3" />
                        Mark Paid
                      </Button>
                    )}
                  </div>
                </div>
                {(p.bsb || p.accountNumber || p.accountName) && (
                  <div className="mt-3 pt-3 border-t flex items-center gap-6 flex-wrap text-sm">
                    <div>
                      <span className="text-muted-foreground">Account Name: </span>
                      <span className="font-medium" data-testid={`text-payout-acct-name-${p.id}`}>{p.accountName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">BSB: </span>
                      <span className="font-medium" data-testid={`text-payout-bsb-${p.id}`}>{p.bsb}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Account #: </span>
                      <span className="font-medium" data-testid={`text-payout-acct-num-${p.id}`}>{p.accountNumber}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No payout requests.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
