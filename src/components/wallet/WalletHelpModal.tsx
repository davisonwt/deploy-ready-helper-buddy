import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { WalletOnboardingGuide } from './WalletOnboardingGuide';

interface WalletHelpModalProps {
  triggerText?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
}

export function WalletHelpModal({ 
  triggerText = 'Payment Help', 
  variant = 'outline' 
}: WalletHelpModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm">
          <HelpCircle className="mr-2 h-4 w-4" />
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How to Make Payments</DialogTitle>
          <DialogDescription>
            Complete guide to setting up your wallet and making your first bestowal
          </DialogDescription>
        </DialogHeader>
        <WalletOnboardingGuide />
      </DialogContent>
    </Dialog>
  );
}
