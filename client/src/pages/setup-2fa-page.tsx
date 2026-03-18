import { useAuth } from "@/lib/auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { ShieldCheck, LogOut } from "lucide-react";
import logoSrc from "@assets/WhatsApp_Image_2026-02-17_at_10.36.18_PM_1771364199622.jpeg";

export default function Setup2faPage() {
  const { user, logout, refetchUser } = useAuth();
  const { toast } = useToast();
  const [setupData, setSetupData] = useState<{ secret: string; qrCode: string } | null>(null);
  const [code, setCode] = useState("");

  const setupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/2fa/setup");
      return res.json();
    },
    onSuccess: (data: { secret: string; qrCode: string }) => {
      setSetupData(data);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (verifyCode: string) => {
      await apiRequest("POST", "/api/2fa/confirm", { code: verifyCode });
    },
    onSuccess: () => {
      toast({ title: "2FA Enabled", description: "Your account is now secured with two-factor authentication." });
      setSetupData(null);
      setCode("");
      refetchUser();
    },
    onError: (err: any) => {
      toast({ title: "Verification Failed", description: err.message, variant: "destructive" });
      setCode("");
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background premium-bg p-4">
      <div className="w-full max-w-md page-content">
        <div className="flex items-center gap-2 mb-6">
          <img src={logoSrc} alt="OneStack" className="h-9 w-9 rounded-md object-cover" data-testid="img-onestack-logo" />
          <span className="text-xl font-semibold tracking-tight" data-testid="text-onestack-brand">OneStack</span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-setup-2fa-title">
            Set Up Two-Factor Authentication
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Two-factor authentication is required for all accounts. Set it up now using an authenticator app like Google Authenticator or Authy.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 pb-6">
            {!setupData ? (
              <div className="text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Secure your account</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You'll need an authenticator app on your phone to generate verification codes.
                  </p>
                </div>
                <Button
                  onClick={() => setupMutation.mutate()}
                  disabled={setupMutation.isPending}
                  className="w-full"
                  data-testid="button-start-2fa-setup"
                >
                  {setupMutation.isPending ? "Loading..." : "Get Started"}
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm text-muted-foreground text-center">
                    Scan this QR code with your authenticator app
                  </p>
                  <img
                    src={setupData.qrCode}
                    alt="2FA QR Code"
                    className="h-48 w-48 rounded-lg bg-white p-2"
                    data-testid="img-2fa-qr-setup"
                  />
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Or enter this code manually:</p>
                    <code className="text-xs bg-muted px-3 py-1.5 rounded-md font-mono select-all" data-testid="text-2fa-secret-setup">
                      {setupData.secret}
                    </code>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="verify-code">Enter the 6-digit code from your app</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="verify-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="000000"
                      autoComplete="one-time-code"
                      className="text-center text-lg tracking-widest font-mono"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      autoFocus
                      data-testid="input-2fa-setup-code"
                    />
                    <Button
                      onClick={() => confirmMutation.mutate(code)}
                      disabled={confirmMutation.isPending || code.length !== 6}
                      data-testid="button-confirm-2fa-setup"
                    >
                      {confirmMutation.isPending ? "Verifying..." : "Verify"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-muted-foreground"
            data-testid="button-logout-2fa-setup"
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
