import { useEffect, useState } from "react";
import { useSearch, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Download, Monitor, Key, ArrowRight, ExternalLink, Loader2 } from "lucide-react";
import { SiDiscord } from "react-icons/si";
import logoSrc from "@assets/WhatsApp_Image_2026-02-17_at_10.36.18_PM_1771364199622.jpeg";
import type { Tool } from "@shared/schema";

export default function WelcomePage() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [authError, setAuthError] = useState("");

  const { data: tools } = useQuery<Tool[]>({
    queryKey: ["/api/tools"],
  });

  useEffect(() => {
    const params = new URLSearchParams(search);
    const sessionToken = params.get("session");
    if (sessionToken && !user) {
      setAuthenticating(true);
      fetch(`/api/auth/welcome?session=${encodeURIComponent(sessionToken)}`, { credentials: "include" })
        .then(async (res) => {
          if (res.ok) {
            await refetchUser();
            window.history.replaceState({}, "", "/welcome");
          } else {
            const data = await res.json();
            setAuthError(data.message || "Invalid session token");
          }
        })
        .catch(() => setAuthError("Connection error"))
        .finally(() => setAuthenticating(false));
    }
  }, [search, user, refetchUser]);

  const activeTools = tools?.filter((t) => t.active) || [];
  const licenseKey = user?.licenseKey || "";

  function copyKey() {
    navigator.clipboard.writeText(licenseKey);
    setCopied(true);
    toast({ title: "Copied!", description: "Your encryption key has been copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  }

  if (authenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background premium-bg">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Setting up your account...</p>
        </div>
      </div>
    );
  }

  if (authError && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background premium-bg p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <img src={logoSrc} alt="OneStack" className="h-12 w-12 rounded-md mx-auto mb-4 object-cover" />
            <h2 className="text-xl font-semibold mb-2">Session Expired</h2>
            <p className="text-muted-foreground mb-6">{authError}</p>
            <p className="text-sm text-muted-foreground mb-4">
              You can sign in with your encryption key that was sent to your email.
            </p>
            <a href="/auth">
              <Button data-testid="button-go-to-login">Sign In with Key</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background premium-bg p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <img src={logoSrc} alt="OneStack" className="h-12 w-12 rounded-md mx-auto mb-4 object-cover" />
            <h2 className="text-xl font-semibold mb-2">Welcome to OneStack Pro</h2>
            <p className="text-muted-foreground mb-6">Sign in with your encryption key to get started.</p>
            <a href="/auth">
              <Button data-testid="button-go-to-login">Sign In</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background premium-bg">
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoSrc} alt="OneStack" className="h-9 w-9 rounded-md object-cover" />
            <span className="text-xl font-bold tracking-tight">OneStack</span>
            <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">Pro</span>
          </div>
          <Button size="sm" onClick={() => setLocation("/dashboard")} data-testid="button-go-to-dashboard">
            Go to Dashboard
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="text-center">
          <Badge variant="secondary" className="mb-3">Welcome to OneStack Pro</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="text-welcome-title">
            You're almost there!
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Let's get you set up in 2 minutes.
          </p>
        </div>

        <Card className="border-primary/30">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-2 mb-4">
              <Key className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">Your Encryption Key</h2>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-between gap-4">
              <code className="text-lg sm:text-xl font-mono tracking-widest font-semibold" data-testid="text-welcome-key">
                {licenseKey}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={copyKey}
                data-testid="button-copy-welcome-key"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              This key has also been sent to your email as a backup. Keep it safe — this is your login credential.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Setup Instructions</h2>

          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-4">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">1</div>
                <div className="flex-1">
                  <h3 className="font-medium">Download DICloak Browser</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    This is the secure browser that will give you instant access to all tools.
                  </p>
                  <a href="https://www.dicloak.com" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="mt-3" data-testid="button-download-dicloak">
                      <Download className="mr-2 h-3.5 w-3.5" />
                      Download DICloak
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </Button>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-4">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">2</div>
                <div className="flex-1">
                  <h3 className="font-medium">Open DICloak and Create a New Profile</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Open DICloak, click "New Profile" and name it "OneStack" or anything you prefer.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-4">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">3</div>
                <div className="flex-1">
                  <h3 className="font-medium">Enter Your Encryption Key</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    In DICloak, go to <strong>Settings → Security → Enter Key</strong>. Paste the key shown above.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-4">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">4</div>
                <div className="flex-1">
                  <h3 className="font-medium">Launch Any Tool</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Once your key is entered, simply click any tool below and it will open automatically logged in. 2FA codes are handled automatically — you won't see or need to enter them.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Available Tools</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {activeTools.map((tool) => (
              <Card key={tool.id} className="card-hover-effect" data-testid={`card-welcome-tool-${tool.id}`}>
                <CardContent className="pt-4 pb-4 flex flex-col items-center text-center">
                  {tool.logoUrl ? (
                    <img
                      src={tool.logoUrl}
                      alt={tool.name}
                      className="h-10 w-10 rounded-lg object-contain bg-white/5 dark:bg-white/5 p-0.5 mb-2"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 text-sm font-semibold">
                      {tool.icon}
                    </div>
                  )}
                  <h3 className="font-medium text-sm">{tool.name}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="border-border/50">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-[#5865F2]/10 flex items-center justify-center flex-shrink-0">
                <SiDiscord className="h-5 w-5 text-[#5865F2]" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm">Join Our Community (Optional)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Link your Discord for community access, support, and role assignment. Not required for tool access.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setLocation("/dashboard")} data-testid="button-discord-welcome">
                Set Up in Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center pb-8">
          <Button size="lg" onClick={() => setLocation("/dashboard")} data-testid="button-go-to-dashboard-bottom">
            Go to Dashboard
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
