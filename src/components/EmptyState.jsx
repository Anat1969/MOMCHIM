export default function EmptyState({ title, description, children }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
        <span className="text-3xl font-frank text-muted-foreground">?</span>
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2 font-frank">{title}</h3>
      <p className="text-muted-foreground max-w-md leading-relaxed">{description}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}