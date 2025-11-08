import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageSquare, Users, BookOpen, Radio, Sprout } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PlantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const plantOptions = [
  {
    id: 'chat_1on1',
    title: 'Seed a 1-1',
    description: 'Private conversation with direct messaging',
    icon: MessageSquare,
    href: '/chatapp',
    color: 'text-blue-500 hover:bg-blue-500/10'
  },
  {
    id: 'community',
    title: 'Grow Community',
    description: 'Group chat with unlimited participants',
    icon: Users,
    href: '/chatapp',
    color: 'text-green-500 hover:bg-green-500/10'
  },
  {
    id: 'premium_room',
    title: 'Host Room',
    description: 'Educational session with uploads & access control',
    icon: BookOpen,
    href: '/create-premium-room',
    color: 'text-purple-500 hover:bg-purple-500/10'
  },
  {
    id: 'radio',
    title: 'Tune Radio',
    description: 'Live audio stream with co-hosts',
    icon: Radio,
    href: '/grove-station',
    color: 'text-orange-500 hover:bg-orange-500/10'
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
