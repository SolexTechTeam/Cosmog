interface OrderWizardProgressProps {
  activeStep: number;
  titles: string[];
  completed?: boolean;
}

export function OrderWizardProgress({ activeStep, titles, completed = false }: OrderWizardProgressProps) {
  return (
    <nav aria-label="Order creation progress" className="mb-6 rounded-lg border border-[#f2e7eb] bg-[#fff9fa] px-3 py-4 sm:px-5">
      <ol className="flex items-center">
        {titles.map((title, index) => {
          const isComplete = completed || index < activeStep;
          const isCurrent = !completed && index === activeStep;
          const statusColor = isComplete ? "text-emerald-700" : isCurrent ? "text-primary" : "text-muted-foreground";

          return (
            <li key={title} aria-current={isCurrent ? "step" : undefined} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <span className={`grid size-8 shrink-0 place-items-center rounded-full border text-xs font-semibold ${isCurrent ? "border-primary bg-primary text-primary-foreground" : isComplete ? "border-emerald-600 bg-emerald-600 text-white" : "border-border bg-muted text-muted-foreground"}`}>
                {isComplete ? <CheckMark /> : index + 1}
              </span>
              <span className={`min-w-0 leading-tight ${statusColor}`}>
                <span className="block text-xs font-semibold uppercase tracking-[0.08em]">Step {index + 1}</span>
                <span className={`mt-0.5 block truncate text-xs sm:text-sm ${isCurrent || isComplete ? "font-semibold" : "font-medium"}`}>{title}</span>
              </span>
              {index < titles.length - 1 && <span aria-hidden="true" className={`mx-1 h-px min-w-2 flex-1 ${isComplete ? "bg-emerald-500" : "bg-border"}`} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function CheckMark() {
  return <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 fill-none stroke-current stroke-2"><path d="m3 8 3.2 3.2L13 4.5" /></svg>;
}
