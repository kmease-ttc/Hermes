import React from "react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  badgeText?: string;
  rightSlot?: React.ReactNode;
  highlight?: string;
};

function GradientText({ text }: { text: string }) {
  return <span className="bg-brand-gradient bg-clip-text text-transparent">{text}</span>;
}

export function PageHeader({ title, subtitle, badgeText, rightSlot, highlight }: PageHeaderProps) {
  const renderTitle = () => {
    if (!highlight) return title;
    const idx = title.toLowerCase().indexOf(highlight.toLowerCase());
    if (idx === -1) return title;

    const before = title.slice(0, idx);
    const mid = title.slice(idx, idx + highlight.length);
    const after = title.slice(idx + highlight.length);

    return (
      <>
        {before}
        <GradientText text={mid} />
        {after}
      </>
    );
  };

  return (
    <div className="mb-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
              {renderTitle()}
            </h1>

            {badgeText ? (
              <span className="inline-flex items-center rounded-full bg-surface-primary px-3 py-1 text-xs font-medium text-text-primary shadow-card ring-1 ring-surface-border">
                <span className="mr-2 h-2 w-2 rounded-full bg-brand-gradient" />
                {badgeText}
              </span>
            ) : null}
          </div>

          {subtitle ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-3">{rightSlot}</div>
      </div>
    </div>
  );
}
