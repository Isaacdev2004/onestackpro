import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Zap, Shield, Users, Star } from "lucide-react";
import logoSrc from "@assets/WhatsApp_Image_2026-02-17_at_10.36.18_PM_1771364199622.jpeg";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Tool } from "@shared/schema";

export default function LandingPage() {
  const { data: tools } = useQuery<Tool[]>({
    queryKey: ["/api/tools"],
  });

  const activeTools = tools?.filter((t) => t.active) || [];
  const whopUrl = import.meta.env.VITE_WHOP_URL || "#";

  return (
    <div className="min-h-screen bg-background premium-bg">
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoSrc} alt="OneStack" className="h-9 w-9 rounded-md object-cover" />
            <span className="text-xl font-bold tracking-tight">OneStack</span>
            <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">Pro</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a href="/auth">
              <Button variant="ghost" size="sm" data-testid="link-login">
                Sign In
              </Button>
            </a>
            <a href={whopUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" data-testid="button-get-started-header">
                Get Started
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </a>
          </div>
        </div>
      </header>

      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4" data-testid="badge-hero">
            <Star className="h-3 w-3 mr-1" /> Premium Access Platform
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight" data-testid="text-hero-title">
            Access 10+ Premium Tools{" "}
            <span className="gradient-text">for One Monthly Price</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mt-6 max-w-2xl mx-auto leading-relaxed">
            Get instant access to the best AI, design, SEO, and content creation tools.
            No separate accounts. No hidden fees. One subscription, everything unlocked.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <a href={whopUrl} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="text-base px-8 py-6" data-testid="button-get-started-hero">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
            <a href="/auth">
              <Button variant="outline" size="lg" className="text-base px-8 py-6" data-testid="button-sign-in-hero">
                Already a member? Sign In
              </Button>
            </a>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-t border-border/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold" data-testid="text-tools-section-title">
              Premium Tools <span className="gradient-text">Included</span>
            </h2>
            <p className="text-muted-foreground mt-2">
              All of these tools are included with your subscription.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {activeTools.map((tool) => (
              <Card key={tool.id} className="card-hover-effect" data-testid={`card-tool-${tool.id}`}>
                <CardContent className="pt-5 pb-5 flex flex-col items-center text-center">
                  {tool.logoUrl ? (
                    <img
                      src={tool.logoUrl}
                      alt={tool.name}
                      className="h-12 w-12 rounded-lg object-contain bg-white/5 dark:bg-white/5 p-1 mb-3"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 text-lg font-semibold">
                      {tool.icon}
                    </div>
                  )}
                  <h3 className="font-medium text-sm">{tool.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tool.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-t border-border/40">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold">
              How It <span className="gradient-text">Works</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: "Subscribe", desc: "Complete payment through our secure Whop checkout. No account creation needed." },
              { icon: Shield, title: "Get Your Key", desc: "Receive your unique encryption key instantly. Set up DICloak browser in 2 minutes." },
              { icon: Star, title: "Access Everything", desc: "Click any tool and it opens automatically logged in. 2FA is handled for you." },
            ].map((step, i) => (
              <Card key={step.title} className="card-hover-effect">
                <CardContent className="pt-6 pb-6 text-center">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <step.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-xs font-bold text-primary mb-2">STEP {i + 1}</div>
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-t border-border/40">
        <div className="max-w-4xl mx-auto">
          <Card className="border-primary/20">
            <CardContent className="pt-8 pb-8 text-center">
              <Users className="h-10 w-10 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Affiliate Program</h2>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                Earn 25% recurring commission on every subscription you refer.
                Share your link, earn while you sleep.
              </p>
              <a href={whopUrl} target="_blank" rel="noopener noreferrer">
                <Button size="lg" data-testid="button-get-started-affiliate">
                  Start Earning Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t border-border/40 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logoSrc} alt="OneStack" className="h-6 w-6 rounded-md object-cover" />
            <span className="text-sm font-medium">OneStack Pro</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Contact:{" "}
            <a href="mailto:onestackcontact@gmail.com" className="text-primary hover:underline">
              onestackcontact@gmail.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
