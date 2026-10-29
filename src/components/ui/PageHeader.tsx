import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export function PageHeader({ title, description, actions, badge }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 animate-slide-up">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="page-title">{title}</h1>
          {badge}
        </div>
        {description && <p className="page-subtitle">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
