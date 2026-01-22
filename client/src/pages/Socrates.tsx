import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SocratesContent } from "./socrates/SocratesContent";

export default function Socrates() {
  return (
    <DashboardLayout className="dashboard-light">
      <SocratesContent />
    </DashboardLayout>
  );
}
