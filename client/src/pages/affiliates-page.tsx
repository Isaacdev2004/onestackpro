import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Copy, DollarSign, Users, TrendingUp, Check, ArrowRight, Landmark } from "lucide-react";
import { Label } from "@/components/ui/label";
import type { PayoutRequest, Referral } from "@shared/schema";

export default function AffiliatesPage() {
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [bsb, setBsb] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  const { data: stats } = useQuery<{
    totalReferrals: number;
    activeReferrals: number;
    pendingPayouts: number;
  }>({
    queryKey: ["/api/affiliates/stats"],
  });

  const { data: payouts, isLoading: payoutsLoading } = useQuery<PayoutRequest[]>({
    queryKey: ["/api/affiliates/payouts"],
  });

  const payoutMutation = useMutation({
    mutationFn: async (data: { amount: number; bsb: string; accountNumber: string; accountName: string }) => {
      await apiRequest("POST", "/api/affiliates/payout", data);
    },
    onSuccess: () => {
      toast({ title: "Payout Requested", description: "Your payout request has been submitted." });
      queryClient.invalidateQueries({ queryKey: ["/api/affiliates/payouts"] });
      refetchUser();
      setPayoutAmount("");
      setBsb("");
      setAccountNumber("");
      setAccountName("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const earningsInDollars = (user?.earningsBalance || 0) / 100;
  const referralLink = `${window.location.origin}/?ref=${user?.referralCode || ""}`;

  function copyLink() {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "Copied", description: "Referral link copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  }

  function requestPayout() {
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid Amount", description: "Enter a valid amount.", variant: "destructive" });
      return;
    }
    if (!bsb.trim() || !accountNumber.trim() || !accountName.trim()) {
      toast({ title: "Missing Details", description: "Please fill in all bank details.", variant: "destructive" });
      return;
    }
    const amountCents = Math.round(amount * 100);
    if (amountCents > (user?.earningsBalance || 0)) {
      toast({ title: "Insufficient Balance", description: "You don't have enough earnings.", variant: "destructive" });
      return;
    }
    payoutMutation.mutate({ amount: amountCents, bsb: bsb.trim(), accountNumber: accountNumber.trim(), accountName: accountName.trim() });
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "paid": return "default";
      case "approved": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-affiliates-title">
          Affiliate <span className="gradient-text">Program</span>
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Share your referral link and earn {user?.commissionPercentage ?? 25}% recurring commissions on every subscription.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="stat-card">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs sm:text-sm text-muted-foreground">Balance</p>
              <DollarSign className="h-4 w-4 text-muted-foreground/60" />
            </div>
            <p className="text-xl sm:text-2xl font-semibold mt-2" data-testid="text-aff-balance">
              ${earningsInDollars.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs sm:text-sm text-muted-foreground">Total Referrals</p>
              <Users className="h-4 w-4 text-muted-foreground/60" />
            </div>
            <p className="text-xl sm:text-2xl font-semibold mt-2" data-testid="text-aff-referrals">
              {stats?.totalReferrals ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs sm:text-sm text-muted-foreground">Active</p>
              <TrendingUp className="h-4 w-4 text-muted-foreground/60" />
            </div>
            <p className="text-xl sm:text-2xl font-semibold mt-2" data-testid="text-aff-active">
              {stats?.activeReferrals ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6 pb-6">
          <h2 className="font-medium mb-3">Your Referral Link</h2>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={referralLink}
              className="font-mono text-sm"
              data-testid="input-referral-link"
            />
            <Button
              variant="outline"
              onClick={copyLink}
              data-testid="button-copy-referral"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Share this link with friends. When they subscribe, you earn {user?.commissionPercentage ?? 25}% of their subscription as recurring commission.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center gap-2 mb-4">
            <Landmark className="h-5 w-5 text-primary" />
            <h2 className="font-medium">Request Payout</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountName">Account Name</Label>
                <Input
                  id="accountName"
                  placeholder="John Smith"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  data-testid="input-account-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bsb">BSB</Label>
                <Input
                  id="bsb"
                  placeholder="123-456"
                  value={bsb}
                  onChange={(e) => setBsb(e.target.value)}
                  data-testid="input-bsb"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  placeholder="12345678"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  data-testid="input-account-number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payoutAmount">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    id="payoutAmount"
                    type="number"
                    placeholder="0.00"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    className="pl-7"
                    data-testid="input-payout-amount"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-xs text-muted-foreground">
                Available: ${earningsInDollars.toFixed(2)} &middot; Payouts are processed manually by the admin.
              </p>
              <Button
                onClick={requestPayout}
                disabled={payoutMutation.isPending || earningsInDollars <= 0}
                data-testid="button-request-payout"
              >
                {payoutMutation.isPending ? "Requesting..." : "Request Payout"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-medium mb-3">Payout History</h2>
        {payoutsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-4">
                  <Skeleton className="h-5 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : payouts && payouts.length > 0 ? (
          <div className="space-y-2">
            {payouts.map((p) => (
              <Card key={p.id}>
                <CardContent className="pt-4 pb-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium" data-testid={`text-payout-amount-${p.id}`}>
                      ${(p.amount / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                    <Badge variant={statusColor(p.status) as any} data-testid={`badge-payout-status-${p.id}`}>
                      {p.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-8 pb-8 text-center">
              <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No payout requests yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
