import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery } from "@tanstack/react-query";

export default function Analysis() {
  const { data: report } = useQuery({
    queryKey: ['report'],
    queryFn: async () => {
      const res = await fetch('/api/report/latest');
      if (!res.ok) return null;
      return res.json();
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Analysis</h1>
          <p className="text-muted-foreground">Latest diagnostic report and insights</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          {report ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Report: {report.date}</h2>
                <span className="text-sm text-muted-foreground">
                  Generated: {new Date(report.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-muted-foreground">{report.summary}</p>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md overflow-auto max-h-[600px]">
                  {report.markdownReport}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No reports yet. Run diagnostics to generate a report.
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
