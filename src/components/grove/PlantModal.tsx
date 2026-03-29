import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sprout } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PlantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const plantOptions = [
  {
    id: 'orchard',
    title: 'Sow an Orchard',
    description: 'Create a crowdfunding orchard for your community',
    icon: Sprout,
    href: '/orchards/new',
    color: 'text-green-500 hover:bg-green-500/10'
  },
  {
    id: 'seed',
    title: 'Sow a Seed',
    description: 'Share a product, service, or creative offering',
    icon: Sprout,
    href: '/sow',
    color: 'text-amber-500 hover:bg-amber-500/10'
  }
];

export function PlantModal({ open, onOpenChange }: PlantModalProps) {
  const navigate = useNavigate();

  const handlePlant = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sprout className="h-6 w-6 text-primary" />
            Plant Your Grove
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-3 py-4">
          {plantOptions.map((option, index) => {
            const Icon = option.icon;
            return (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Button
                  onClick={() => handlePlant(option.href)}
                  variant="outline"
                  className={cn(
                    'w-full h-auto p-4 justify-start text-left transition-all',
                    option.color
                  )}
                >
                  <div className="flex items-start gap-3 w-full">
                    <Icon className="h-6 w-6 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold mb-1">{option.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {option.description}
                      </div>
                    </div>
                  </div>
                </Button>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center text-xs text-muted-foreground pt-2 border-t">
          💡 Tip: Share products, earn bestows, grow your harvest
        </div>
      </DialogContent>
    </Dialog>
  );
}
