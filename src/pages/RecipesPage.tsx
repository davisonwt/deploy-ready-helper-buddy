import React, { useState, useEffect } from 'react'
import { Plus, Search, Trash2, Edit, ChefHat, BookOpen, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface Recipe {
  id: string
  title: string
  ingredients: string | null
  instructions: string | null
  category: string | null
  tags: string[] | null
  created_at: string
  updated_at: string
}

export default function RecipesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    ingredients: '',
    instructions: '',
    category: '',
    tags: ''
  })

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

  useEffect(() => {
    if (user) {
      loadRecipes()
    }
  }, [user])

  const loadRecipes = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('recipes' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('title', { ascending: true })

      if (error) throw error
      setRecipes((data as unknown as Recipe[]) || [])
    } catch (error) {
      console.error('Error loading recipes:', error)
      toast({
        title: 'Error',
        description: 'Failed to load recipes',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user || !formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a recipe title',
        variant: 'destructive'
      })
      return
    }

    setSaving(true)
    try {
      const recipeData = {
        user_id: user.id,
        title: formData.title.trim(),
        ingredients: formData.ingredients.trim() || null,
        instructions: formData.instructions.trim() || null,
        category: formData.category.trim() || null,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      }

      if (editingRecipe) {
        const { error } = await supabase
          .from('recipes' as any)
          .update(recipeData)
          .eq('id', editingRecipe.id)

        if (error) throw error
        toast({ title: 'Recipe updated!' })
      } else {
        const { error } = await supabase
          .from('recipes' as any)
          .insert(recipeData)

        if (error) throw error
        toast({ title: 'Recipe added!' })
      }

      setIsFormOpen(false)
      setEditingRecipe(null)
      setFormData({ title: '', ingredients: '', instructions: '', category: '', tags: '' })
      loadRecipes()
    } catch (error: any) {
      console.error('Error saving recipe:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to save recipe',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return

    try {
      const { error } = await supabase
        .from('recipes' as any)
        .delete()
        .eq('id', id)

      if (error) throw error
      toast({ title: 'Recipe deleted' })
      loadRecipes()
    } catch (error) {
      console.error('Error deleting recipe:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete recipe',
        variant: 'destructive'
      })
    }
  }

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe)
    setFormData({
      title: recipe.title,
      ingredients: recipe.ingredients || '',
      instructions: recipe.instructions || '',
      category: recipe.category || '',
      tags: recipe.tags?.join(', ') || ''
    })
    setIsFormOpen(true)
  }

  const openNewForm = () => {
    setEditingRecipe(null)
    setFormData({ title: '', ingredients: '', instructions: '', category: '', tags: '' })
    setIsFormOpen(true)
  }

  // Filter recipes
  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = !searchQuery || 
      recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.ingredients?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.category?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesLetter = !selectedLetter || 
      recipe.title.toUpperCase().startsWith(selectedLetter)
    
    return matchesSearch && matchesLetter
  })

  // Group recipes by first letter
  const groupedRecipes = filteredRecipes.reduce((acc, recipe) => {
    const letter = recipe.title[0]?.toUpperCase() || '#'
    if (!acc[letter]) acc[letter] = []
    acc[letter].push(recipe)
    return acc
  }, {} as Record<string, Recipe[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Recipes</h1>
            <p className="text-sm text-muted-foreground">Your personal recipe collection</p>
          </div>
        </div>
        <Button onClick={openNewForm} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Recipe
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Alphabet Filter */}
        <div className="flex flex-wrap gap-1">
          <Button
            variant={selectedLetter === null ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedLetter(null)}
            className="h-8 w-8 p-0 text-xs"
          >
            All
          </Button>
          {alphabet.map(letter => (
            <Button
              key={letter}
              variant={selectedLetter === letter ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedLetter(letter === selectedLetter ? null : letter)}
              className="h-8 w-8 p-0 text-xs"
            >
              {letter}
            </Button>
          ))}
        </div>
      </div>

      {/* Recipe List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading recipes...</p>
        </div>
      ) : filteredRecipes.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No recipes yet</h3>
            <p className="text-muted-foreground mb-4">Start adding your favorite recipes!</p>
            <Button onClick={openNewForm} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Recipe
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-400px)]">
          <div className="space-y-6">
            {Object.entries(groupedRecipes).sort(([a], [b]) => a.localeCompare(b)).map(([letter, letterRecipes]) => (
              <div key={letter}>
                <h2 className="text-lg font-bold text-primary mb-3 sticky top-0 bg-background py-2">
                  {letter}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {letterRecipes.map(recipe => (
                    <Card key={recipe.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">{recipe.title}</CardTitle>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(recipe)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(recipe.id)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {recipe.category && (
                          <Badge variant="secondary" className="w-fit">
                            {recipe.category}
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent>
                        {recipe.ingredients && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            <strong>Ingredients:</strong> {recipe.ingredients}
                          </p>
                        )}
                        {recipe.tags && recipe.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {recipe.tags.slice(0, 3).map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Add/Edit Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              {editingRecipe ? 'Edit Recipe' : 'Add New Recipe'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Recipe Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter recipe name..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., Breakfast, Dinner, Dessert..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Ingredients</label>
              <Textarea
                value={formData.ingredients}
                onChange={(e) => setFormData(prev => ({ ...prev, ingredients: e.target.value }))}
                placeholder="List your ingredients..."
                rows={5}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Instructions</label>
              <Textarea
                value={formData.instructions}
                onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder="Step-by-step cooking instructions..."
                rows={8}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tags (comma-separated)</label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="e.g., healthy, quick, vegetarian..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingRecipe ? 'Update Recipe' : 'Save Recipe'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
