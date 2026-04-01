import React from 'react';
import { Check, Clock, Package, Truck, CheckCircle2 } from 'lucide-react';

const STEPS = [
  { key: 'pending', label: 'Payment Received', icon: Clock },
  { key: 'confirmed', label: 'Order Confirmed', icon: Check },
  { key: 'picked_up', label: 'Picked Up', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Package },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
];

const STATUS_ORDER = STEPS.map(s => s.key);

interface OrderTimelineProps {
  status: string;
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ status }) => {
  const currentIdx = STATUS_ORDER.indexOf(status);

  return (
    <div className="flex items-center gap-1 w-full">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isDone = idx <= currentIdx;
        const isCurrent = idx === currentIdx;

        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center min-w-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                isDone 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              } ${isCurrent ? 'ring-2 ring-primary/30' : ''}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className={`text-[9px] mt-1 text-center leading-tight ${
                isDone ? 'text-primary font-semibold' : 'text-muted-foreground'
              }`}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mt-[-12px] ${
                idx < currentIdx ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
