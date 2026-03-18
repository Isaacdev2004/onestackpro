import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Eye, EyeOff, CheckCircle, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import logoSrc from "@assets/WhatsApp_Image_2026-02-17_at_10.36.18_PM_1771364199622.jpeg";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const token = new URLSearchParams(window.location.search).get("token");

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!password || password.length < 8) {
      newErrors.password = "Must be at least 8 characters";
    }
    if (password !== confirm) {
      newErrors.confirm = "Passwords don't match";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/auth/reset-password", { token, password });
      const data = await res.json();
      setSuccess(true);
      toast({ title: "Password Reset", description: data.message });
    } catch (err: any) {
      toast({ title: "Reset Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md text-center">
          <img src={logoSrc} alt="OneStack" className="h-10 w-10 rounded-lg mx-auto mb-6 object-cover" />
          <h1 className="text-xl font-semibold mb-2">Invalid Reset Link</h1>
          <p className="text-muted-foreground text-sm mb-6">This password reset link is invalid or has expired.</p>
          <Button onClick={() => setLocation("/auth")} data-testid="button-back-to-login">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md text-center">
          <div className="h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-7 w-7 text-green-500" />
          </div>
          <h1 className="text-xl font-semibold mb-2" data-testid="text-reset-success">Password Reset Successfully</h1>
          <p className="text-muted-foreground text-sm mb-6">You can now log in with your new password.</p>
          <Button onClick={() => setLocation("/auth")} data-testid="button-go-to-login">
            Go to Login
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <img src={logoSrc} alt="OneStack" className="h-10 w-10 rounded-lg object-cover" />
          <span className="text-xl font-semibold tracking-tight">OneStack</span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-reset-title">
            Set New Password
          </h1>
          <p className="text-muted-foreground mt-1">
            Enter your new password below.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className="pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    data-testid="input-new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm font-medium text-destructive">{errors.password}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  data-testid="input-confirm-password"
                />
                {errors.confirm && <p className="text-sm font-medium text-destructive">{errors.confirm}</p>}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                data-testid="button-reset-password"
              >
                {isSubmitting ? "Resetting..." : "Reset Password"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          <button
            type="button"
            onClick={() => setLocation("/auth")}
            className="text-primary font-medium inline-flex items-center gap-1"
            data-testid="button-back-to-login"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to login
          </button>
        </p>
      </div>
    </div>
  );
}
