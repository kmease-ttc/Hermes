import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useSiteContext } from "@/hooks/useSiteContext";
import { FileText } from "lucide-react";

export default function ContentDashboard() {
  const { selectedSite } = useSiteContext();

  return (
    <DashboardLayout className="dashboard-light">
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-foreground">Content & On-Page</h1>
          <p className="text-muted-foreground mt-1">
            Content quality, on-page SEO, and blog drafts for {selectedSite?.displayName || "your website"}
          </p>
        </header>

        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <FileText className="w-7 h-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Coming Soon</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            Content analysis, quality scoring, and AI-generated blog drafts are on the way.
            Hemingway will analyze your pages and suggest improvements.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
