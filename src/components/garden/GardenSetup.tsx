/**
 * GardenSetup — lightweight Garden Profile editor for the 364yhvh page.
 * Stores the gardener's hemisphere, location, soil pH, and selected crops
 * in localStorage so daily Garden Tips can be tailored.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Sprout, MapPin, FlaskConical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Hemisphere = 'north' | 'south';

interface Crop {
  id: string;
  name: string;
  emoji: string;
  category: 'fruit' | 'leafy' | 'root' | 'herb' | 'brassica';
  ph: string;
}

const CROPS: Crop[] = [
  { id: 'tomato', name: 'Tomatoes', emoji: '🍅', category: 'fruit', ph: '5.5–7' },
  { id: 'cucumber', name: 'Cucumbers', emoji: '🥒', category: 'fruit', ph: '5.5–7' },
  { id: 'zucchini', name: 'Zucchini', emoji: '🥒', category: 'fruit', ph: '5.5–7' },
  { id: 'pepper', name: 'Peppers / Chillies', emoji: '🌶️', category: 'fruit', ph: '5.5–7' },
  { id: 'eggplant', name: 'Eggplant / Aubergine', emoji: '🍆', category: 'fruit', ph: '5.5–7' },
  { id: 'strawberry', name: 'Strawberries', emoji: '🍓', category: 'fruit', ph: '5.5–6.5' },
  { id: 'lettuce', name: 'Lettuce', emoji: '🥬', category: 'leafy', ph: '6.0–7' },
  { id: 'spinach', name: 'Spinach', emoji: '🥬', category: 'leafy', ph: '6.5–7.5' },
  { id: 'kale', name: 'Kale', emoji: '🥬', category: 'leafy', ph: '6.0–7.5' },
  { id: 'carrot', name: 'Carrots', emoji: '🥕', category: 'root', ph: '6.0–6.8' },
  { id: 'beet', name: 'Beetroot', emoji: '🟣', category: 'root', ph: '6.0–7.5' },
  { id: 'onion', name: 'Onions', emoji: '🧅', category: 'root', ph: '6.0–7' },
  { id: 'garlic', name: 'Garlic', emoji: '🧄', category: 'root', ph: '6.0–7' },
  { id: 'basil', name: 'Basil', emoji: '🌿', category: 'herb', ph: '6.0–7.5' },
  { id: 'mint', name: 'Mint', emoji: '🌿', category: 'herb', ph: '6.0–7' },
  { id: 'rosemary', name: 'Rosemary', emoji: '🌿', category: 'herb', ph: '6.0–7' },
  { id: 'broccoli', name: 'Broccoli', emoji: '🥦', category: 'brassica', ph: '6.0–7' },
  { id: 'cabbage', name: 'Cabbage', emoji: '🥬', category: 'brassica', ph: '6.5–7' },
];

const CATEGORIES: { id: Crop['category'] | 'all'; label: string; emoji: string }[] = [
  { id: 'all', label: 'All', emoji: '✨' },
  { id: 'fruit', label: 'Fruit Crops', emoji: '🍅' },
  { id: 'leafy', label: 'Leafy Greens', emoji: '🥬' },
  { id: 'root', label: 'Root Crops', emoji: '🥕' },
  { id: 'herb', label: 'Herbs', emoji: '🌿' },
  { id: 'brassica', label: 'Brassicas', emoji: '🥦' },
];

export interface GardenProfile {
  city: string;
  lat: number;
  lon: number;
  hemisphere: Hemisphere;
  soilPh: string;
  crops: string[];
}

const STORAGE_KEY = 'sow2grow.gardenProfile';

export function loadGardenProfile(): GardenProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function GardenSetup({ onClose }: { onClose?: () => void }) {
  const existing = loadGardenProfile();
  const [city, setCity] = useState(existing?.city ?? '');
  const [lat, setLat] = useState<string>(existing ? String(existing.lat) : '-26.2');
  const [lon, setLon] = useState<string>(existing ? String(existing.lon) : '28.0');
  const [hemisphere, setHemisphere] = useState<Hemisphere>(existing?.hemisphere ?? 'south');
  const [soilPh, setSoilPh] = useState(existing?.soilPh ?? '');
  const [filter, setFilter] = useState<Crop['category'] | 'all'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set(existing?.crops ?? []));

  const visible = useMemo(
    () => (filter === 'all' ? CROPS : CROPS.filter(c => c.category === filter)),
    [filter]
  );

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const save = () => {
    const profile: GardenProfile = {
      city,
      lat: parseFloat(lat) || 0,
      lon: parseFloat(lon) || 0,
      hemisphere,
      soilPh,
      crops: Array.from(selected),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    onClose?.();
  };

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/40 to-black/60 p-5 md:p-6 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-5">
        <h3 className="flex items-center gap-2 text-xl font-bold text-emerald-300">
          <Sprout className="h-5 w-5" /> Garden Setup
        </h3>
        {onClose && (
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 flex items-center justify-center text-emerald-200">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Location */}
      <div className="space-y-3 mb-6">
        <label className="flex items-center gap-2 text-emerald-200 text-sm font-semibold">
          <MapPin className="h-4 w-4" /> Location
        </label>
        <Input
          placeholder="City (e.g., Gqeberha, Cape Town)"
          value={city}
          onChange={e => setCity(e.target.value)}
          className="bg-slate-900/60 border-emerald-500/20 text-emerald-100"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-emerald-300/70 mb-1 block">Latitude</label>
            <Input type="number" value={lat} onChange={e => setLat(e.target.value)} className="bg-slate-900/60 border-emerald-500/20 text-emerald-100" />
          </div>
          <div>
            <label className="text-xs text-emerald-300/70 mb-1 block">Longitude</label>
            <Input type="number" value={lon} onChange={e => setLon(e.target.value)} className="bg-slate-900/60 border-emerald-500/20 text-emerald-100" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setHemisphere('south')}
            className={`py-2 rounded-lg border transition ${hemisphere === 'south' ? 'bg-emerald-600/40 border-emerald-400 text-emerald-50' : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'}`}
          >
            🌍 Southern Hemisphere
          </button>
          <button
            onClick={() => setHemisphere('north')}
            className={`py-2 rounded-lg border transition ${hemisphere === 'north' ? 'bg-emerald-600/40 border-emerald-400 text-emerald-50' : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'}`}
          >
            🌎 Northern Hemisphere
          </button>
        </div>
      </div>

      {/* Soil pH */}
      <div className="space-y-2 mb-6">
        <label className="flex items-center gap-2 text-emerald-200 text-sm font-semibold">
          <FlaskConical className="h-4 w-4" /> Current Soil pH (optional)
        </label>
        <Input
          type="number"
          step="0.1"
          placeholder="e.g., 6.5"
          value={soilPh}
          onChange={e => setSoilPh(e.target.value)}
          className="bg-slate-900/60 border-emerald-500/20 text-emerald-100"
        />
        <p className="text-xs text-emerald-300/70">
          Most organic veggies & herbs thrive at pH 6.0–7.0. Test soil yearly — add lime to raise (less acidic) or sulfur/compost to lower. Luna tip: 🌙 Root Days are great for soil amendments!
        </p>
      </div>

      {/* Crops */}
      <div className="mb-6">
        <h4 className="flex items-center gap-2 text-emerald-200 text-sm font-semibold mb-3">
          <Sprout className="h-4 w-4" /> My Crops ({selected.size} selected)
        </h4>
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm border transition ${
                filter === c.id ? 'bg-emerald-600/40 border-emerald-400 text-emerald-50' : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {visible.map(crop => {
            const isOn = selected.has(crop.id);
            return (
              <button
                key={crop.id}
                onClick={() => toggle(crop.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition ${
                  isOn ? 'bg-emerald-600/30 border-emerald-400 text-emerald-50' : 'bg-emerald-950/30 border-emerald-500/20 text-emerald-300/80 hover:bg-emerald-950/50'
                }`}
              >
                <span className="text-xl">{crop.emoji}</span>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{crop.name}</div>
                  <div className="text-xs opacity-70">pH {crop.ph}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Button onClick={save} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">
        <Sprout className="h-4 w-4 mr-2" /> Save Garden Profile
      </Button>
    </div>
  );
}
