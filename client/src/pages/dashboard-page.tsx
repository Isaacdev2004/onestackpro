import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSearch } from "wouter";
import {
  Wrench, DollarSign, Users, ArrowRight, TrendingUp, Zap,
  LinkIcon, Unlink, Eye, EyeOff, Globe, Key, Copy, Check,
  ExternalLink, Lock, Mail, Landmark, Star, Search, Gem
} from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useMemo, useRef } from "react";
import type { Tool, PayoutRequest } from "@shared/schema";

export default function DashboardPage() {
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();
  const search = useSearch();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Tools");

  useEffect(() => {
    const params = new URLSearchParams(search);
    const discordStatus = params.get("discord");
    if (discordStatus === "linked") {
      toast({ title: "Discord Linked", description: "Your Discord account has been connected." });
      refetchUser();
      window.history.replaceState({}, "", "/dashboard");
    } else if (discordStatus === "error") {
      const reason = params.get("reason") || "unknown";
      const messages: Record<string, string> = {
        no_code: "No authorization code received from Discord.",
        invalid_state: "Security check failed. Please try again.",
        exchange_failed: "Failed to verify with Discord. Please try again.",
        already_linked: "This Discord account is already linked to another user.",
        server_error: "An unexpected error occurred. Please try again.",
      };
      toast({ title: "Discord Link Failed", description: messages[reason] || "Something went wrong.", variant: "destructive" });
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [search, toast, refetchUser]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const { data: tools, isLoading: toolsLoading } = useQuery<Tool[]>({
    queryKey: ["/api/tools"],
  });

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

  const discordLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/discord/authorize");
      const data = await res.json();
      return data.url;
    },
    onSuccess: (url: string) => { window.location.href = url; },
    onError: (err: any) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const discordUnlinkMutation = useMutation({
    mutationFn: async () => { await apiRequest("POST", "/api/discord/unlink"); },
    onSuccess: () => { toast({ title: "Discord Unlinked", description: "Your Discord account has been disconnected." }); refetchUser(); },
    onError: (err: any) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const browserPrefMutation = useMutation({
    mutationFn: async (browser: string) => { await apiRequest("PATCH", "/api/auth/preferred-browser", { preferredBrowser: browser }); },
    onSuccess: () => { toast({ title: "Browser Updated", description: "Your preferred launch browser has been saved." }); refetchUser(); },
    onError: (err: any) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const [payoutAmount, setPayoutAmount] = useState("");
  const [bsb, setBsb] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  const payoutMutation = useMutation({
    mutationFn: async (data: { amount: number; bsb: string; accountNumber: string; accountName: string }) => {
      await apiRequest("POST", "/api/affiliates/payout", data);
    },
    onSuccess: () => {
      toast({ title: "Payout Requested", description: "Your payout request has been submitted." });
      queryClient.invalidateQueries({ queryKey: ["/api/affiliates/payouts"] });
      refetchUser();
      setPayoutAmount(""); setBsb(""); setAccountNumber(""); setAccountName("");
    },
    onError: (err: any) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const isActive = user?.subscriptionStatus === "active";
  const earningsInDollars = ((user?.earningsBalance || 0) / 100);
  const hasDiscord = !!user?.discordId;
  const [showKey, setShowKey] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [refCopied, setRefCopied] = useState(false);
  const username = user?.email?.split("@")[0] || "User";
  const activeTools = tools?.filter((t) => t.active) || [];
  const referralLink = `${window.location.origin}/?ref=${user?.referralCode || ""}`;

  const categories = useMemo(() => {
    const cats = new Set<string>();
    activeTools.forEach((t) => {
      if (t.category) cats.add(t.category);
    });
    return ["All Tools", ...Array.from(cats).sort()];
  }, [activeTools]);

  const filteredTools = useMemo(() => {
    let result = activeTools;
    if (selectedCategory !== "All Tools") {
      result = result.filter((t) => t.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          (t.category && t.category.toLowerCase().includes(q))
      );
    }
    return result;
  }, [activeTools, selectedCategory, searchQuery]);

  function copyKey() {
    navigator.clipboard.writeText(user?.licenseKey || "");
    setKeyCopied(true);
    toast({ title: "Copied", description: "Encryption key copied to clipboard." });
    setTimeout(() => setKeyCopied(false), 2000);
  }

  function copyReferralLink() {
    navigator.clipboard.writeText(referralLink);
    setRefCopied(true);
    toast({ title: "Copied", description: "Referral link copied to clipboard." });
    setTimeout(() => setRefCopied(false), 2000);
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
    switch (status) { case "paid": return "default"; case "approved": return "secondary"; default: return "outline"; }
  };

  return (
    <div className="space-y-0">
      <div className="bg-muted/50 dark:bg-muted/20 border-b border-border/40 py-2 px-4 text-center" data-testid="banner-referral">
        <p className="text-sm flex items-center justify-center gap-2 flex-wrap">
          <Gem className="h-4 w-4 text-primary" />
          <span>
            Earn <span className="text-primary font-semibold">{user?.commissionPercentage ?? 33}% recurring</span>
            {" "}&bull; Get <span className="text-primary font-semibold">lifetime access</span> after 8 referrals
          </span>
        </p>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">
        <div className="rounded-md bg-primary/90 dark:bg-primary/80 text-primary-foreground text-center py-3 px-4" data-testid="banner-tools-privacy">
          <p className="text-sm font-semibold tracking-wide uppercase">
            All Tools 100% Private &bull; Fastest Logins &bull; Zero Downtime
          </p>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="text-dashboard-title">
            <span className="gradient-text">ONESTACK TOOLS</span>
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Powering top creators worldwide
          </p>
          <p className="text-muted-foreground text-sm">
            Need help?{" "}
            <a
              href="https://discord.gg/onestack"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
              data-testid="link-discord-help"
            >
              discord.gg/onestack
            </a>
          </p>
          <p className="text-muted-foreground/60 text-xs mt-2" data-testid="text-dicloak-note">
            Click any tool to launch it. For first-time setup, follow the{" "}
            <a href="/credentials" className="text-primary hover:underline">Setup Guide</a>.
          </p>
        </div>

        <div className="max-w-xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search tools (press /)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-tools"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-wrap" data-testid="tabs-category-filter">
          {categories.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={selectedCategory === cat ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat)}
              className="whitespace-nowrap toggle-elevate"
              data-testid={`button-category-${cat.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {cat}
            </Button>
          ))}
        </div>

        {!isActive && (
          <Card className="border-primary/20">
            <CardContent className="pt-5 pb-5 sm:pt-6 sm:pb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Activate Your Subscription</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Subscribe through Whop to unlock all premium tools.
                  </p>
                </div>
                <Button
                  variant="default"
                  data-testid="button-activate"
                  onClick={() => {
                    const whopUrl = import.meta.env.VITE_WHOP_URL;
                    if (whopUrl) window.open(whopUrl, "_blank");
                    else toast({ title: "Error", description: "Subscription link not configured.", variant: "destructive" });
                  }}
                >
                  Subscribe Now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          {toolsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Card key={i}><CardContent className="pt-5 pb-5"><Skeleton className="h-10 w-10 rounded-md mb-3" /><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-3 w-32" /></CardContent></Card>
              ))}
            </div>
          ) : filteredTools.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm" data-testid="text-no-tools">
                {searchQuery ? "No tools match your search." : "No tools available in this category."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filteredTools.map((tool) => (
                <Card
                  key={tool.id}
                  className={`transition-all relative overflow-visible cursor-pointer hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 ${!isActive ? "opacity-60 pointer-events-none" : ""}`}
                  data-testid={`card-tool-${tool.id}`}
                  onClick={() => {
                    if (isActive && tool.accessUrl) {
                      window.open(tool.accessUrl, "_blank");
                    } else if (!isActive) {
                      toast({ title: "Subscription Required", description: "You need an active subscription to access tools.", variant: "destructive" });
                    }
                  }}
                >
                  <CardContent className="pt-5 pb-5">
                    <div className="flex flex-col items-center text-center">
                      {!isActive && (
                        <div className="absolute top-2 right-2">
                          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      )}
                      {tool.logoUrl ? (
                        <img src={tool.logoUrl} alt={tool.name} className="h-10 w-10 rounded-lg object-contain bg-white/5 dark:bg-white/5 p-0.5 mb-3" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 text-sm font-semibold">{tool.icon}</div>
                      )}
                      <h3 className="font-medium text-sm truncate w-full" data-testid={`text-tool-name-${tool.id}`}>{tool.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tool.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border/40 pt-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 flex-wrap" data-testid="text-affiliate-heading">
            <DollarSign className="h-5 w-5 text-primary" />
            Affiliate Program
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Earn {user?.commissionPercentage ?? 25}% recurring commission on every subscription you refer.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <Card className="stat-card">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="text-xl font-semibold mt-1" data-testid="text-aff-balance">${earningsInDollars.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card className="stat-card">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Total Referrals</p>
                <p className="text-xl font-semibold mt-1" data-testid="text-aff-referrals">{stats?.totalReferrals ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="stat-card">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-xl font-semibold mt-1" data-testid="text-aff-active">{stats?.activeReferrals ?? 0}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-4">
            <CardContent className="pt-5 pb-5">
              <h3 className="font-medium text-sm mb-2">Your Referral Link</h3>
              <div className="flex items-center gap-2">
                <Input readOnly value={referralLink} className="font-mono text-sm" data-testid="input-referral-link" />
                <Button variant="outline" onClick={copyReferralLink} data-testid="button-copy-referral">
                  {refCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-2 mb-4">
                <Landmark className="h-4 w-4 text-primary" />
                <h3 className="font-medium text-sm">Request Payout</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="accountName" className="text-xs">Account Name</Label>
                  <Input id="accountName" placeholder="John Smith" value={accountName} onChange={(e) => setAccountName(e.target.value)} data-testid="input-account-name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bsb" className="text-xs">BSB</Label>
                  <Input id="bsb" placeholder="123-456" value={bsb} onChange={(e) => setBsb(e.target.value)} data-testid="input-bsb" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="accountNumber" className="text-xs">Account Number</Label>
                  <Input id="accountNumber" placeholder="12345678" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} data-testid="input-account-number" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="payoutAmount" className="text-xs">Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input id="payoutAmount" type="number" placeholder="0.00" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} className="pl-7" data-testid="input-payout-amount" />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 flex-wrap mt-4">
                <p className="text-xs text-muted-foreground">Available: ${earningsInDollars.toFixed(2)}</p>
                <Button onClick={requestPayout} disabled={payoutMutation.isPending || earningsInDollars <= 0} size="sm" data-testid="button-request-payout">
                  {payoutMutation.isPending ? "Requesting..." : "Request Payout"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {payouts && payouts.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Payout History</h3>
              <div className="space-y-2">
                {payouts.map((p) => (
                  <Card key={p.id}>
                    <CardContent className="pt-3 pb-3 flex items-center justify-between gap-4 flex-wrap">
                      <span className="font-medium text-sm" data-testid={`text-payout-amount-${p.id}`}>${(p.amount / 100).toFixed(2)}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</span>
                        <Badge variant={statusColor(p.status) as any} data-testid={`badge-payout-status-${p.id}`}>{p.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border/40 pt-8">
          <h2 className="text-lg font-semibold mb-4" data-testid="text-settings-heading">Settings</h2>

          <div className="space-y-4">
            <Card>
              <CardContent className="pt-5 pb-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Key className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">Encryption Key</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Your login credential. Keep it safe.</p>
                    {user?.licenseKey && (
                      <div className="flex items-center gap-2 mt-2">
                        <code className="text-sm bg-muted px-3 py-1 rounded font-mono tracking-wider" data-testid="text-license-key-display">
                          {showKey ? user.licenseKey : "\u2022\u2022\u2022\u2022-\u2022\u2022\u2022\u2022-\u2022\u2022\u2022\u2022-\u2022\u2022\u2022\u2022"}
                        </code>
                        <Button size="icon" variant="ghost" onClick={() => setShowKey(!showKey)} data-testid="button-toggle-key-visibility">
                          {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={copyKey} data-testid="button-copy-license-key">
                          {keyCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 pb-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-[#5865F2]/10 flex items-center justify-center flex-shrink-0">
                    <SiDiscord className="h-5 w-5 text-[#5865F2]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">Discord Account <Badge variant="outline" className="ml-2 text-[10px]">Optional</Badge></h3>
                    {hasDiscord ? (
                      <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-discord-status">
                        Connected as <span className="font-medium text-foreground">{user?.discordUsername || user?.discordId}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-discord-status">
                        Link for community access and support.
                      </p>
                    )}
                  </div>
                  {hasDiscord ? (
                    <Button variant="outline" size="sm" onClick={() => discordUnlinkMutation.mutate()} disabled={discordUnlinkMutation.isPending} data-testid="button-discord-unlink">
                      <Unlink className="mr-2 h-3.5 w-3.5" /> Unlink
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => discordLinkMutation.mutate()} disabled={discordLinkMutation.isPending} data-testid="button-discord-link">
                      <LinkIcon className="mr-2 h-3.5 w-3.5" /> Link Discord
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 pb-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">Launch Browser</h3>
                    <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-browser-pref">Tools open through your selected browser.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant={(user?.preferredBrowser || "dicloak") === "dicloak" ? "default" : "outline"} onClick={() => browserPrefMutation.mutate("dicloak")} disabled={browserPrefMutation.isPending} data-testid="button-select-dicloak">DICloak</Button>
                    <Button size="sm" variant={(user?.preferredBrowser || "dicloak") === "ginsbrowser" ? "default" : "outline"} onClick={() => browserPrefMutation.mutate("ginsbrowser")} disabled={browserPrefMutation.isPending} data-testid="button-select-ginsbrowser">Ginsbrowser</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border-border/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Need help? Contact{" "}
                <a href="mailto:onestackcontact@gmail.com" className="text-primary hover:underline font-medium" data-testid="link-contact-email">onestackcontact@gmail.com</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
