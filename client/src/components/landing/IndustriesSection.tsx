import { 
  Wrench, 
  Wind, 
  Stethoscope, 
  Trees, 
  Zap, 
  Car, 
  Home, 
  Hammer,
  Paintbrush,
  Shield,
  Droplets,
  Bug
} from "lucide-react";

const INDUSTRIES = [
  { icon: Wrench, name: "Plumbing" },
  { icon: Wind, name: "HVAC" },
  { icon: Zap, name: "Electrical" },
  { icon: Stethoscope, name: "Dental & Medical" },
  { icon: Trees, name: "Landscaping" },
  { icon: Car, name: "Auto Repair" },
  { icon: Home, name: "Roofing" },
  { icon: Hammer, name: "General Contractors" },
  { icon: Paintbrush, name: "Painting" },
  { icon: Shield, name: "Security" },
  { icon: Droplets, name: "Pool Services" },
  { icon: Bug, name: "Pest Control" },
];

export function IndustriesSection() {
  return (
    <section className="px-4 sm:px-5 md:px-6 py-12 md:py-16 bg-muted">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-foreground mb-4 tracking-tight">
          Who It's For
        </h2>
        <p className="text-center text-sm sm:text-base text-muted-foreground mb-8 sm:mb-10 max-w-xl mx-auto">
          Arclo is built for businesses that serve customers locally.
        </p>

        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {INDUSTRIES.map((industry) => (
            <div
              key={industry.name}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-card rounded-full border border-border shadow-sm hover:shadow-md hover:border-brand transition-all duration-200"
              data-testid={`pill-industry-${industry.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <industry.icon className="h-4 w-4 text-brand" />
              <span className="text-xs sm:text-sm font-medium text-foreground">{industry.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
