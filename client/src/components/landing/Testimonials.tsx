import { Star } from "lucide-react";

const TESTIMONIALS = [
  {
    quote: "Finally, an SEO solution that actually does the work for me. Our leads doubled in 3 months.",
    name: "Mike R.",
    business: "HVAC Company Owner",
  },
  {
    quote: "I was skeptical at first, but Arclo delivered. We're now ranking #1 for our main keywords.",
    name: "Sarah T.",
    business: "Landscaping Business",
  },
  {
    quote: "Set it up once and it keeps improving our site every week. Best investment for my plumbing business.",
    name: "David K.",
    business: "Plumber",
  },
];

function StarRating() {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-gold text-gold" />
      ))}
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="px-4 sm:px-5 md:px-6 py-12 sm:py-16 md:py-20 bg-muted">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground text-center mb-8 sm:mb-12">
          Trusted by Local Service Businesses
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {TESTIMONIALS.map((testimonial, index) => (
            <div
              key={index}
              className="bg-card rounded-xl p-5 sm:p-6 shadow-sm border border-border"
              data-testid={`testimonial-card-${index}`}
            >
              <StarRating />
              <blockquote className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
                "{testimonial.quote}"
              </blockquote>
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
                <p className="font-semibold text-foreground">{testimonial.name}</p>
                <p className="text-sm text-muted-foreground">{testimonial.business}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
