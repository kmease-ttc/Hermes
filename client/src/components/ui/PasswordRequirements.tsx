import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordRequirement {
  label: string;
  met: boolean;
}

interface PasswordRequirementsProps {
  password: string;
  className?: string;
}

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    { label: "At least 10 characters", met: password.length >= 10 },
    { label: "One uppercase letter (A-Z)", met: /[A-Z]/.test(password) },
    { label: "One lowercase letter (a-z)", met: /[a-z]/.test(password) },
    { label: "One number (0-9)", met: /[0-9]/.test(password) },
    { label: "One special character (!@#$%^&*)", met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];
}

export function isPasswordValid(password: string): boolean {
  const requirements = getPasswordRequirements(password);
  return requirements.every(req => req.met);
}

export function PasswordRequirements({ password, className }: PasswordRequirementsProps) {
  const requirements = getPasswordRequirements(password);
  const hasStartedTyping = password.length > 0;

  if (!hasStartedTyping) {
    return (
      <div className={cn("text-xs text-gray-500 space-y-1", className)}>
        <p className="font-medium mb-1">Password requirements:</p>
        <ul className="space-y-0.5 text-gray-400">
          {requirements.map((req, idx) => (
            <li key={idx} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border border-gray-300" />
              <span>{req.label}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={cn("text-xs space-y-1", className)}>
      <p className="font-medium text-gray-600 mb-1">Password requirements:</p>
      <ul className="space-y-0.5">
        {requirements.map((req, idx) => (
          <li 
            key={idx} 
            className={cn(
              "flex items-center gap-1.5 transition-colors",
              req.met ? "text-emerald-600" : "text-gray-400"
            )}
          >
            {req.met ? (
              <Check className="w-3 h-3" />
            ) : (
              <X className="w-3 h-3" />
            )}
            <span>{req.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
