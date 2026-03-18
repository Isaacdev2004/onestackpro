import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Download, Key, Shield, Monitor, ExternalLink, Loader2 } from "lucide-react";
import { SiDiscord } from "react-icons/si";
import logoSrc from "@assets/WhatsApp_Image_2026-02-17_at_10.36.18_PM_1771364199622.jpeg";

interface CredentialsData {
  email: string | null;
  password: string | null;
  hasTotp: boolean;
}

export default function CredentialsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<CredentialsData | null>(null);
  const [credentialsLoading, setCredentialsLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState<string | null>(null);
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpCountdown, setTotpCountdown] = useState(0);

  useEffect(() => {
    fetch("/api/credentials", { credentials: "include" })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setCredentials(data);
        }
      })
      .catch(() => {})
      .finally(() => setCredentialsLoading(false));
  }, []);

  useEffect(() => {
    if (totpCountdown <= 0) {
      setTotpCode(null);
      return;
    }
    const timer = setTimeout(() => setTotpCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [totpCountdown]);

  const copyToClipboard = useCallback(
    (text: string, field: string) => {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({ title: "Copied!", description: `${field} copied to clipboard.` });
      setTimeout(() => setCopiedField(null), 2000);
    },
    [toast]
  );

  const generateTotp = useCallback(async () => {
    setTotpLoading(true);
    try {
      const res = await fetch("/api/credentials/totp", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setTotpCode(data.totpCode);
        setTotpCountdown(30);
      } else {
        const err = await res.json();
        toast({
          title: "Error",
          description: err.message || "Failed to generate 2FA code",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to generate 2FA code",
        variant: "destructive",
      });
    } finally {
      setTotpLoading(false);
    }
  }, [toast]);

  const licenseKey = user?.licenseKey || "";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <img
          src={logoSrc}
          alt="OneStack"
          className="h-10 w-10 rounded-md object-cover"
        />
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            data-testid="text-credentials-title"
          >
            OneStack VIP
          </h1>
        </div>
      </div>

      <div className="rounded-md bg-primary p-3 text-center">
        <span
          className="text-sm font-bold tracking-wider uppercase text-primary-foreground"
          data-testid="text-new-update-banner"
        >
          NEW UPDATE
        </span>
      </div>

      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-4">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
              1
            </div>
            <div className="flex-1">
              <h3 className="font-semibold" data-testid="text-step1-title">
                Download DICloak
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Get the browser from{" "}
                <a
                  href="https://dicloak.com/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                  data-testid="link-dicloak-download"
                >
                  https://dicloak.com/download
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-4">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
              2
            </div>
            <div className="flex-1">
              <h3 className="font-semibold" data-testid="text-step2-title">
                Login Credentials
              </h3>
              <p className="text-sm text-muted-foreground mt-1 mb-3">
                Login with:
              </p>
              {credentialsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading credentials...</span>
                </div>
              ) : credentials?.email || credentials?.password ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 bg-muted/50 rounded-md p-3">
                    <span className="text-sm text-muted-foreground min-w-[72px]">
                      Email
                    </span>
                    <code
                      className="flex-1 font-mono text-sm"
                      data-testid="text-credential-email"
                    >
                      {credentials.email}
                    </code>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(credentials.email!, "Email")
                      }
                      data-testid="button-copy-email"
                    >
                      {copiedField === "Email" ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      Copy
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 bg-muted/50 rounded-md p-3">
                    <span className="text-sm text-muted-foreground min-w-[72px]">
                      Password
                    </span>
                    <code
                      className="flex-1 font-mono text-sm"
                      data-testid="text-credential-password"
                    >
                      {credentials.password}
                    </code>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(credentials.password!, "Password")
                      }
                      data-testid="button-copy-password"
                    >
                      {copiedField === "Password" ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      Copy
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No shared credentials available yet. Contact support.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-4">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
              3
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-3" data-testid="text-step3-title">
                Get 2FA Code
              </h3>
              {totpCode ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-muted/50 rounded-md p-3">
                    <code
                      className="flex-1 font-mono text-2xl font-bold tracking-widest text-center"
                      data-testid="text-totp-code"
                    >
                      {totpCode}
                    </code>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(totpCode, "2FA Code")
                      }
                      data-testid="button-copy-totp"
                    >
                      {copiedField === "2FA Code" ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      Copy
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden min-w-[100px]">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-1000"
                          style={{ width: `${(totpCountdown / 30) * 100}%` }}
                        />
                      </div>
                      <span
                        className="text-sm text-muted-foreground tabular-nums"
                        data-testid="text-totp-countdown"
                      >
                        {totpCountdown}s
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateTotp}
                      disabled={totpLoading}
                      data-testid="button-refresh-totp"
                    >
                      Refresh
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={generateTotp}
                  disabled={totpLoading || !credentials?.hasTotp}
                  data-testid="button-get-totp"
                >
                  {totpLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  GET 2FA CODE
                </Button>
              )}
              {!credentials?.hasTotp && !totpCode && (
                <p className="text-xs text-muted-foreground mt-2">
                  No 2FA configured for available tools.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-4">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
              4
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-3" data-testid="text-step4-title">
                Your Unique Encryption Key
              </h3>
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 mb-3">
                <p className="text-sm">
                  <span className="font-semibold text-destructive">
                    IMPORTANT:
                  </span>{" "}
                  Copy your unique encryption key below. You'll need this to
                  access the extension tools.
                </p>
              </div>
              <div className="flex items-center gap-3 bg-muted/50 rounded-md p-3">
                <span className="text-sm text-muted-foreground min-w-[80px]">
                  Encryption Key
                </span>
                <code
                  className="flex-1 font-mono text-sm break-all"
                  data-testid="text-encryption-key"
                >
                  {licenseKey}
                </code>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(licenseKey, "Encryption Key")
                  }
                  data-testid="button-copy-encryption-key"
                >
                  {copiedField === "Encryption Key" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  Copy
                </Button>
              </div>
              <div className="rounded-md bg-yellow-500/10 border border-yellow-500/20 p-3 mt-3">
                <p className="text-sm">
                  Keep this key secure! The extension will ask for this key
                  before granting access to any tools.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-4">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
              5
            </div>
            <div className="flex-1">
              <h3 className="font-semibold" data-testid="text-step5-title">
                Select Profile
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Select <strong>AutoLogin</strong> profile in DICloak.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Need help? Contact support on{" "}
                <a
                  href="https://discord.gg/onestack"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#5865F2] font-medium inline-flex items-center gap-1"
                  data-testid="link-discord-support"
                >
                  <SiDiscord className="h-3.5 w-3.5" />
                  Discord
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
