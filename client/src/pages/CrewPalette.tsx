import { AGENTS, USER_FACING_AGENTS, getCrewMember } from "@/config/agents";
import { getCrewColorSet } from "@/lib/crewColors";

export default function CrewPalette() {
  const userFacingAgents = USER_FACING_AGENTS.map(id => getCrewMember(id));
  
  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-bold text-foreground mb-2">Crew Color Palette</h1>
      <p className="text-muted-foreground mb-8">Dev tool for checking color distinctness and brightness consistency</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {userFacingAgents.map((agent) => {
          const colors = getCrewColorSet(agent.service_id);
          const Icon = agent.icon;
          
          return (
            <div
              key={agent.service_id}
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: colors.accentSoft,
                border: `1px solid ${colors.accentBorder}`,
              }}
            >
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: colors.accentSoft }}
                  >
                    <Icon className="w-5 h-5" style={{ color: colors.accent }} />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{agent.nickname}</div>
                    <div className="text-sm text-muted-foreground">{agent.role}</div>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: colors.accent }}
                    />
                    <span className="text-foreground font-mono">{colors.accent}</span>
                    <span className="text-muted-foreground">accent</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border border-border"
                      style={{ backgroundColor: colors.accentSoft }}
                    />
                    <span className="text-foreground font-mono text-xs">{colors.accentSoft.slice(0, 20)}...</span>
                    <span className="text-muted-foreground">soft</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded"
                      style={{ 
                        backgroundColor: 'transparent',
                        border: `2px solid ${colors.accentBorder}` 
                      }}
                    />
                    <span className="text-foreground font-mono text-xs">{colors.accentBorder.slice(0, 20)}...</span>
                    <span className="text-muted-foreground">border</span>
                  </div>
                </div>
                
                <div className="mt-4 flex gap-2">
                  <span
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: colors.accentSoft,
                      color: colors.accent,
                      border: `1px solid ${colors.accentBorder}`,
                    }}
                  >
                    Sample Pill
                  </span>
                  <span
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: colors.accent,
                      color: '#fff',
                    }}
                  >
                    Solid Pill
                  </span>
                </div>
              </div>
              
              <div
                className="h-2"
                style={{ backgroundColor: colors.accent }}
              />
            </div>
          );
        })}
      </div>
      
      <div className="mt-12">
        <h2 className="text-xl font-bold text-foreground mb-4">All Cards Side-by-Side</h2>
        <div className="flex flex-wrap gap-2">
          {userFacingAgents.map((agent) => {
            const colors = getCrewColorSet(agent.service_id);
            return (
              <div
                key={agent.service_id}
                className="px-3 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: colors.accentSoft,
                  color: colors.accent,
                  border: `1px solid ${colors.accentBorder}`,
                }}
              >
                {agent.nickname}
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-bold text-foreground mb-4">Solid Accents</h2>
        <div className="flex flex-wrap gap-2">
          {userFacingAgents.map((agent) => {
            const colors = getCrewColorSet(agent.service_id);
            return (
              <div
                key={agent.service_id}
                className="px-3 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: colors.accent }}
              >
                {agent.nickname}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
