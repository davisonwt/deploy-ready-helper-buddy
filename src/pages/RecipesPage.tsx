import React, { useState, useEffect, useRef } from 'react'
import { Plus, Search, Trash2, Edit, ChefHat, BookOpen, Save, Image, Video, Share2, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
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
  image_url: string | null
  video_url: string | null
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
  const [uploading, setUploading] = useState(false)
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    title: '',
    ingredients: '',
    instructions: '',
    category: '',
    tags: '',
    image_url: '',
    video_url: ''
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

  const uploadMedia = async (file: File, type: 'image' | 'video'): Promise<string | null> => {
    if (!user) return null
    
    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${type}_${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('recipe-media')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('recipe-media')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error: any) {
      console.error(`Error uploading ${type}:`, error)
      toast({
        title: 'Upload Error',
        description: error.message || `Failed to upload ${type}`,
        variant: 'destructive'
      })
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please select an image file', variant: 'destructive' })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image must be less than 10MB', variant: 'destructive' })
      return
    }

    const url = await uploadMedia(file, 'image')
    if (url) {
      setFormData(prev => ({ ...prev, image_url: url }))
      toast({ title: 'Image uploaded!' })
    }
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      toast({ title: 'Error', description: 'Please select a video file', variant: 'destructive' })
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Video must be less than 50MB', variant: 'destructive' })
      return
    }

    const url = await uploadMedia(file, 'video')
    if (url) {
      setFormData(prev => ({ ...prev, video_url: url }))
      toast({ title: 'Video uploaded!' })
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
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        image_url: formData.image_url || null,
        video_url: formData.video_url || null
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
      setFormData({ title: '', ingredients: '', instructions: '', category: '', tags: '', image_url: '', video_url: '' })
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
      tags: recipe.tags?.join(', ') || '',
      image_url: recipe.image_url || '',
      video_url: recipe.video_url || ''
    })
    setIsFormOpen(true)
  }

  const openNewForm = () => {
    setEditingRecipe(null)
    setFormData({ title: '', ingredients: '', instructions: '', category: '', tags: '', image_url: '', video_url: '' })
    setIsFormOpen(true)
  }

  const shareToChat = async (recipe: Recipe, shareType: 'direct' | 'broadcast') => {
    if (!user) return

    try {
      // Format the recipe message
      const recipeMessage = `🍳 **${recipe.title}**${recipe.category ? `\n📁 Category: ${recipe.category}` : ''}${recipe.ingredients ? `\n\n**Ingredients:**\n${recipe.ingredients}` : ''}${recipe.instructions ? `\n\n**Instructions:**\n${recipe.instructions}` : ''}${recipe.tags?.length ? `\n\n🏷️ ${recipe.tags.join(', ')}` : ''}`

      if (shareType === 'broadcast') {
        // Share to S2G all messages (community broadcast)
        // Find or create the S2G broadcast room
        const { data: rooms, error: roomError } = await supabase
          .from('chat_rooms')
          .select('id')
          .eq('name', 'S2G-Sowers')
          .eq('room_type', 'group')
          .limit(1)

        if (roomError) throw roomError

        if (rooms && rooms.length > 0) {
          const roomId = rooms[0].id

          // Send the text message
          await supabase.from('chat_messages').insert({
            room_id: roomId,
            sender_id: user.id,
            content: recipeMessage,
            message_type: 'text'
          })

          // Send image if exists
          if (recipe.image_url) {
            await supabase.from('chat_messages').insert({
              room_id: roomId,
              sender_id: user.id,
              file_url: recipe.image_url,
              file_type: 'image',
              message_type: 'file'
            })
          }

          // Send video if exists
          if (recipe.video_url) {
            await supabase.from('chat_messages').insert({
              room_id: roomId,
              sender_id: user.id,
              file_url: recipe.video_url,
              file_type: 'video',
              message_type: 'file'
            })
          }

          toast({ title: 'Recipe shared to S2G community!' })
        } else {
          toast({ 
            title: 'No community room found', 
            description: 'Join the S2G-Sowers community first',
            variant: 'destructive' 
          })
        }
      } else {
        // Share to direct chat - open share dialog
        // Store recipe in localStorage temporarily for the chat to pick up
        localStorage.setItem('pendingRecipeShare', JSON.stringify({
          message: recipeMessage,
          image_url: recipe.image_url,
          video_url: recipe.video_url
        }))
        
        toast({ 
          title: 'Recipe ready to share!', 
          description: 'Go to ChatApp and select a chat to share this recipe' 
        })
      }
    } catch (error: any) {
      console.error('Error sharing recipe:', error)
      toast({
        title: 'Error',
        description: 'Failed to share recipe',
        variant: 'destructive'
      })
    }
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
                    <Card 
                      key={recipe.id} 
                      className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                      onClick={() => setViewingRecipe(recipe)}
                    >
                      {/* Recipe Image */}
                      {recipe.image_url && (
                        <div className="relative h-40 overflow-hidden">
                          <img 
                            src={recipe.image_url} 
                            alt={recipe.title}
                            className="w-full h-full object-cover"
                          />
                          {recipe.video_url && (
                            <div className="absolute bottom-2 right-2 bg-black/70 rounded-full p-1">
                              <Video className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">{recipe.title}</CardTitle>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <Share2 className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => shareToChat(recipe, 'direct')}>
                                  <Send className="h-4 w-4 mr-2" />
                                  Share to Chat
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => shareToChat(recipe, 'broadcast')}>
                                  <Share2 className="h-4 w-4 mr-2" />
                                  Share to S2G Community
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

            {/* Media Upload Section */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Recipe Image</label>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {formData.image_url ? (
                  <div className="relative">
                    <img 
                      src={formData.image_url} 
                      alt="Recipe" 
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 h-6 w-6 p-0"
                      onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-32 flex-col gap-2"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Image className="h-8 w-8" />
                    <span className="text-sm">{uploading ? 'Uploading...' : 'Add Image'}</span>
                  </Button>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Recipe Video</label>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
                {formData.video_url ? (
                  <div className="relative">
                    <video 
                      src={formData.video_url} 
                      className="w-full h-32 object-cover rounded-lg"
                      controls
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 h-6 w-6 p-0"
                      onClick={() => setFormData(prev => ({ ...prev, video_url: '' }))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-32 flex-col gap-2"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Video className="h-8 w-8" />
                    <span className="text-sm">{uploading ? 'Uploading...' : 'Add Video'}</span>
                  </Button>
                )}
              </div>
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
              <Button onClick={handleSave} disabled={saving || uploading}>
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

      {/* View Recipe Dialog */}
      <Dialog open={!!viewingRecipe} onOpenChange={() => setViewingRecipe(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewingRecipe && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <ChefHat className="h-6 w-6" />
                  {viewingRecipe.title}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Media */}
                {viewingRecipe.image_url && (
                  <img 
                    src={viewingRecipe.image_url} 
                    alt={viewingRecipe.title}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                )}
                
                {viewingRecipe.video_url && (
                  <video 
                    src={viewingRecipe.video_url} 
                    controls
                    className="w-full rounded-lg"
                  />
                )}

                {viewingRecipe.category && (
                  <Badge variant="secondary" className="text-sm">
                    {viewingRecipe.category}
                  </Badge>
                )}

                {viewingRecipe.ingredients && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Ingredients</h3>
                    <p className="text-muted-foreground whitespace-pre-line">{viewingRecipe.ingredients}</p>
                  </div>
                )}

                {viewingRecipe.instructions && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Instructions</h3>
                    <p className="text-muted-foreground whitespace-pre-line">{viewingRecipe.instructions}</p>
                  </div>
                )}

                {viewingRecipe.tags && viewingRecipe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {viewingRecipe.tags.map((tag, i) => (
                      <Badge key={i} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                )}

                {/* Share buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => shareToChat(viewingRecipe, 'direct')}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Share to Chat
                  </Button>
                  <Button 
                    variant="default" 
                    className="flex-1"
                    onClick={() => shareToChat(viewingRecipe, 'broadcast')}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share to S2G
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
