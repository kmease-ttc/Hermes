import { Link } from "wouter";
import { ROUTES } from "@shared/routes";
import { Droplets, Flame, Smile, Sprout, ExternalLink } from "lucide-react";

const EXAMPLES = [
  {
    id: "plumbing",
    industry: "Plumbing",
    city: "Austin, TX",
    icon: Droplets,
    glowColor: "rgba(59, 130, 246, 0.15)",
    iconColor: "text-blue-500",
  },
  {
    id: "hvac",
    industry: "HVAC",
    city: "Denver, CO",
    icon: Flame,
    glowColor: "rgba(249, 115, 22, 0.15)",
    iconColor: "text-orange-500",
  },
  {
    id: "dental",
    industry: "Dental Clinic",
    city: "Seattle, WA",
    icon: Smile,
    glowColor: "rgba(20, 184, 166, 0.15)",
    iconColor: "text-teal-500",
  },
  {
    id: "landscaping",
    industry: "Landscaping",
    city: "Phoenix, AZ",
    icon: Sprout,
    glowColor: "rgba(16, 185, 129, 0.15)",
    iconColor: "text-emerald-500",
  },
];

export function ExamplesPreview() {
  return (
    <section className="px-5 md:px-6 py-12 md:py-16">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4 tracking-tight">
          See What Arclo Builds
        </h2>
        <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
          Real examples of websites generated for local businesses.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {EXAMPLES.map((example) => (
            <div
              key={example.id}
              className="rounded-2xl p-5 text-center transition-all duration-250 hover:-translate-y-1"
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                backdropFilter: "blur(14px) saturate(120%)",
                WebkitBackdropFilter: "blur(14px) saturate(120%)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: `0 0 0 1px rgba(255, 255, 255, 0.04), 0 8px 24px rgba(0, 0, 0, 0.06), 0 0 24px ${example.glowColor}`,
              }}
              data-testid={`card-example-${example.id}`}
            >
              <div className="flex justify-center mb-4 pt-2">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  <example.icon className={`h-7 w-7 ${example.iconColor}`} />
                </div>
              </div>
              <h3 className="font-semibold text-foreground mb-1">{example.industry}</h3>
              <p className="text-sm text-muted-foreground mb-3">{example.city}</p>
              <Link href={`${ROUTES.EXAMPLES}?demo=${example.id}`}>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:opacity-80 cursor-pointer">
                  View demo <ExternalLink className="h-3 w-3" />
                </span>
              </Link>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link href={ROUTES.EXAMPLES}>
            <span className="text-sm font-medium text-brand hover:opacity-80 underline-offset-2 hover:underline cursor-pointer" data-testid="link-see-all-examples">
              See all examples →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
