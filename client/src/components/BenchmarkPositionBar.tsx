interface BenchmarkPositionBarProps {
  value: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  direction?: "lower-is-better" | "higher-is-better";
}

export function BenchmarkPositionBar({
  value,
  p25,
  p50,
  p75,
  p90,
  direction = "lower-is-better",
}: BenchmarkPositionBarProps) {
  const min = direction === "lower-is-better" ? p25 : p90;
  const max = direction === "lower-is-better" ? p90 : p25;
  
  const range = max - min;
  if (range === 0) return null;

  const clampedValue = Math.max(min, Math.min(max, value));
  const position = ((clampedValue - min) / range) * 100;

  const gradientDirection = direction === "lower-is-better" 
    ? "to right" 
    : "to left";

  return (
    <div className="mt-2 mb-1">
      <div 
        className="relative h-2 rounded-full overflow-visible"
        style={{
          background: `linear-gradient(${gradientDirection}, #22c55e, #eab308, #ef4444)`,
        }}
      >
        <div 
          className="absolute w-3 h-3 rounded-full bg-white border-2 border-foreground shadow-md"
          style={{ 
            left: `${position}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>

      <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
        {direction === "lower-is-better" ? (
          <>
            <span className="text-semantic-success font-medium">p25</span>
            <span className="text-semantic-warning font-medium">p50</span>
            <span className="text-gold font-medium">p75</span>
            <span className="text-semantic-danger font-medium">p90</span>
          </>
        ) : (
          <>
            <span className="text-semantic-danger font-medium">p90</span>
            <span className="text-gold font-medium">p75</span>
            <span className="text-semantic-warning font-medium">p50</span>
            <span className="text-semantic-success font-medium">p25</span>
          </>
        )}
      </div>
    </div>
  );
}
