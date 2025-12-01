/**
 * Birthday Manager Component
 * Allows users to add, edit, and delete birthdays that repeat every year
 */

import { useState, useEffect } from 'react'
import { Plus, X, Edit2, Trash2, Gift } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { calculateCreatorDate } from '@/utils/dashboardCalendar'

interface Birthday {
  id: string
  person_name: string
  yhwh_month: number
  yhwh_day: number
  gregorian_date?: string
  relationship?: string
  notes?: string
}

interface BirthdayManagerProps {
  selectedYhwhMonth?: number
  selectedYhwhDay?: number
  onBirthdaySelect?: (month: number, day: number) => void
}

const YHWH_MONTHS = [
  'Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6',
  'Month 7', 'Month 8', 'Month 9', 'Month 10', 'Month 11', 'Month 12'
]

export function BirthdayManager({ selectedYhwhMonth, selectedYhwhDay, onBirthdaySelect }: BirthdayManagerProps) {
  const { user } = useAuth()
  const [birthdays, setBirthdays] = useState<Birthday[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    person_name: '',
    yhwh_month: selectedYhwhMonth || calculateCreatorDate(new Date()).month,
    yhwh_day: selectedYhwhDay || calculateCreatorDate(new Date()).day,
    gregorian_date: '',
    relationship: '',
    notes: '',
  })

  // Load birthdays
  useEffect(() => {
    if (!user) return

    const loadBirthdays = async () => {
      const { data, error } = await supabase
        .from('birthdays')
        .select('*')
        .eq('user_id', user.id)
        .order('yhwh_month', { ascending: true })
        .order('yhwh_day', { ascending: true })

      if (error) {
        console.error('Error loading birthdays:', error)
        return
      }

      setBirthdays(data || [])
    }

    loadBirthdays()

    // Listen for changes
    const channel = supabase
      .channel('birthdays_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'birthdays', filter: `user_id=eq.${user.id}` },
        () => loadBirthdays()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Set form data when selecting a date
  useEffect(() => {
    if (selectedYhwhMonth && selectedYhwhDay) {
      setFormData(prev => ({
        ...prev,
        yhwh_month: selectedYhwhMonth,
        yhwh_day: selectedYhwhDay,
      }))
    }
  }, [selectedYhwhMonth, selectedYhwhDay])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !formData.person_name.trim()) return

    try {
      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from('birthdays')
          .update({
            person_name: formData.person_name.trim(),
            yhwh_month: formData.yhwh_month,
            yhwh_day: formData.yhwh_day,
            gregorian_date: formData.gregorian_date || null,
            relationship: formData.relationship.trim() || null,
            notes: formData.notes.trim() || null,
          })
          .eq('id', editingId)
          .eq('user_id', user.id)

        if (error) throw error
        setEditingId(null)
      } else {
        // Create new
        const { error } = await supabase
          .from('birthdays')
          .insert({
            user_id: user.id,
            person_name: formData.person_name.trim(),
            yhwh_month: formData.yhwh_month,
            yhwh_day: formData.yhwh_day,
            gregorian_date: formData.gregorian_date || null,
            relationship: formData.relationship.trim() || null,
            notes: formData.notes.trim() || null,
          })

        if (error) throw error
      }

      // Reset form
      setFormData({
        person_name: '',
        yhwh_month: selectedYhwhMonth || calculateCreatorDate(new Date()).month,
        yhwh_day: selectedYhwhDay || calculateCreatorDate(new Date()).day,
        gregorian_date: '',
        relationship: '',
        notes: '',
      })
      setIsAdding(false)
      setEditingId(null)
    } catch (error: any) {
      console.error('Error saving birthday:', error)
      alert('Failed to save birthday: ' + (error.message || 'Unknown error'))
    }
  }

  const handleEdit = (birthday: Birthday) => {
    setFormData({
      person_name: birthday.person_name,
      yhwh_month: birthday.yhwh_month,
      yhwh_day: birthday.yhwh_day,
      gregorian_date: birthday.gregorian_date || '',
      relationship: birthday.relationship || '',
      notes: birthday.notes || '',
    })
    setEditingId(birthday.id)
    setIsAdding(true)
  }

  const handleDelete = async (id: string) => {
    if (!user || !confirm('Are you sure you want to delete this birthday?')) return

    try {
      const { error } = await supabase
        .from('birthdays')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
    } catch (error: any) {
      console.error('Error deleting birthday:', error)
      alert('Failed to delete birthday: ' + (error.message || 'Unknown error'))
    }
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setFormData({
      person_name: '',
      yhwh_month: selectedYhwhMonth || calculateCreatorDate(new Date()).month,
      yhwh_day: selectedYhwhDay || calculateCreatorDate(new Date()).day,
      gregorian_date: '',
      relationship: '',
      notes: '',
    })
  }

  // Get birthdays for current month
  const currentMonthBirthdays = birthdays.filter(
    b => b.yhwh_month === selectedYhwhMonth
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-pink-500" />
            Birthdays
          </CardTitle>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Birthday
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && (
          <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div>
              <label className="text-sm font-medium mb-1 block">Person's Name *</label>
              <Input
                value={formData.person_name}
                onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
                placeholder="Enter name"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium mb-1 block">YHWH Month</label>
                <select
                  value={formData.yhwh_month}
                  onChange={(e) => setFormData({ ...formData, yhwh_month: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  {YHWH_MONTHS.map((month, idx) => (
                    <option key={idx} value={idx + 1}>{month}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">YHWH Day</label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.yhwh_day}
                  onChange={(e) => setFormData({ ...formData, yhwh_day: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Original Gregorian Date (optional)</label>
              <Input
                type="date"
                value={formData.gregorian_date}
                onChange={(e) => setFormData({ ...formData, gregorian_date: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Relationship (optional)</label>
              <Input
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                placeholder="e.g., Spouse, Child, Friend"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" size="sm">
                {editingId ? 'Update' : 'Add'} Birthday
              </Button>
              <Button type="button" onClick={handleCancel} variant="outline" size="sm">
                Cancel
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {birthdays.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No birthdays added yet. Click "Add Birthday" to get started!
            </p>
          ) : (
            birthdays.map((birthday) => (
              <div
                key={birthday.id}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-pink-500" />
                    <span className="font-medium">{birthday.person_name}</span>
                    {birthday.relationship && (
                      <Badge variant="secondary" className="text-xs">
                        {birthday.relationship}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {YHWH_MONTHS[birthday.yhwh_month - 1]} Day {birthday.yhwh_day}
                    {birthday.gregorian_date && (
                      <span className="ml-2">({new Date(birthday.gregorian_date).toLocaleDateString()})</span>
                    )}
                  </div>
                  {birthday.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{birthday.notes}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    onClick={() => handleEdit(birthday)}
                    variant="ghost"
                    size="sm"
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleDelete(birthday.id)}
                    variant="ghost"
                    size="sm"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

