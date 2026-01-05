import { FileText, Zap, Building, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DeployOptionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectDiy: () => void;
  onSelectAutopilot: () => void;
  onSelectManaged: () => void;
}

interface OptionCardProps {
  icon: React.ReactNode;
  label: string;
  price: string;
  bullets: string[];
  ctaText: string;
  onClick: () => void;
  highlighted?: boolean;
  badge?: string;
  testId: string;
}

function OptionCard({
  icon,
  label,
  price,
  bullets,
  ctaText,
  onClick,
  highlighted = false,
  badge,
  testId,
}: OptionCardProps) {
  return (
    <Card
      className={`flex flex-col h-full ${
        highlighted
          ? "border-[#D4AF37] bg-[#D4AF37]/5 ring-1 ring-[#D4AF37]/30"
          : "border-gray-700 bg-gray-900/50"
      }`}
      data-testid={testId}
    >
      <CardContent className="flex flex-col h-full p-5">
        <div className="flex items-start justify-between mb-3">
          <div
            className={`p-2 rounded-lg ${
              highlighted ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "bg-gray-800 text-gray-400"
            }`}
          >
            {icon}
          </div>
          {badge && (
            <Badge variant="gold" className="text-xs" data-testid={`${testId}-badge`}>
              {badge}
            </Badge>
          )}
        </div>

        <h3 className="text-lg font-semibold mb-1" data-testid={`${testId}-label`}>
          {label}
        </h3>
        <p
          className={`text-2xl font-bold mb-4 ${
            highlighted ? "text-[#D4AF37]" : "text-white"
          }`}
          data-testid={`${testId}-price`}
        >
          {price}
        </p>

        <ul className="space-y-2 mb-6 flex-1">
          {bullets.map((bullet, index) => (
            <li
              key={index}
              className="flex items-start gap-2 text-sm text-gray-400"
              data-testid={`${testId}-bullet-${index}`}
            >
              <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>

        <Button
          variant={highlighted ? "gold" : "outline"}
          className="w-full"
          onClick={onClick}
          data-testid={`${testId}-cta`}
        >
          {ctaText}
        </Button>
      </CardContent>
    </Card>
  );
}

export function DeployOptionsModal({
  open,
  onOpenChange,
  onSelectDiy,
  onSelectAutopilot,
  onSelectManaged,
}: DeployOptionsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl"
        data-testid="deploy-options-modal"
      >
        <DialogHeader>
          <DialogTitle
            className="text-2xl text-center"
            data-testid="deploy-options-title"
          >
            How would you like to move forward?
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <OptionCard
            icon={<FileText className="w-5 h-5" />}
            label="DIY"
            price="Free"
            bullets={[
              "View prioritized fixes",
              "Download implementation instructions",
              "Share with your dev team",
            ]}
            ctaText="View instructions"
            onClick={onSelectDiy}
            testId="option-diy"
          />

          <OptionCard
            icon={<Zap className="w-5 h-5" />}
            label="Autopilot"
            price="$99/mo"
            bullets={[
              "Continuous monitoring",
              "Prioritized fixes",
              "Safe deployment workflow",
              "Cancel anytime",
            ]}
            ctaText="Turn on Autopilot"
            onClick={onSelectAutopilot}
            highlighted
            badge="Most popular"
            testId="option-autopilot"
          />

          <OptionCard
            icon={<Building className="w-5 h-5" />}
            label="Done-for-you"
            price="From $1,500"
            bullets={[
              "We rebuild or build your site",
              "SEO-first structure",
              "Hosting + ongoing management",
            ]}
            ctaText="Build & manage my site"
            onClick={onSelectManaged}
            testId="option-managed"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DeployOptionsModal;
