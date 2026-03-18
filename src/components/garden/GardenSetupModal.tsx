import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, Sprout, MapPin, FlaskConical, Plus, Trash2, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { GARDEN_CROPS, CATEGORY_LABELS, PH_BANNER, type CropData, type CropCategory } from '@/data/gardenCrops';

interface GardenSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GardenSetupModal({ isOpen, onClose }: GardenSetupModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Garden profile state
  const [soilPh, setSoilPh] = useState('');
  const [city, setCity] = useState('');
  const [hemisphere, setHemisphere] = useState('southern');
  const [latitude, setLatitude] = useState('-26.2');
  const [longitude, setLongitude] = useState('28.0');

  // User crops state
  const [selectedCrops, setSelectedCrops] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<CropCategory | 'all'>('all');

  useEffect(() => {
    if (isOpen && user) loadProfile();
  }, [isOpen, user]);

  const loadProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load garden profile
      const { data: profile } = await supabase
        .from('garden_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        setSoilPh(profile.soil_ph?.toString() || '');
        setCity(profile.city || '');
        setHemisphere(profile.hemisphere || 'southern');
        setLatitude(profile.latitude?.toString() || '-26.2');
        setLongitude(profile.longitude?.toString() || '28.0');
      }

      // Load user crops
      const { data: crops } = await supabase
        .from('user_crops')
        .select('crop_key')
        .eq('user_id', user.id);

      if (crops) {
        setSelectedCrops(new Set(crops.map(c => c.crop_key)));
      }
    } catch (err) {
      console.error('Error loading garden profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Upsert garden profile
      const { error: profileError } = await supabase
        .from('garden_profiles')
        .upsert({
          user_id: user.id,
          soil_ph: soilPh ? parseFloat(soilPh) : null,
          city: city || null,
          hemisphere,
          latitude: parseFloat(latitude) || -26.2,
          longitude: parseFloat(longitude) || 28.0,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (profileError) throw profileError;

      // Sync user crops: delete removed, insert new
      const { data: existingCrops } = await supabase
        .from('user_crops')
        .select('id, crop_key')
        .eq('user_id', user.id);

      const existingKeys = new Set((existingCrops || []).map(c => c.crop_key));
      
      // Delete removed crops
      const toDelete = (existingCrops || []).filter(c => !selectedCrops.has(c.crop_key));
      if (toDelete.length > 0) {
        await supabase
          .from('user_crops')
          .delete()
          .in('id', toDelete.map(c => c.id));
      }

      // Insert new crops
      const toInsert = Array.from(selectedCrops)
        .filter(key => !existingKeys.has(key))
        .map(key => ({ user_id: user.id, crop_key: key }));
      
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('user_crops')
          .insert(toInsert);
        if (insertError) throw insertError;
      }

      toast.success('Garden profile saved! 🌱');
      onClose();
    } catch (err: any) {
      console.error('Error saving garden profile:', err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleCrop = (key: string) => {
    setSelectedCrops(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filteredCrops = useMemo(() => {
    if (activeCategory === 'all') return GARDEN_CROPS;
    return GARDEN_CROPS.filter(c => c.category === activeCategory);
  }, [activeCategory]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-auto" style={{ isolation: 'isolate' }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative max-w-lg w-full mx-4 max-h-[90vh] bg-gradient-to-br from-emerald-950 via-stone-950 to-emerald-950 rounded-3xl shadow-2xl border border-emerald-800/40 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-emerald-800/30 shrink-0">
          <div className="flex items-center gap-2">
            <Sprout className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-emerald-300">Garden Setup</h2>
          </div>
          <button onClick={onClose} className="text-emerald-500 hover:text-white p-1 rounded-full hover:bg-emerald-800/50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Location */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-emerald-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Location
              </label>
              <Input
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="City (e.g., Gqeberha, Cape Town)"
                className="bg-emerald-900/30 border-emerald-800/40 text-emerald-100 placeholder:text-emerald-700"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-emerald-600">Latitude</label>
                  <Input
                    value={latitude}
                    onChange={e => setLatitude(e.target.value)}
                    type="number"
                    step="0.1"
                    className="bg-emerald-900/30 border-emerald-800/40 text-emerald-100 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-emerald-600">Longitude</label>
                  <Input
                    value={longitude}
                    onChange={e => setLongitude(e.target.value)}
                    type="number"
                    step="0.1"
                    className="bg-emerald-900/30 border-emerald-800/40 text-emerald-100 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {['southern', 'northern'].map(h => (
                  <button
                    key={h}
                    onClick={() => setHemisphere(h)}
                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
                      hemisphere === h
                        ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-300'
                        : 'border-emerald-800/30 text-emerald-600 hover:border-emerald-600/40'
                    }`}
                  >
                    {h === 'southern' ? '🌍 Southern' : '🌎 Northern'} Hemisphere
                  </button>
                ))}
              </div>
            </div>

            {/* Soil pH */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-emerald-400 flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5" /> Current Soil pH (optional)
              </label>
              <Input
                value={soilPh}
                onChange={e => setSoilPh(e.target.value)}
                placeholder="e.g., 6.5"
                type="number"
                step="0.1"
                min="3"
                max="10"
                className="bg-emerald-900/30 border-emerald-800/40 text-emerald-100 placeholder:text-emerald-700"
              />
              <p className="text-[10px] text-emerald-600 leading-relaxed">{PH_BANNER}</p>
            </div>

            {/* Crop Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-emerald-400 flex items-center gap-1.5">
                <Sprout className="w-3.5 h-3.5" /> My Crops ({selectedCrops.size} selected)
              </label>

              {/* Category filter */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`whitespace-nowrap px-2 py-1 text-[10px] rounded-full border transition-all ${
                    activeCategory === 'all'
                      ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-300'
                      : 'border-emerald-800/30 text-emerald-600'
                  }`}
                >
                  All
                </button>
                {(Object.entries(CATEGORY_LABELS) as [CropCategory, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveCategory(key)}
                    className={`whitespace-nowrap px-2 py-1 text-[10px] rounded-full border transition-all ${
                      activeCategory === key
                        ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-300'
                        : 'border-emerald-800/30 text-emerald-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Crop grid */}
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {filteredCrops.map(crop => {
                  const isSelected = selectedCrops.has(crop.key);
                  return (
                    <button
                      key={crop.key}
                      onClick={() => toggleCrop(crop.key)}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-all border ${
                        isSelected
                          ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                          : 'border-emerald-800/20 text-emerald-500/70 hover:border-emerald-600/40'
                      }`}
                    >
                      <span className="text-base">{crop.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <span className="block truncate">{crop.name}</span>
                        <span className="text-[10px] text-emerald-600">pH {crop.phRange.min}–{crop.phRange.max}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* pH warnings for selected crops */}
            {soilPh && selectedCrops.size > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-medium text-emerald-400/60">pH COMPATIBILITY</p>
                {Array.from(selectedCrops).map(key => {
                  const crop = GARDEN_CROPS.find(c => c.key === key);
                  if (!crop) return null;
                  const ph = parseFloat(soilPh);
                  const isIdeal = ph >= crop.phRange.min && ph <= crop.phRange.max;
                  const isMarginal = !isIdeal && ph >= crop.phRange.min - 0.5 && ph <= crop.phRange.max + 0.5;
                  return (
                    <div key={key} className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${
                      isIdeal ? 'text-emerald-400 bg-emerald-900/20' :
                      isMarginal ? 'text-yellow-400 bg-yellow-900/20' :
                      'text-red-400 bg-red-900/20'
                    }`}>
                      <span>{crop.emoji}</span>
                      <span>{crop.name}</span>
                      <span className="ml-auto">{isIdeal ? '✅' : isMarginal ? '⚠️' : '❌'} pH {crop.phRange.min}–{crop.phRange.max}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-emerald-800/30 shrink-0">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><Sprout className="w-4 h-4 mr-2" /> Save Garden Profile</>
            )}
          </Button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
