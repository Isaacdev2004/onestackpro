import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Lock, MessageCircle } from "lucide-react";
import { SiDiscord } from "react-icons/si";
import logoSrc from "@assets/WhatsApp_Image_2026-02-17_at_10.36.18_PM_1771364199622.jpeg";

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { refetchUser } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const discord = params.get("discord");
    const reason = params.get("reason");

    if (discord === "error") {
      const messages: Record<string, string> = {
        no_code: "Discord authorization was cancelled.",
        invalid_state: "Session expired. Please try again.",
        exchange_failed: "Failed to connect with Discord. Please try again.",
        server_error: "Something went wrong. Please try again.",
      };
      toast({
        title: "Authorization Failed",
        description: messages[reason || ""] || "An error occurred during authorization.",
        variant: "destructive",
      });
    }
  }, [search, toast]);

  async function handleDiscordAuth() {
    setIsLoading(true);
    // Start OAuth through a top-level navigation to keep session cookies stable.
    window.location.href = "/api/discord/authorize?redirect=1";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background premium-bg p-6 page-content">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl p-8 shadow-2xl" data-testid="card-auth">
          <div className="flex items-center gap-3 mb-6 justify-center">
            <Lock className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-primary" data-testid="text-auth-title">
              OneStack VIP Access
            </h1>
          </div>

          <div className="text-center mb-8">
            <p className="text-muted-foreground text-sm">
              Secure VIP credential management and tracking
            </p>
            <p className="text-muted-foreground/80 text-sm mt-1">
              Sign in with Discord and your VIP role to continue
            </p>
          </div>

          <Button
            onClick={handleDiscordAuth}
            disabled={isLoading}
            className="w-full h-12 text-base font-semibold bg-[#5865F2] hover:bg-[#4752C4] text-white"
            data-testid="button-discord-auth"
          >
            <SiDiscord className="mr-2 h-5 w-5" />
            {isLoading ? "Redirecting..." : "Authorize with Discord"}
          </Button>

          <p className="text-center text-sm text-muted-foreground/60 mt-4">
            Problems signing in?{" "}
            <a
              href="https://discord.gg/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
              data-testid="link-support"
            >
              Contact support on Discord
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
