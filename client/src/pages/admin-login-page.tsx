import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Shield } from "lucide-react";
import logoSrc from "@assets/WhatsApp_Image_2026-02-17_at_10.36.18_PM_1771364199622.jpeg";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { loginWithEmail } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Enter both email and password");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await loginWithEmail(email, password);
      setLocation("/dashboard");
    } catch (err: any) {
      toast({ title: "Login Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background premium-bg p-6 page-content">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <img src={logoSrc} alt="OneStack" className="h-9 w-9 rounded-md object-cover" />
          <span className="text-xl font-semibold tracking-tight">OneStack</span>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-admin-auth-title">
            Admin Access
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Authorized personnel only.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-admin-login">
              <div className="flex justify-center mb-2">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-password"
                />
              </div>
              {error && <p className="text-sm font-medium text-destructive" data-testid="error-login">{error}</p>}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                data-testid="button-admin-login"
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
