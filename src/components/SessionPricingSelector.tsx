import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Gift, Calendar, Repeat } from 'lucide-react';

export type PricingType = 'free' | 'per_session' | 'monthly';

interface SessionPricingSelectorProps {
  pricingType: PricingType;
  onPricingTypeChange: (type: PricingType) => void;
  sessionFee: number;
  onSessionFeeChange: (fee: number) => void;
  currency?: string;
  sessionLabel?: string; // e.g., "SkillDrop", "Classroom", "Radio Show"
}

/**
 * Reusable pricing selector for all session types:
 * SkillDrop, Classrooms, Training, Radio, Premium Rooms.
 * Hosts choose: Free, Per-Session, or Monthly subscription.
 * Revenue split: 85% host, 10% tithing, 5% admin.
 */
export const SessionPricingSelector: React.FC<SessionPricingSelectorProps> = ({
  pricingType,
  onPricingTypeChange,
  sessionFee,
  onSessionFeeChange,
  currency = 'USDT',
  sessionLabel = 'Session',
}) => {
  const isPaid = pricingType !== 'free';

  return (
    <div className="space-y-4">
      <Label className="text-sm font-semibold">Pricing Model</Label>
      <RadioGroup
        value={pricingType}
        onValueChange={(v) => onPricingTypeChange(v as PricingType)}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        {/* Free */}
        <label
          className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
            pricingType === 'free'
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-border hover:border-muted-foreground/40'
          }`}
        >
          <RadioGroupItem value="free" id="pricing-free" />
          <div>
            <div className="flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-emerald-500" />
              <span className="font-medium text-sm">Free</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Open to everyone</p>
          </div>
        </label>

        {/* Per Session */}
        <label
          className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
            pricingType === 'per_session'
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-border hover:border-muted-foreground/40'
          }`}
        >
          <RadioGroupItem value="per_session" id="pricing-per-session" />
          <div>
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-amber-500" />
              <span className="font-medium text-sm">Per Session</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">One-time per session</p>
          </div>
        </label>

        {/* Monthly */}
        <label
          className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
            pricingType === 'monthly'
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-border hover:border-muted-foreground/40'
          }`}
        >
          <RadioGroupItem value="monthly" id="pricing-monthly" />
          <div>
            <div className="flex items-center gap-1.5">
              <Repeat className="w-4 h-4 text-indigo-500" />
              <span className="font-medium text-sm">Monthly</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Recurring access</p>
          </div>
        </label>
      </RadioGroup>

      {/* Fee input */}
      {isPaid && (
        <div className="space-y-2">
          <Label htmlFor="session-fee">
            {pricingType === 'monthly' ? 'Monthly Fee' : `${sessionLabel} Fee`} ({currency})
          </Label>
          <Input
            id="session-fee"
            type="number"
            min={1}
            step={0.5}
            value={sessionFee}
            onChange={(e) => onSessionFeeChange(parseFloat(e.target.value) || 0)}
            placeholder="5.00"
          />
          {/* Revenue split preview */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Revenue Split Preview</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-sm font-bold text-emerald-500">{(sessionFee * 0.85).toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">You (85%)</p>
              </div>
              <div>
                <p className="text-sm font-bold text-amber-500">{(sessionFee * 0.10).toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">Tithing (10%)</p>
              </div>
              <div>
                <p className="text-sm font-bold text-muted-foreground">{(sessionFee * 0.05).toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">Admin (5%)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {pricingType === 'free' && (
        <Badge variant="outline" className="text-emerald-600 border-emerald-400">
          <Gift className="w-3 h-3 mr-1" /> This {sessionLabel.toLowerCase()} will be free for everyone
        </Badge>
      )}
    </div>
  );
};
