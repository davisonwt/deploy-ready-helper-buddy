import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';

// Opt-in only -- every existing caller (RadioSlotApplicationWizard,
// PremiumRoomCreationWizard, etc.) keeps today's exact look by simply not
// passing `theme`. 'stall' is the gold-on-dark-wood frame StallInteriorView
// uses, for StallBuildPage's own restyle.
const THEMES = {
  default: {
    root: '',
    title: 'text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent',
    description: 'text-muted-foreground',
    stepDone: 'bg-primary text-primary-foreground',
    stepCurrent: 'bg-primary/20 text-primary border-2 border-primary',
    stepFuture: 'bg-muted text-muted-foreground',
    stepLabelCurrent: 'text-primary',
    stepLabelOther: 'text-muted-foreground',
    connectorDone: 'bg-primary',
    connectorFuture: 'bg-muted',
    card: '',
    cardHeader: '',
    submitButton: 'bg-blue-600 hover:bg-blue-700',
  },
  stall: {
    root: 'text-amber-50',
    title: 'font-serif text-3xl font-bold text-amber-50',
    description: 'text-amber-100/60',
    stepDone: 'bg-amber-500 text-amber-950',
    stepCurrent: 'bg-amber-500/20 text-amber-300 border-2 border-amber-400',
    stepFuture: 'bg-black/40 text-amber-100/40 border border-amber-500/15',
    stepLabelCurrent: 'text-amber-300',
    stepLabelOther: 'text-amber-100/40',
    connectorDone: 'bg-amber-500',
    connectorFuture: 'bg-amber-500/15',
    card: 'bg-[#140c06] border-amber-500/20',
    cardHeader: 'border-b border-amber-500/10',
    submitButton: 'bg-amber-500 hover:bg-amber-400 text-amber-950',
  },
};

export function WizardContainer({
  steps,
  currentStep,
  onStepChange,
  children,
  title,
  description,
  onCancel,
  onSubmit,
  isSubmitting = false,
  canGoNext = true,
  canGoBack = true,
  nextLabel = "Next",
  backLabel = "Back",
  submitLabel = "Submit",
  theme = "default",
}) {
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  const t = THEMES[theme] ?? THEMES.default;

  const { setWizardOpen } = useAppContext();
  useEffect(() => {
    setWizardOpen(true);
    return () => setWizardOpen(false);
  }, [setWizardOpen]);

  const handleNext = () => {
    if (isLastStep) {
      onSubmit?.();
    } else {
      onStepChange(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      onStepChange(currentStep - 1);
    }
  };

  return (
    <div className={`max-w-4xl mx-auto p-4 space-y-6 ${t.root}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className={t.title}>
          {title}
        </h1>
        <p className={t.description}>{description}</p>
      </div>

      {/* Progress Steps. items-start (not items-center) on the row: a
          label that wraps to two lines makes its own column taller, and
          items-center was vertically centering each column against the
          row's tallest one -- any step whose title happened to fit on
          one line (e.g. "Interior" next to "Mark your shelves") had its
          circle pulled down out of line with the rest. Aligning columns
          to the top keeps every circle at the same y regardless of label
          length; the connector gets its own mt-5 to land across the
          circles' own vertical center (h-10 circle => 20px) instead of
          the row's top edge. */}
      <div className="flex items-start justify-center gap-2">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  index < currentStep ? t.stepDone : index === currentStep ? t.stepCurrent : t.stepFuture
                }`}
              >
                {index < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  index + 1
                )}
              </div>
              <div className="text-center hidden sm:block">
                <div className={`text-sm font-medium ${
                  index === currentStep ? t.stepLabelCurrent : t.stepLabelOther
                }`}>
                  {step.title}
                </div>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`mt-5 h-0.5 w-12 sm:w-20 transition-all ${
                  index < currentStep ? t.connectorDone : t.connectorFuture
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Main Content Card */}
      <Card className={t.card}>
        <CardHeader className={t.cardHeader}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className={`flex items-center gap-2 ${theme === 'stall' ? 'font-serif text-amber-100' : ''}`}>
                {steps[currentStep].icon}
                {steps[currentStep].title}
              </CardTitle>
              <CardDescription className={`mt-2 ${theme === 'stall' ? 'text-amber-100/60' : ''}`}>
                {steps[currentStep].description}
              </CardDescription>
            </div>
            <Badge variant="outline" className={theme === 'stall' ? 'border-amber-500/30 text-amber-300' : ''}>
              Step {currentStep + 1} of {steps.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {children}

          {/* Navigation Buttons */}
          <div className={`flex justify-between pt-6 border-t ${theme === 'stall' ? 'border-amber-500/10' : ''}`}>
            <div>
              {!isFirstStep ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSubmitting || !canGoBack}
                  className={theme === 'stall' ? 'border-amber-500/30 text-amber-100 hover:bg-amber-500/10' : ''}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {backLabel}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className={theme === 'stall' ? 'text-amber-100/70 hover:bg-amber-500/10 hover:text-amber-100' : ''}
                >
                  Cancel
                </Button>
              )}
            </div>
            <Button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting || !canGoNext}
              className={t.submitButton}
            >
              {isSubmitting ? (
                "Processing..."
              ) : isLastStep ? (
                submitLabel
              ) : (
                <>
                  {nextLabel}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
