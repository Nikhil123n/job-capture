type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <section className="rounded-2xl border border-dashed border-border bg-panel px-6 py-10 text-center shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted">
        {description}
      </p>
    </section>
  );
}
