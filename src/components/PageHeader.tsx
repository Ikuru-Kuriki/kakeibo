import type { ReactNode } from 'react';

export default function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="mb-6 flex items-center justify-between">
      <h2 className="text-2xl font-bold">{title}</h2>
      {children}
    </header>
  );
}
