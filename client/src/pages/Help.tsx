import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  HelpCircle, 
  Book, 
  MessageCircle, 
  Mail, 
  ExternalLink,
  Lightbulb,
  FileText,
  Video,
  Users
} from "lucide-react";
import { Link } from "wouter";

const helpSections = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Learn the basics of Hermes and set up your first site",
    icon: Lightbulb,
    links: [
      { label: "Add your first site", href: "/sites/new" },
      { label: "Configure integrations", href: "/integrations" },
      { label: "Run your first diagnostic", href: "/runs" },
    ],
  },
  {
    id: "agents",
    title: "Understanding Agents",
    description: "Learn what each specialist agent does and how to use their insights",
    icon: Users,
    links: [
      { label: "View all agents", href: "/agents" },
      { label: "Agent capabilities", href: "/agents" },
    ],
  },
  {
    id: "reports",
    title: "Reports & Analytics",
    description: "Understand your SEO health through diagnostics and benchmarks",
    icon: FileText,
    links: [
      { label: "View run history", href: "/runs" },
      { label: "Review audit log", href: "/audit" },
    ],
  },
];

const externalResources = [
  {
    title: "Documentation",
    description: "Full technical documentation and API reference",
    icon: Book,
    href: "#",
  },
  {
    title: "Video Tutorials",
    description: "Step-by-step video guides for common tasks",
    icon: Video,
    href: "#",
  },
  {
    title: "Contact Support",
    description: "Get help from our support team",
    icon: Mail,
    href: "mailto:support@example.com",
  },
];

export default function Help() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Help Center</h1>
          <p className="text-muted-foreground">Resources and guides to help you get the most out of Hermes</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {helpSections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.id} data-testid={`card-help-${section.id}`}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{section.title}</CardTitle>
                      <CardDescription className="text-xs">{section.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {section.links.map((link) => (
                      <Link key={link.href} href={link.href}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-sm"
                          data-testid={`link-help-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {link.label}
                        </Button>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>External Resources</CardTitle>
            <CardDescription>Additional help and support channels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {externalResources.map((resource) => {
                const Icon = resource.icon;
                return (
                  <a
                    key={resource.title}
                    href={resource.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    data-testid={`link-external-${resource.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm flex items-center gap-1">
                        {resource.title}
                        <ExternalLink className="w-3 h-3" />
                      </p>
                      <p className="text-xs text-muted-foreground">{resource.description}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-8 text-center">
            <HelpCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Still need help?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Can't find what you're looking for? Our support team is here to help.
            </p>
            <Button data-testid="btn-contact-support">
              <MessageCircle className="w-4 h-4 mr-2" />
              Contact Support
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
