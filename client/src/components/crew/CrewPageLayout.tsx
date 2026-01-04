import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getCrewTheme, getCrewCssVars, type CrewId, type CrewTheme } from "@/lib/crewTheme";

interface CrewThemeContextValue {
  theme: CrewTheme;
  crewId: CrewId;
}

const CrewThemeContext = createContext<CrewThemeContextValue | null>(null);

export function useCrewTheme(): CrewThemeContextValue {
  const context = useContext(CrewThemeContext);
  if (!context) {
    throw new Error("useCrewTheme must be used within a CrewPageLayout");
  }
  return context;
}

export function useOptionalCrewTheme(): CrewThemeContextValue | null {
  return useContext(CrewThemeContext);
}

interface CrewPageLayoutProps {
  crewId: CrewId;
  children: ReactNode;
  className?: string;
}

export function CrewPageLayout({ crewId, children, className }: CrewPageLayoutProps) {
  const theme = useMemo(() => getCrewTheme(crewId), [crewId]);
  const cssVars = useMemo(() => getCrewCssVars(theme), [theme]);
  
  const contextValue = useMemo(
    () => ({ theme, crewId }),
    [theme, crewId]
  );
  
  return (
    <CrewThemeContext.Provider value={contextValue}>
      <div 
        className={className}
        style={cssVars as React.CSSProperties}
        data-crew={crewId}
      >
        {children}
      </div>
    </CrewThemeContext.Provider>
  );
}

export function ThemedBadge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span 
      className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}
      style={{
        backgroundColor: "var(--crew-badge)",
        color: "var(--crew-text)",
        borderColor: "var(--crew-ring)",
      }}
    >
      {children}
    </span>
  );
}

export function ThemedCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div 
      className={`rounded-xl border p-4 ${className}`}
      style={{
        backgroundColor: "var(--crew-bg)",
        borderColor: "var(--crew-ring)",
      }}
    >
      {children}
    </div>
  );
}

export function ThemedHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div 
      className={`${className}`}
      style={{
        color: "var(--crew-text)",
      }}
    >
      {children}
    </div>
  );
}
