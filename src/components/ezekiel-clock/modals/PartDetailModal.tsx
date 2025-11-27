'use client';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

const PART_DETAILS: Record<number, { name: string; description: string; meaning: string }> = {
  1: { name: 'Reuben - Firstborn', description: 'The first light of day', meaning: 'Beginnings, primacy' },
  2: { name: 'Simeon - Hearing', description: 'The morning call', meaning: 'Listening, understanding' },
  3: { name: 'Levi - Joined', description: 'Unity in light', meaning: 'Connection, service' },
  4: { name: 'Judah - Praise', description: 'The rising sun', meaning: 'Worship, exaltation' },
  5: { name: 'Dan - Judgment', description: 'Mid-morning clarity', meaning: 'Discernment, justice' },
  6: { name: 'Naphtali - Struggle', description: 'The growing heat', meaning: 'Perseverance, conflict' },
  7: { name: 'Gad - Troop', description: 'Noon assembly', meaning: 'Community, gathering' },
  8: { name: 'Asher - Happy', description: 'Afternoon joy', meaning: 'Blessing, contentment' },
  9: { name: 'Issachar - Reward', description: 'Evening harvest', meaning: 'Fruitfulness, recompense' },
  10: { name: 'Zebulun - Dwelling', description: 'Sunset rest', meaning: 'Home, peace' },
  11: { name: 'Joseph - Increase', description: 'Twilight abundance', meaning: 'Growth, multiplication' },
  12: { name: 'Benjamin - Son of Right Hand', description: 'Last light of day', meaning: 'Favor, strength' },
  13: { name: 'Kohath - Assembly', description: 'First watch of night', meaning: 'Gathering, order' },
  14: { name: 'Gershon - Exile', description: 'Deep night watch', meaning: 'Separation, journey' },
  15: { name: 'Merari - Bitter', description: 'Midnight watch', meaning: 'Trial, purification' },
  16: { name: 'Night Watch', description: 'Pre-dawn vigil', meaning: 'Alertness, preparation' },
  17: { name: 'Deep Night', description: 'Darkest hour', meaning: 'Mystery, depth' },
  18: { name: 'Gate of Dawn', description: 'Approaching light', meaning: 'Hope, transition' },
};

interface PartDetailModalProps {
  part: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PartDetailModal = ({ part, isOpen, onClose }: PartDetailModalProps) => {
  if (!part) return null;

  const details = PART_DETAILS[part];

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <DialogPanel
              as={motion.div}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-gradient-to-br from-amber-950/95 via-orange-950/95 to-yellow-900/95 backdrop-blur-xl rounded-2xl border border-amber-500/30 shadow-2xl p-6"
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-amber-400/60 hover:text-amber-300 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>

              <DialogTitle className="text-2xl font-bold text-amber-300 mb-4">
                Part {part}
              </DialogTitle>

              {details && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-amber-200 mb-2">{details.name}</h3>
                    <p className="text-amber-100/80 mb-3">{details.description}</p>
                    <p className="text-sm text-amber-300/70 italic">Meaning: {details.meaning}</p>
                  </div>

                  <div className="pt-4 border-t border-amber-500/20">
                    <p className="text-xs text-amber-400/60">
                      This part represents a sacred moment in the daily cycle, connecting earthly time
                      with the eternal rhythms of creation.
                    </p>
                  </div>
                </div>
              )}
            </DialogPanel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

