"use client";

import { OrderWizardFooter } from "../order-wizard/OrderWizardFooter";

interface PurchaseOrderWizardFooterProps {
  activeStep: number;
  totalSteps: number;
  saving: boolean;
  totalPayableSgd: number;
  fxRate: number | null;
  onBack: () => void;
  onCancel: () => void;
  onNext: () => void;
  onSave: () => void;
}

export function PurchaseOrderWizardFooter({
  activeStep,
  totalSteps,
  saving,
  totalPayableSgd,
  fxRate,
  onBack,
  onCancel,
  onNext,
  onSave,
}: PurchaseOrderWizardFooterProps) {
  return (
    <OrderWizardFooter
      activeStep={activeStep}
      totalSteps={totalSteps}
      saving={saving}
      fullBleed={false}
      summary={(
        <div aria-live="polite" className="text-right leading-tight">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total payable</p>
          <p className="text-sm font-bold tabular-nums text-foreground">{fxRate ? "AUD" : "SGD"} {(totalPayableSgd * (fxRate ?? 1)).toFixed(2)}</p>
        </div>
      )}
      saveLabel="Save as draft"
      savingLabel="Saving…"
      onBack={onBack}
      onCancel={onCancel}
      onNext={onNext}
      onSave={onSave}
    />
  );
}
