import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import { Search, ExternalLink, Lock, Wrench, LinkIcon, MessageCircle, Copy, Check, Globe, User, KeyRound, ShieldCheck, RefreshCw } from "lucide-react";
import { SiDiscord } from "react-icons/si";
import type { Tool } from "@shared/schema";

interface LaunchData {
  toolName: string;
  accessUrl: string;
  browser: string;
  toolUsername: string | null;
  toolPassword: string | null;
  totpCode: string | null;
  toolId: string;
}

function CopyField({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast({ title: "Copied", description: `${label} copied to clipboard.` });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="flex items-center gap-2">
        <Input value={value} readOnly className="font-mono text-sm" data-testid={`input-${label.toLowerCase().replace(/\s/g, "-")}`} />
        <Button size="sm" variant="outline" onClick={handleCopy} data-testid={`button-copy-${label.toLowerCase().replace(/\s/g, "-")}`}>
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export default function ToolsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [launchDialog, setLaunchDialog] = useState<LaunchData | null>(null);
  const [liveTotpCode, setLiveTotpCode] = useState<string | null>(null);
  const [totpCountdown, setTotpCountdown] = useState(30);

  const { data: tools, isLoading } = useQuery<Tool[]>({
    queryKey: ["/api/tools"],
  });

  const refreshTotp = useCallback(async (toolId: string) => {
    try {
      const res = await apiRequest("POST", `/api/tools/${toolId}/totp`);
      const data = await res.json();
      setLiveTotpCode(data.totpCode);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (!launchDialog?.totpCode || !launchDialog?.toolId) return;
    setLiveTotpCode(launchDialog.totpCode);

    const now = Math.floor(Date.now() / 1000);
    const remaining = 30 - (now % 30);
    setTotpCountdown(remaining);

    const interval = setInterval(() => {
      const current = Math.floor(Date.now() / 1000);
      const rem = 30 - (current % 30);
      setTotpCountdown(rem);
      if (rem === 30) {
        refreshTotp(launchDialog.toolId);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [launchDialog?.totpCode, launchDialog?.toolId, refreshTotp]);

  const launchMutation = useMutation({
    mutationFn: async (toolId: string) => {
      const res = await apiRequest("POST", `/api/tools/${toolId}/launch`);
      return res.json();
    },
    onSuccess: (data: {
      message: string;
      toolId: string;
      accessUrl: string | null;
      preferredBrowser: string;
      toolUsername: string | null;
      toolPassword: string | null;
      totpCode: string | null;
    }) => {
      if (data.accessUrl) {
        setLaunchDialog({
          toolName: data.message.replace("Session started for ", ""),
          accessUrl: data.accessUrl,
          browser: data.preferredBrowser || "dicloak",
          toolUsername: data.toolUsername,
          toolPassword: data.toolPassword,
          totpCode: data.totpCode,
          toolId: data.toolId,
        });
      } else {
        toast({ title: "Tool Launched", description: data.message });
      }
    },
    onError: (err: any) => {
      toast({ title: "Launch Failed", description: err.message, variant: "destructive" });
    },
  });

  const discordLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/discord/authorize");
      const data = await res.json();
      return data.url;
    },
    onSuccess: (url: string) => {
      window.location.href = url;
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isActive = user?.subscriptionStatus === "active";
  const hasDiscord = !!user?.discordId;
  const canLaunch = isActive && hasDiscord;

  const filteredTools = tools?.filter(
    (t) =>
      t.active &&
      (t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase()))
  );

  const categories = Array.from(new Set(filteredTools?.map((t) => t.category) || []));

  const browserLabel = launchDialog?.browser === "ginsbrowser" ? "Ginsbrowser" : "DICloak";

  const closeLaunchDialog = () => {
    setLaunchDialog(null);
    setLiveTotpCode(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-tools-title">
            The Tools We <span className="gradient-text">Offer</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-lg" data-testid="text-tools-subtitle">
            All these tools are included in your OneStack Pro subscription. Launch them through your antidetect browser.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-tools"
          />
        </div>
      </div>

      {!isActive && (
        <Card className="border-primary/20">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="font-semibold" data-testid="text-subscription-required">Subscription Required</p>
                <p className="text-sm text-muted-foreground">
                  An active subscription is needed to launch tools.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isActive && !hasDiscord && (
        <Card className="border-[#5865F2]/20">
          <CardContent className="pt-5 pb-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <SiDiscord className="h-5 w-5 text-[#5865F2] flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold" data-testid="text-discord-required">Discord Required</p>
                <p className="text-sm text-muted-foreground">
                  Link your Discord account to launch tools.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => discordLinkMutation.mutate()}
                disabled={discordLinkMutation.isPending}
                data-testid="button-discord-link-tools"
              >
                <LinkIcon className="mr-2 h-3 w-3" />
                Link Discord
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="pt-5 pb-5">
                <Skeleton className="h-12 w-12 rounded-lg mb-3" />
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-full mb-3" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        categories.map((category) => (
          <div key={category}>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3" data-testid={`text-category-${category.toLowerCase().replace(/\s+/g, "-")}`}>
              {category}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8">
              {filteredTools
                ?.filter((t) => t.category === category)
                .map((tool) => (
                  <Card key={tool.id} className="card-hover-effect">
                    <CardContent className="pt-5 pb-5">
                      <div className="flex items-start gap-3 mb-4">
                        {tool.logoUrl ? (
                          <img
                            src={tool.logoUrl}
                            alt={tool.name}
                            className="h-12 w-12 rounded-lg object-contain bg-white/5 dark:bg-white/5 p-1 flex-shrink-0"
                            data-testid={`img-tool-logo-${tool.id}`}
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                            {tool.icon}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold" data-testid={`text-tool-${tool.id}`}>
                              {tool.name}
                            </h3>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {tool.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2" data-testid={`text-tool-desc-${tool.id}`}>
                            {tool.description}
                          </p>
                        </div>
                      </div>
                      <Button
                        className="w-full"
                        size="sm"
                        variant={canLaunch ? "default" : "secondary"}
                        disabled={!canLaunch || launchMutation.isPending}
                        onClick={() => launchMutation.mutate(tool.id)}
                        data-testid={`button-launch-${tool.id}`}
                      >
                        {canLaunch ? (
                          <>
                            Launch Tool
                            <ExternalLink className="ml-2 h-3 w-3" />
                          </>
                        ) : !isActive ? (
                          <>
                            <Lock className="mr-2 h-3 w-3" />
                            Locked
                          </>
                        ) : (
                          <>
                            <SiDiscord className="mr-2 h-3 w-3" />
                            Link Discord
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))
      )}

      {!isLoading && filteredTools?.length === 0 && (
        <div className="text-center py-16">
          <Wrench className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No tools found</h3>
          <p className="text-muted-foreground mt-1">
            {search ? "Try a different search term." : "No tools are available yet."}
          </p>
        </div>
      )}

      {!isLoading && filteredTools && filteredTools.length > 0 && (
        <Card className="border-dashed border-border/60">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3 justify-center text-center">
              <MessageCircle className="h-5 w-5 text-muted-foreground/60 flex-shrink-0" />
              <p className="text-sm text-muted-foreground" data-testid="text-tools-footer">
                More tools coming soon. Join the Discord and tell us what tools you want to see.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!launchDialog} onOpenChange={(open) => { if (!open) closeLaunchDialog(); }}>
        <DialogContent className="max-w-md" data-testid="dialog-launch-tool">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <DialogTitle data-testid="text-launch-dialog-title">Launch {launchDialog?.toolName}</DialogTitle>
            </div>
            <DialogDescription data-testid="text-launch-dialog-desc">
              Use the credentials below in your {browserLabel} antidetect browser.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <CopyField
              label="Access URL"
              value={launchDialog?.accessUrl || ""}
              icon={<Globe className="h-3 w-3" />}
            />

            {launchDialog?.toolUsername && (
              <CopyField
                label="Username / Email"
                value={launchDialog.toolUsername}
                icon={<User className="h-3 w-3" />}
              />
            )}

            {launchDialog?.toolPassword && (
              <CopyField
                label="Password"
                value={launchDialog.toolPassword}
                icon={<KeyRound className="h-3 w-3" />}
              />
            )}

            {liveTotpCode && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <ShieldCheck className="h-3 w-3" />
                  2FA Code
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Input
                      value={liveTotpCode}
                      readOnly
                      className="font-mono text-lg tracking-[0.3em] text-center font-bold"
                      data-testid="input-2fa-code"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <div className={`text-xs font-mono ${totpCountdown <= 5 ? "text-destructive" : "text-muted-foreground"}`}>
                        {totpCountdown}s
                      </div>
                      <RefreshCw className={`h-3 w-3 ${totpCountdown <= 5 ? "text-destructive animate-spin" : "text-muted-foreground"}`} />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await navigator.clipboard.writeText(liveTotpCode);
                      toast({ title: "Copied", description: "2FA code copied to clipboard." });
                    }}
                    data-testid="button-copy-2fa"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" data-testid="text-instructions-heading">How to launch</p>
              {launchDialog?.browser === "ginsbrowser" ? (
                <ol className="text-sm space-y-1.5 list-decimal list-inside text-muted-foreground" data-testid="text-ginsbrowser-instructions">
                  <li>Open <span className="font-medium text-foreground">Ginsbrowser</span> on your computer</li>
                  <li>Select or create a browser profile</li>
                  <li>Click <span className="font-medium text-foreground">Start</span> to launch the profile</li>
                  <li>Paste the URL above into the address bar</li>
                  {launchDialog?.toolUsername && <li>Sign in with the credentials shown above</li>}
                  {liveTotpCode && <li>Enter the 2FA code when prompted (it auto-refreshes)</li>}
                </ol>
              ) : (
                <ol className="text-sm space-y-1.5 list-decimal list-inside text-muted-foreground" data-testid="text-dicloak-instructions">
                  <li>Open <span className="font-medium text-foreground">DICloak</span> on your computer</li>
                  <li>Select or create a browser profile</li>
                  <li>Click <span className="font-medium text-foreground">Open</span> to launch the profile</li>
                  <li>Paste the URL above into the address bar</li>
                  {launchDialog?.toolUsername && <li>Sign in with the credentials shown above</li>}
                  {liveTotpCode && <li>Enter the 2FA code when prompted (it auto-refreshes)</li>}
                </ol>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={closeLaunchDialog}
                data-testid="button-dismiss-launch"
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
