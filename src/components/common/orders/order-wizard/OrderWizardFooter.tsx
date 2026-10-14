import type { ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

interface OrderWizardFooterProps {
  activeStep: number;
  totalSteps: number;
  saving: boolean;
  fullBleed?: boolean;
  summary?: ReactNode;
  continueLabel?: string;
  saveLabel?: string;
  savingLabel?: string;
  onBack: () => void;
  onCancel: () => void;
  onNext: () => void;
  onSave: () => void;
}

export function OrderWizardFooter({
  activeStep,
  totalSteps,
  saving,
  fullBleed = true,
  summary,
  continueLabel = "Continue",
  saveLabel = "Create order",
  savingLabel = "Saving…",
  onBack,
  onCancel,
  onNext,
  onSave,
}: OrderWizardFooterProps) {
  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === totalSteps - 1;

  return (
    <footer className={`mt-6 flex flex-wrap items-center justify-between gap-3 border-t bg-[#f5f8fc] py-3 ${fullBleed ? "-mx-[22px] px-[22px] sm:-mx-[26px] sm:px-[26px]" : "w-full min-w-0 px-3"}`}>
      <div className="flex items-center gap-2">
        {isFirstStep ? (
          <button type="button" onClick={onCancel} disabled={saving} className="rounded-md border border-[#d7e0eb] bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-[#f8fafc] disabled:opacity-60">Cancel</button>
        ) : (
          <button type="button" onClick={onBack} disabled={saving} className="inline-flex items-center gap-1 rounded-md border border-[#d7e0eb] bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-[#f8fafc] disabled:opacity-60"><ChevronLeft aria-hidden="true" className="size-4" />{isLastStep ? `Back to Step ${activeStep}` : "Back"}</button>
        )}
      </div>

      <div className="ml-auto flex flex-wrap items-center justify-end gap-3 sm:gap-5">
        {isLastStep ? summary : <span className="text-xs font-medium text-muted-foreground">Step {activeStep + 1} of {totalSteps}</span>}
        <button type="button" onClick={isLastStep ? onSave : onNext} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-[#ea580c] disabled:opacity-60">
          {isLastStep ? <Check aria-hidden="true" className="size-4" /> : null}
          {saving ? savingLabel : isLastStep ? saveLabel : continueLabel}
          {!isLastStep && <ChevronRight aria-hidden="true" className="size-4" />}
        </button>
      </div>
    </footer>
  );
}
