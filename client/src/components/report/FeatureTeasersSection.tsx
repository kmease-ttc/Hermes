import { Rocket, TrendingUp, BarChart3, PenTool, Layout, Brain, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: TrendingUp,
    title: "Automated Ranking Improvement",
    description:
      "Arclo Pro identifies what's holding your rankings back and deploys targeted fixes — week by week, automatically.",
  },
  {
    icon: BarChart3,
    title: "Domain Authority Signals",
    description:
      "Build and strengthen the backlink and authority signals that Google uses to decide who ranks on page 1.",
  },
  {
    icon: PenTool,
    title: "Blog Creation",
    description:
      "SEO-optimized blog content written and published to target the keywords your competitors are winning.",
  },
  {
    icon: Layout,
    title: "Web Page Creation",
    description:
      "Generate new landing pages and service pages designed to capture high-intent search traffic in your market.",
  },
  {
    icon: Brain,
    title: "Learning Model",
    description:
      "Arclo Pro learns from every ranking change and optimization result, improving its decisions over time for your site.",
  },
  {
    icon: ShieldAlert,
    title: "Ranking Decay Detection",
    description:
      "Continuous monitoring detects when rankings start slipping, so fixes are applied before you lose traffic.",
  },
];

export function FeatureTeasersSection() {
  return (
    <section data-testid="section-feature-teasers" className="space-y-4 print:hidden">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Rocket className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">What Arclo Pro Can Do Next</h2>
      </div>
      <p className="text-muted-foreground">
        This snapshot shows where you stand today. Here's how Arclo Pro actively improves your rankings over time:
      </p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feat) => (
          <Card
            key={feat.title}
            className="border-primary/20 hover:border-primary/40 hover:shadow-md transition-all group"
          >
            <CardContent className="pt-5 pb-4 space-y-2">
              <feat.icon className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-foreground">{feat.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
