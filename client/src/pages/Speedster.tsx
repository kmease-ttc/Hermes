import { DashboardLayout } from "@/components/layout/DashboardLayout";
import SpeedsterContent from "./speedster/SpeedsterContent";

export default function Speedster() {
  return (
    <DashboardLayout className="dashboard-light">
      <SpeedsterContent />
    </DashboardLayout>
  );
}
