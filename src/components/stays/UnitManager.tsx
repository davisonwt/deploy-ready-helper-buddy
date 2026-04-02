import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, BedDouble, Users, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StayUnit } from '@/hooks/useStays';

interface UnitManagerProps {
  listingId: string;
}

const UnitManager: React.FC<UnitManagerProps> = ({ listingId }) => {
  const [units, setUnits] = useState<StayUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<StayUnit | null>(null);
  const [form, setForm] = useState({
    name: '', description: '', unit_type: 'room', max_guests: 2,
    bedrooms: 1, bathrooms: 1, beds_description: '', price_per_night: 0,
    currency: 'ZAR', weekend_price: 0,
  });

  const fetchUnits = async () => {
    const { data } = await supabase.from('stay_units').select('*').eq('listing_id', listingId);
    setUnits((data as StayUnit[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchUnits(); }, [listingId]);

  const resetForm = () => {
    setForm({ name: '', description: '', unit_type: 'room', max_guests: 2, bedrooms: 1, bathrooms: 1, beds_description: '', price_per_night: 0, currency: 'ZAR', weekend_price: 0 });
    setEditingUnit(null);
  };

  const openEdit = (unit: StayUnit) => {
    setEditingUnit(unit);
    setForm({
      name: unit.name, description: unit.description || '', unit_type: unit.unit_type,
      max_guests: unit.max_guests, bedrooms: unit.bedrooms, bathrooms: unit.bathrooms,
      beds_description: unit.beds_description || '', price_per_night: unit.price_per_night,
      currency: unit.currency, weekend_price: unit.weekend_price || 0,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Unit name required'); return; }
    try {
      if (editingUnit) {
        await supabase.from('stay_units').update({ ...form, weekend_price: form.weekend_price || null } as any).eq('id', editingUnit.id);
        toast.success('Unit updated');
      } else {
        await supabase.from('stay_units').insert({ ...form, listing_id: listingId, weekend_price: form.weekend_price || null } as any);
        toast.success('Unit added');
      }
      setDialogOpen(false);
      resetForm();
      fetchUnits();
    } catch (error: any) {
      toast.error('Failed to save unit');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this unit?')) return;
    await supabase.from('stay_units').delete().eq('id', id);
    toast.success('Unit deleted');
    fetchUnits();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Rooms & Units</h3>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Add Unit</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingUnit ? 'Edit Unit' : 'Add New Unit'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Unit Name *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Honeymoon Suite" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={form.unit_type} onValueChange={v => setForm(p => ({ ...p, unit_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="room">Room</SelectItem>
                      <SelectItem value="cottage">Cottage</SelectItem>
                      <SelectItem value="suite">Suite</SelectItem>
                      <SelectItem value="campsite">Campsite</SelectItem>
                      <SelectItem value="tent">Tent</SelectItem>
                      <SelectItem value="cabin">Cabin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Max Guests</Label>
                  <Input type="number" min={1} value={form.max_guests} onChange={e => setForm(p => ({ ...p, max_guests: parseInt(e.target.value) || 1 }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Bedrooms</Label>
                  <Input type="number" min={0} value={form.bedrooms} onChange={e => setForm(p => ({ ...p, bedrooms: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label>Bathrooms</Label>
                  <Input type="number" min={0} value={form.bathrooms} onChange={e => setForm(p => ({ ...p, bathrooms: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Select value={form.currency} onValueChange={v => setForm(p => ({ ...p, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ZAR">ZAR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price/Night</Label>
                  <Input type="number" min={0} value={form.price_per_night} onChange={e => setForm(p => ({ ...p, price_per_night: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label>Weekend Price</Label>
                  <Input type="number" min={0} value={form.weekend_price} onChange={e => setForm(p => ({ ...p, weekend_price: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
              <Button onClick={handleSave} className="w-full">{editingUnit ? 'Update Unit' : 'Add Unit'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {units.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-8 text-center">
            <BedDouble className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No units added yet. Add rooms, cottages, or campsites.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {units.map(unit => (
            <Card key={unit.id} className="bg-card border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground">{unit.name}</h4>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {unit.max_guests} guests</span>
                    <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" /> {unit.bedrooms} bed</span>
                    <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> {unit.currency} {unit.price_per_night}/night</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(unit)}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(unit.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default UnitManager;
