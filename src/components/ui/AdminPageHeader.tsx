import React from "react";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
}

export function AdminPageHeader({ title, description, actions, eyebrow }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 animate-slide-up">
      <div>
        {eyebrow && (
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/90 mb-1.5">
            {eyebrow}
          </p>
        )}
        <h1 className="admin-page-title">{title}</h1>
        {description && <p className="admin-page-subtitle">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
