import type { ReactNode } from 'react';

export default function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-center justify-between gap-3 md:mb-6">
      <h2 className="text-xl font-bold md:text-2xl">{title}</h2>
      {children}
    </header>
  );
}
