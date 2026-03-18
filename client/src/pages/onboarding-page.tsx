import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, LinkIcon, Monitor, ArrowRight } from "lucide-react";
import { SiDiscord } from "react-icons/si";
import logoSrc from "@assets/WhatsApp_Image_2026-02-17_at_10.36.18_PM_1771364199622.jpeg";

export default function OnboardingPage() {
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedBrowser, setSelectedBrowser] = useState(user?.preferredBrowser || "dicloak");

  useEffect(() => {
    if (user?.discordId && step === 1) {
      setStep(2);
    }
  }, [user?.discordId, step]);

  const discordMutation = useMutation({
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

  const browserMutation = useMutation({
    mutationFn: async (browser: string) => {
      await apiRequest("PATCH", "/api/auth/preferred-browser", { preferredBrowser: browser });
    },
    onSuccess: async () => {
      await refetchUser();
      setStep(3);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background premium-bg p-6">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <img src={logoSrc} alt="OneStack" className="h-9 w-9 rounded-md object-cover" />
          <span className="text-xl font-semibold tracking-tight">OneStack</span>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  s <= step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
                data-testid={`step-indicator-${s}`}
              >
                {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${s < step ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <Card>
            <CardContent className="pt-6 pb-6 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-[#5865F2]/10 flex items-center justify-center mx-auto">
                <SiDiscord className="h-8 w-8 text-[#5865F2]" />
              </div>
              <h2 className="text-xl font-semibold" data-testid="text-onboarding-step-1">
                Link Your Discord
              </h2>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Connect your Discord account to verify your identity and unlock tool access.
              </p>
              <Button
                className="w-full max-w-xs mx-auto"
                onClick={() => discordMutation.mutate()}
                disabled={discordMutation.isPending}
                data-testid="button-link-discord-onboarding"
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                {discordMutation.isPending ? "Redirecting..." : "Link Discord Account"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardContent className="pt-6 pb-6 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Monitor className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold" data-testid="text-onboarding-step-2">
                Choose Your Browser
              </h2>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Select the antidetect browser you'll use to access tools.
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                {[
                  { id: "dicloak", label: "DICloak" },
                  { id: "ginsbrowser", label: "Ginsbrowser" },
                ].map((browser) => (
                  <button
                    key={browser.id}
                    type="button"
                    onClick={() => setSelectedBrowser(browser.id)}
                    className={`p-4 rounded-lg border-2 transition-colors text-center ${
                      selectedBrowser === browser.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                    data-testid={`button-browser-${browser.id}`}
                  >
                    <Monitor className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <span className="font-medium text-sm">{browser.label}</span>
                  </button>
                ))}
              </div>
              <Button
                className="w-full max-w-xs mx-auto"
                onClick={() => browserMutation.mutate(selectedBrowser)}
                disabled={browserMutation.isPending}
                data-testid="button-confirm-browser"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardContent className="pt-6 pb-6 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold" data-testid="text-onboarding-complete">
                You're All Set!
              </h2>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Your account is ready. Head to the dashboard to start using your premium tools.
              </p>
              <Button
                className="w-full max-w-xs mx-auto"
                onClick={() => window.location.href = "/dashboard"}
                data-testid="button-go-to-dashboard"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
