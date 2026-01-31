export function HealthScoreRing({ score }: { score: number }) {
  let color = "text-semantic-danger";
  let bgColor = "bg-semantic-danger-soft";
  if (score >= 80) {
    color = "text-semantic-success";
    bgColor = "bg-semantic-success-soft";
  } else if (score >= 60) {
    color = "text-semantic-warning";
    bgColor = "bg-semantic-warning-soft";
  } else if (score >= 40) {
    color = "text-gold";
    bgColor = "bg-gold-soft";
  }

  return (
    <div className={`w-32 h-32 relative flex items-center justify-center rounded-full ${bgColor}`} data-testid="health-score-ring">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-muted"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeDasharray={`${(score / 100) * 263.9} 263.9`}
          className={color}
          strokeLinecap="round"
        />
      </svg>
      <div className="text-center">
        <span className={`text-3xl font-bold ${color}`} data-testid="health-score-value">{score}</span>
        <span className="text-sm text-muted-foreground block">/100</span>
      </div>
    </div>
  );
}
