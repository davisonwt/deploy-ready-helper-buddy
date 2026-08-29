// v2
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Link, useNavigate } from 'react-router-dom'
import { Sprout, Plus, Eye, Users, TrendingUp, Calendar, DollarSign, Edit, Share2, MapPin, Trash2, Sparkles, Loader2, Radio, ArrowLeft, Upload, Store } from 'lucide-react'
import { toast } from "sonner"
import { supabase } from '@/integrations/supabase/client'
import { formatCurrency } from '../utils/formatters'
import { GradientPlaceholder } from '@/components/ui/GradientPlaceholder'
import { processOrchardsUrls } from '../utils/urlUtils'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import LivingButton from '../components/LivingButton'
import MyGardenSection from '../components/garden/MyGardenSection'
import {
  buildSeedCard, buildOrchardCard, buildMusicCard,
  buildBookCard, buildVideoCard, deleteRow,
} from '../components/garden/seedCardBuilders'
import { useMyContent } from '@/api/sowerContent'
import VideoUploadModal from '@/components/community/VideoUploadModal.jsx'
import BrandManagerDialog from '@/components/garden/BrandManagerDialog'
import BrandIcon from '@/components/garden/BrandIcon'
import { useMyBrands, useMyBrandAssignments, assignBrandToItem } from '@/api/sowerBrands'
import { countActiveProductsForSower } from '@/api/products'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { useSignedImage } from '@/lib/storage/signedImage'
import { BookOpenCheck } from 'lucide-react'
import { useBooksBusiness } from '@/hooks/useBooksBusiness'

const WANDERING_ROLES = [
  { label: 'Wheel 🚗',      value: 'Wheel' },
  { label: 'Hand 🤲',       value: 'Hand' },
  { label: 'Whisperer 🌬️', value: 'Whisperer' },
  { label: 'Pillow 🛏️',    value: 'Pillow' },
  { label: 'Field 🌾',      value: 'Field' },
  { label: 'Hearth 🔥',     value: 'Hearth' },
  { label: 'Heart 💚',      value: 'Heart' },
  { label: 'Forge ⚒️',      value: 'Forge' },
  { label: 'Story 🎥',      value: 'Story' },
]

const SOWER_TIER_LINKS = [
  { href: '/homestead', emoji: '🏠', label: 'Homestead' },
  { href: '/grove', emoji: '🌳', label: 'Grove' },
  { href: '/orchard', emoji: '🍎', label: 'Orchard' },
  { href: '/estate', emoji: '🏛️', label: 'Estate' },
  { href: '/harvest-works', emoji: '🏭', label: 'Harvest Works' },
]

export default function MyOrchardsPage() {
  const { user } = useAuth()
  useBooksBusiness()
  const navigate = useNavigate()
  const [userSeeds, setUserSeeds] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedRole, setSelectedRole] = useState('all')
  const [seeds, setSeeds] = useState([])
  const [loading, setLoading] = useState(false)
  const [showVideoUpload, setShowVideoUpload] = useState(false)
  const [showBrands, setShowBrands] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [brandFilter, setBrandFilter] = useState('all')

  const { brands, refetch: refetchBrands } = useMyBrands(user?.id)
  const { brandByItem, refetch: refetchBrandAssignments } = useMyBrandAssignments(user?.id)
  const defaultBrand = brands.find((b) => b.is_default) || brands[0] || null

  const handleAssignBrand = async (card, brandId) => {
    if (!user?.id) return
    try {
      await assignBrandToItem(user.id, card.id, brandId)
      await refetchBrandAssignments()
      toast.success(brandId ? 'Brand applied to this seed' : 'Brand removed from this seed')
    } catch (e) {
      toast.error(`Could not update brand: ${e.message}`)
    }
  }

  // Canonical "my content" — same source as Dashboard, account-scoped (includes
  // linked accounts and the products-as-seeds union). Do NOT add a divergent
  // query here; if something's missing, fix it in src/api/sowerContent.ts.
  const {
    seeds: mySeeds,
    music: myMusic,
    books: myBooks,
    videos: myVideos,
    orchards: myOrchards,
    refetch: fetchAllMyContent,
  } = useMyContent(user?.id)

  const fetchSeeds = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('orchards')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (error) throw error
      setSeeds(data || [])
    } catch (err) {
      console.error('Error fetching seeds:', err)
    } finally {
      setLoading(false)
    }
  }

  const deleteSeed = async (id) => {
    try {
      const { error } = await supabase.from('orchards').delete().eq('id', id)
      if (error) throw error
      await fetchSeeds()
    } catch (err) {
      console.error('Error deleting seed:', err)
      throw err
    }
  }

  useEffect(() => {
    if (user) fetchSeeds()
  }, [user])

  // My Garden header stats — "seeds" here means everything a sower can grow:
  // products (any kind, any status) plus orchards, not just the crowdfunding
  // `orchards` rows userSeeds tracks below. Raised comes from sower_earnings_v,
  // the same completed-only, already-net-of-fee source the dashboard uses.
  const [gardenStats, setGardenStats] = useState({ totalSeeds: 0, activeSeeds: 0, totalRaised: 0 })

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      try {
        const { data: sowerRow } = await supabase.from('sowers').select('id').eq('user_id', user.id).maybeSingle()
        const sowerId = sowerRow?.id

        const [productsTotalRes, productsActiveRes, orchardsTotalRes, orchardsActiveRes, earningsRes] = await Promise.all([
          sowerId
            ? supabase.from('products').select('id', { count: 'exact', head: true }).eq('sower_id', sowerId)
            : Promise.resolve({ count: 0 }),
          sowerId ? countActiveProductsForSower(sowerId) : Promise.resolve({ count: 0 }),
          supabase.from('orchards').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('orchards').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active'),
          supabase.from('sower_earnings_v').select('sower_amount').eq('sower_id', user.id),
        ])

        if (cancelled) return
        setGardenStats({
          totalSeeds: (productsTotalRes.count || 0) + (orchardsTotalRes.count || 0),
          activeSeeds: (productsActiveRes.count || 0) + (orchardsActiveRes.count || 0),
          totalRaised: (earningsRes.data || []).reduce((sum, r) => sum + Number(r.sower_amount || 0), 0),
        })
      } catch (e) {
        console.error('Error fetching garden stats:', e)
      }
    })()
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    const processed = processOrchardsUrls(seeds)
    let filtered = processed.filter(s => s.user_id === user?.id)
    if (statusFilter !== 'all') filtered = filtered.filter(s => s.status === statusFilter)
    if (selectedRole !== 'all') filtered = filtered.filter(s => s.category === selectedRole)
    setUserSeeds(filtered)
  }, [seeds, user, statusFilter, selectedRole])


  // ── Owner action handlers shared across all 5 sections ──
  const handleEditCard = (card) => {
    const rid = card.rawId ?? card.id?.replace(/^[a-z]+-/, '')
    if (card.id.startsWith('orchard-')) navigate(`/edit-orchard/${rid}`)
    else if (card.id.startsWith('seed-'))   navigate(`/seed/${rid}?edit=1`)
    else if (card.id.startsWith('music-')) {
      // Music cards can be a sower-published product (single/album) or a
      // DJ track — only products have an edit page; music-library is the
      // right destination for dj_music_tracks rows.
      if (card.seedRow?.__table === 'products') navigate(`/products/edit/${rid}`)
      else navigate(`/music-library?edit=${rid}`)
    }
    else if (card.id.startsWith('book-'))   navigate(`/my-s2g-library?edit=${rid}`)
    else if (card.id.startsWith('video-'))  navigate(`/community-videos?edit=${rid}`)
  }
  const handleRepostCard = (card) => toast.success(`Reposted "${card.title}" to the tribe feed`)
  const handleParkCard   = (card) => toast(`Parked "${card.title}" — hidden until you re-publish.`)
  const handleDeleteCard = async (card) => {
    if (!window.confirm(`Delete "${card.title}"? This cannot be undone.`)) return
    const tableMap = {
      'seed-': 'seeds', 'orchard-': 'orchards', 'music-': 'dj_music_tracks',
      'book-': 'sower_books', 'video-': 'community_videos',
    }
    const prefix = Object.keys(tableMap).find(p => card.id.startsWith(p))
    if (!prefix) return
    // Music cards can come from either dj_music_tracks or products — honor seedRow.__table
    const table = (prefix === 'music-' && card.seedRow?.__table) || tableMap[prefix]
    try {
      await deleteRow(supabase, table, card.rawId)
      toast.success(`"${card.title}" deleted`)
      fetchAllMyContent()
      if (prefix === 'orchard-') fetchSeeds()
    } catch (e) {
      toast.error(`Could not delete: ${e.message}`)
    }
  }

  const ownerHandlers = {
    onEdit: handleEditCard, onRepost: handleRepostCard,
    onPark: handleParkCard, onDelete: handleDeleteCard,
  }

  // Build per-category card lists for the 5 vertical sections
  const allSeedCards    = mySeeds.map(s    => buildSeedCard(s, ownerHandlers))
  const allOrchardCards = myOrchards.map(o => buildOrchardCard(o, ownerHandlers))
  const allMusicCards   = myMusic.map(m    => buildMusicCard(m, ownerHandlers))
  const allBookCards    = myBooks.map(b    => buildBookCard(b, ownerHandlers))
  const allVideoCards   = myVideos.map(v   => buildVideoCard(v, ownerHandlers))

  // ── Garden search: look a seed up by name/description, category and brand ──
  const q = search.trim().toLowerCase()
  const matches = (c) => {
    if (brandFilter !== 'all' && brandByItem[c.id] !== brandFilter) return false
    if (!q) return true
    const hay = [c.title, c.subtitle, c.seedRow?.category, c.seedRow?.genre, c.seedRow?.artist_name]
      .filter(Boolean).join(' ').toLowerCase()
    return hay.includes(q)
  }
  const inCategory = (key) => categoryFilter === 'all' || categoryFilter === key
  const filterFor = (key, list) => (inCategory(key) ? list.filter(matches) : [])

  const seedCards    = filterFor('seeds', allSeedCards)
  const orchardCards = filterFor('orchards', allOrchardCards)
  const musicCards   = filterFor('music', allMusicCards)
  const bookCards    = filterFor('books', allBookCards)
  const videoCards   = filterFor('videos', allVideoCards)
  const searchActive = q.length > 0 || categoryFilter !== 'all' || brandFilter !== 'all'
  const resultCount  = seedCards.length + orchardCards.length + musicCards.length + bookCards.length + videoCards.length


  const getCompletionPercentage = (seed) => {
    const total = (seed.intended_pockets && seed.intended_pockets > 1) ? seed.intended_pockets : seed.total_pockets || 1
    if (!total) return 0
    return Math.round((seed.filled_pockets / total) * 100)
  }

  const handleGoBack = () => {
    navigate('/dashboard', { replace: true })
  }

  const handleDeleteSeed = async (seedId) => {
    if (!window.confirm('Are you sure you want to remove this seed? This cannot be undone.')) return
    try {
      await deleteSeed(seedId)
      toast.success('Seed removed successfully')
    } catch {
      toast.error('Failed to remove seed')
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center' style={{
        background: 'linear-gradient(180deg, #0a0f1a 0%, #060a12 100%)',
      }}>
        <Loader2 className='w-12 h-12 animate-spin text-white' />
      </div>
    )
  }

  return (
    <div style={{position:'relative',overflowY:'auto'}}>
      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <div className='fixed inset-0 z-0'>
        <div className='absolute inset-0' style={{
          background: 'linear-gradient(180deg, #0a0f1a 0%, #060a12 100%)',
        }} />
        <div className='absolute inset-0' style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(34,211,238,0.10), transparent 60%), radial-gradient(ellipse 60% 40% at 90% 100%, rgba(245,158,11,0.06), transparent 60%)',
        }} />
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className='absolute rounded-full blur-3xl opacity-20'
            style={{
              width: `${260 + i * 120}px`,
              height: `${260 + i * 120}px`,
              background: i % 2 === 0
                ? 'radial-gradient(circle, rgba(34,211,238,0.35), transparent)'
                : 'radial-gradient(circle, rgba(245,158,11,0.25), transparent)',
              left: `${10 + i * 22}%`,
              top: `${15 + i * 14}%`,
            }}
            animate={{ x: [0, 80, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 12 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>

      <div className='relative z-10'>
        <div className='sticky top-3 z-50 px-4 pt-3'>
          <button
            type='button'
            onClick={handleGoBack}
            className='inline-flex items-center gap-2 rounded-xl border border-white/30 bg-background/90 px-4 py-3 text-sm font-extrabold text-foreground shadow-2xl backdrop-blur-md hover:bg-card'
          >
            <ArrowLeft className='h-4 w-4' />
            Go Back
          </button>
        </div>
        <div className='relative overflow-hidden border-b border-cyan-400/15 backdrop-blur-md bg-[#0f172a]/60'>
          <div className='relative container mx-auto px-4 py-12'>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className='text-center max-w-4xl mx-auto'
            >
              <div className='flex items-center justify-center gap-4 mb-6'>
                <button
                  type='button'
                  onClick={() => setShowBrands(true)}
                  title={defaultBrand ? `${defaultBrand.name} — edit my brands` : 'Add your own logo & brand'}
                  className='group relative p-4 rounded-2xl bg-cyan-400/10 backdrop-blur-md border border-cyan-400/30 hover:border-cyan-300/70'
                >
                  <HeroBrandLogo brand={defaultBrand} />
                  <span className='absolute -bottom-2 -right-2 rounded-full bg-cyan-400 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-900'>
                    ✎
                  </span>
                </button>
                <h1 className='text-4xl sm:text-5xl font-bold text-white drop-shadow-[0_2px_8px_rgba(34,211,238,0.25)]'>My Garden</h1>
              </div>
              {defaultBrand && (
                <div className='mb-3 flex justify-center'>
                  <BrandIcon brand={defaultBrand} size={20} />
                </div>
              )}

              <p className='text-slate-200/90 text-base sm:text-lg mb-4 max-w-2xl mx-auto'>
                Manage and tend to your growing seeds. Watch each one blossom into something meaningful.
              </p>
              <div className='flex flex-wrap items-center justify-center gap-4'>
                <Link to="/sow" style={{ textDecoration: 'none', minWidth: 200 }}>
                  <LivingButton variant="enter" height={50} borderRadius={12} fontSize={14} letterSpacing="1px">
                    <Sprout size={18} /> Sow a seed
                  </LivingButton>
                </Link>
                <Link to="/community-offering" style={{ textDecoration: 'none', minWidth: 200 }}>
                  <LivingButton variant="share" height={50} borderRadius={12} fontSize={14} letterSpacing="1px">
                    <Sparkles size={18} /> AI Offering Generator
                  </LivingButton>
                </Link>
                <Link to="/seller/business-settings" style={{ textDecoration: 'none', minWidth: 200 }}>
                  <LivingButton variant="share" height={50} borderRadius={12} fontSize={14} letterSpacing="1px">
                    <Store size={18} /> Business Settings
                  </LivingButton>
                </Link>
                <Link to="/books" style={{ textDecoration: 'none', minWidth: 200 }}>
                  <LivingButton variant="share" height={50} borderRadius={12} fontSize={14} letterSpacing="1px">
                    <BookOpenCheck size={18} /> Books
                  </LivingButton>
                </Link>
                <Link to="/whisperer-requests" style={{ textDecoration: 'none', minWidth: 200 }}>
                  <LivingButton variant="share" height={50} borderRadius={12} fontSize={14} letterSpacing="1px">
                    🌬️ Whisperer Requests
                  </LivingButton>
                </Link>
              </div>
              <div className='mt-5 flex flex-wrap items-center justify-center gap-2'>
                <span className='text-xs font-semibold uppercase tracking-wider text-slate-300'>SeedFlows by scale</span>
                {SOWER_TIER_LINKS.map((tier) => (
                  <Link
                    key={tier.href}
                    to={tier.href}
                    className='inline-flex items-center gap-1 rounded-full border border-cyan-400/20 bg-[#0f172a]/70 px-3 py-2 text-xs font-semibold text-slate-100 no-underline hover:border-cyan-300/60 hover:bg-cyan-400/10'
                  >
                    <span aria-hidden='true'>{tier.emoji}</span>
                    {tier.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        <div className='container mx-auto px-4 py-8'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
            <Card className='backdrop-blur bg-[#0f172a]/70 border border-cyan-400/15 shadow-2xl'>
              <CardContent className='p-6'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-slate-300'>Total Seeds</p>
                    <p className='text-2xl font-bold text-white'>{gardenStats.totalSeeds}</p>
                  </div>
                  <Sprout className='h-8 w-8 text-white' />
                </div>
              </CardContent>
            </Card>
            <Card className='backdrop-blur bg-[#0f172a]/70 border border-cyan-400/15 shadow-2xl'>
              <CardContent className='p-6'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-slate-300'>Total Raised</p>
                    <p className='text-2xl font-bold text-white'>${gardenStats.totalRaised.toFixed(2)}</p>
                    <p className='text-xs text-slate-400 mt-0.5'>USD</p>
                  </div>
                  <DollarSign className='h-8 w-8 text-white' />
                </div>
              </CardContent>
            </Card>
            <Card className='backdrop-blur bg-[#0f172a]/70 border border-cyan-400/15 shadow-2xl'>
              <CardContent className='p-6'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-slate-300'>Active Seeds</p>
                    <p className='text-2xl font-bold text-white'>{gardenStats.activeSeeds}</p>
                  </div>
                  <TrendingUp className='h-8 w-8 text-white' />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Search my garden ── */}
          <div className='mb-6 rounded-2xl border border-cyan-400/15 bg-[#0f172a]/70 p-4 backdrop-blur'>
            <div className='flex flex-col gap-3 md:flex-row md:items-center'>
              <div className='relative flex-1'>
                <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder='Search my seeds by name, description or genre…'
                  className='border-cyan-400/20 bg-[#0a0f1a]/80 pl-9 text-white placeholder:text-slate-500'
                />
              </div>
              <div className='min-w-[190px]'>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className='backdrop-blur bg-[#0a0f1a]/80 border border-cyan-400/20 text-white'>
                    <SelectValue placeholder='All categories' />
                  </SelectTrigger>
                  <SelectContent className='z-50 bg-popover'>
                    <SelectItem value='all'>All categories</SelectItem>
                    <SelectItem value='seeds'>🌱 Seeds</SelectItem>
                    <SelectItem value='orchards'>🌳 Orchards</SelectItem>
                    <SelectItem value='music'>🎵 Music</SelectItem>
                    <SelectItem value='books'>📚 Books</SelectItem>
                    <SelectItem value='videos'>🎬 Videos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='min-w-[190px]'>
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger className='backdrop-blur bg-[#0a0f1a]/80 border border-cyan-400/20 text-white'>
                    <SelectValue placeholder='All brands' />
                  </SelectTrigger>
                  <SelectContent className='z-50 bg-popover'>
                    <SelectItem value='all'>All brands</SelectItem>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>🏷 {b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant='outline' onClick={() => setShowBrands(true)}>
                🏷 My brands
              </Button>
            </div>
            {searchActive && (
              <p className='mt-2 text-xs text-slate-300'>
                {resultCount} match{resultCount === 1 ? '' : 'es'} in your garden
                <button type='button' onClick={() => { setSearch(''); setCategoryFilter('all'); setBrandFilter('all') }}
                  className='ml-3 underline'>clear</button>
              </p>
            )}
          </div>

          {/* ── 5 vertical category sections — your full living garden ── */}
          <div className='mb-8'>
            {inCategory('seeds') && (
              <MyGardenSection title="Seeds"    emoji="🌱" accent="#22c55e" cards={seedCards}
                brands={brands} brandByItem={brandByItem} onAssignBrand={handleAssignBrand}
                emptyHint={searchActive ? 'No seeds match your search.' : 'No seeds yet — sow your first one above.'} />
            )}
            {inCategory('orchards') && (
              <MyGardenSection title="Orchards" emoji="🌳" accent="#16a34a" cards={orchardCards}
                brands={brands} brandByItem={brandByItem} onAssignBrand={handleAssignBrand}
                emptyHint={searchActive ? 'No orchards match your search.' : 'No orchards yet — your created orchards live here.'} />
            )}
            {inCategory('music') && (
              <MyGardenSection title="Music"    emoji="🎵" accent="#0ea5e9" cards={musicCards}
                brands={brands} brandByItem={brandByItem} onAssignBrand={handleAssignBrand}
                emptyHint={searchActive ? 'No tracks match your search.' : 'No tracks yet — drop a song from your Music Library.'} />
            )}
            {inCategory('books') && (
              <MyGardenSection title="Books"    emoji="📚" accent="#fb923c" cards={bookCards}
                brands={brands} brandByItem={brandByItem} onAssignBrand={handleAssignBrand}
                emptyHint={searchActive ? 'No books match your search.' : 'No books yet — upload one in My S2G Library.'} />
            )}
            {inCategory('videos') && (
              <MyGardenSection
                title="Videos"
                emoji="🎬"
                accent="#f87171"
                cards={videoCards}
                brands={brands}
                brandByItem={brandByItem}
                onAssignBrand={handleAssignBrand}
                emptyHint={searchActive ? 'No videos match your search.' : 'No videos yet — upload your first one below.'}
                headerAction={
                  <Button
                    size="sm"
                    onClick={() => setShowVideoUpload(true)}
                    className="bg-rose-500 hover:bg-rose-400 text-white"
                  >
                    <Upload className="w-4 h-4 mr-1" /> Upload Video
                  </Button>
                }
              />
            )}
          </div>


          <div className='mb-8 space-y-4'>
            <div className='flex justify-center'>
              <div className='min-w-[240px]'>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className='backdrop-blur bg-[#0f172a]/70 border border-cyan-400/15 text-white'>
                    <SelectValue placeholder='Filter by Wandering Role' />
                  </SelectTrigger>
                  <SelectContent className='bg-white border border-border z-50'>
                    <SelectItem value='all'>All Roles</SelectItem>
                    {WANDERING_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className='flex justify-center'>
              <div className='flex gap-2'>
                {['all', 'active', 'completed', 'paused'].map((status) => (
                  <Button
                    key={status}
                    size='sm'
                    onClick={() => setStatusFilter(status)}
                    className={statusFilter === status
                      ? 'backdrop-blur-md bg-white/30 border-white/40 text-white hover:bg-white/40'
                      : 'backdrop-blur bg-[#0f172a]/70 border border-cyan-400/15 text-white hover:bg-[#0f172a]/90'}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className='backdrop-blur bg-[#0f172a]/70 border border-cyan-400/15 shadow-2xl rounded-2xl p-6 md:p-8'>
            {userSeeds.length === 0 ? (
              <Card className='backdrop-blur bg-[#0f172a]/70 border border-cyan-400/15 shadow-2xl'>
                <CardContent className='p-12 text-center'>
                  <Sprout className='h-16 w-16 mx-auto text-slate-400 mb-4' />
                  <h3 className='text-xl font-semibold text-white mb-2'>
                    {statusFilter !== 'all' || selectedRole !== 'all' ? 'No seeds found' : 'No seeds yet'}
                  </h3>
                  <p className='text-slate-400 mb-6'>
                    {statusFilter !== 'all' || selectedRole !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Start your journey by sowing your first seed'}
                  </p>
                  {statusFilter === 'all' && selectedRole === 'all' && (
                    <Link to="/create-orchard" style={{ textDecoration: 'none' }}>
                      <LivingButton variant="enter" height={44} borderRadius={10} fontSize={13} letterSpacing="1px">
                        <Plus size={16} /> Sow Your First Seed
                      </LivingButton>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="relative px-12">
                <Carousel opts={{ align: "start", loop: true }} className="w-full">
                  <CarouselContent className="-ml-2 md:-ml-4">
                    {userSeeds.map((seed) => (
                      <CarouselItem key={seed.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                        <Card className='backdrop-blur bg-[#0f172a]/70 border border-cyan-400/15 shadow-2xl hover:shadow-3xl transition-all flex flex-col'>
                          <div className="relative">
                            {seed.images?.[0] ? (
                              <img src={seed.images[0]} alt={seed.title} className="w-full h-48 object-cover rounded-t-lg" />
                            ) : (
                              <GradientPlaceholder type="orchard" title={seed.title} className="w-full h-48 rounded-t-lg" size="lg" />
                            )}
                            <div className="absolute top-4 right-4">
                              <Badge className={seed.status === 'active' ? 'bg-emerald-500/90 text-white border-0 shadow-lg' : 'bg-muted/90 text-muted-foreground border-0 shadow-lg'}>
                                {seed.status}
                              </Badge>
                            </div>
                            <div className="absolute top-4 left-4">
                              <Badge className="bg-primary/90 text-primary-foreground border-0 shadow-lg backdrop-blur">
                                {WANDERING_ROLES.find(r => r.value === seed.category)?.label || seed.category}
                              </Badge>
                            </div>
                          </div>
                          <CardHeader className="pb-4">
                            <CardTitle className='text-lg text-white mb-2 line-clamp-2'>{seed.title}</CardTitle>
                            <div className='flex items-center space-x-4 text-sm text-slate-300'>
                              <span className="flex items-center"><Eye className="h-4 w-4 mr-1" />{seed.views || 0}</span>
                              <span className="flex items-center"><Users className="h-4 w-4 mr-1" />{seed.supporters || 0}</span>
                              {seed.location && <span className="flex items-center"><MapPin className="h-4 w-4 mr-1" />{seed.location}</span>}
                            </div>
                          </CardHeader>
                          <CardContent className="flex-1 flex flex-col">
                            <div className="space-y-4 flex-1">
                              <p className='text-slate-300 text-sm line-clamp-2 mb-3'>{seed.description}</p>
                              {seed.pocket_bestow && (
                                <div className="mb-3 p-2 bg-purple-500/20 border border-purple-400/50 rounded-lg">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-400">Pocket Bestow</span>
                                    <Badge className="bg-purple-500/30 text-white border-purple-400/50">{formatCurrency(seed.pocket_bestow)}</Badge>
                                  </div>
                                </div>
                              )}
                              <div>
                                <div className='flex items-center justify-between mb-2'>
                                  <span className='text-sm text-slate-300'>Growth</span>
                                  <span className='text-sm font-medium text-white'>{getCompletionPercentage(seed)}%</span>
                                </div>
                                <Progress value={getCompletionPercentage(seed)} className='h-2' />
                              </div>
                              <div className='flex items-center justify-between text-sm'>
                                <span className='text-slate-300'>Raised:</span>
                                <span className='font-medium text-white'>{formatCurrency((seed.filled_pockets || 0) * (seed.pocket_bestow || 0))}</span>
                              </div>
                              <div className='flex items-center justify-between text-sm'>
                                <span className='text-slate-300'>Goal:</span>
                                <span className='font-medium text-white'>
                                  {formatCurrency(((seed.intended_pockets && seed.intended_pockets > 1) ? seed.intended_pockets : seed.total_pockets || 0) * (seed.pocket_bestow || 0))}
                                </span>
                              </div>
                              <div className='flex items-center text-sm text-slate-400'>
                                <Calendar className='h-4 w-4 mr-1' />
                                Sown {new Date(seed.created_at).toLocaleDateString()}
                              </div>

                              {/* Action buttons */}
                              <div className="flex flex-wrap gap-2 pt-2 mt-auto">
                                <Link to={`/orchards/${seed.id}`} className='flex-1 min-w-[80px]' style={{ textDecoration: 'none' }}>
                                  <Button variant='outline' size='sm' className='w-full backdrop-blur bg-[#0f172a]/70 border border-cyan-400/15 text-white hover:bg-[#0f172a]/90'>
                                    <Eye className='h-4 w-4 mr-1' />View
                                  </Button>
                                </Link>
                                <Link to={`/edit-orchard/${seed.id}`} className='flex-1 min-w-[80px]' style={{ textDecoration: 'none' }}>
                                  <Button variant='outline' size='sm' className='w-full backdrop-blur bg-[#0f172a]/70 border border-cyan-400/15 text-white hover:bg-[#0f172a]/90'>
                                    <Edit className='h-4 w-4 mr-1' />Edit
                                  </Button>
                                </Link>
                                <button
                                  className='flex-1 min-w-[60px]'
                                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', cursor: 'pointer', padding: '6px 8px' }}
                                  onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/animated-orchard/${seed.id}`)
                                    toast.success('Seed link copied!')
                                  }}
                                >
                                  <Share2 size={14} />
                                </button>
                              </div>

                              {/* Go Live — full width living button */}
                              <div style={{ marginTop: 8 }}>
                                <Link to={`/live-seed/${seed.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                                  <LivingButton variant="live" height={44} borderRadius={10} fontSize={13} letterSpacing="1px">
                                    Go Live
                                  </LivingButton>
                                </Link>
                              </div>

                              <Button
                                variant='outline' size='sm'
                                onClick={() => handleDeleteSeed(seed.id)}
                                className='w-full backdrop-blur-md bg-red-500/20 border-red-300/50 text-red-200 hover:bg-red-500/30 mt-1'
                              >
                                <Trash2 className='h-4 w-4 mr-1' />Delete
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className='absolute -left-4 top-1/2 -translate-y-1/2 backdrop-blur bg-[#0f172a]/70 border border-cyan-400/15 text-white hover:bg-[#0f172a]/90' />
                  <CarouselNext className='absolute -right-4 top-1/2 -translate-y-1/2 backdrop-blur bg-[#0f172a]/70 border border-cyan-400/15 text-white hover:bg-[#0f172a]/90' />
                </Carousel>
              </div>
            )}
          </div>
        </div>
      </div>
      <VideoUploadModal isOpen={showVideoUpload} onClose={() => setShowVideoUpload(false)} />
      <BrandManagerDialog
        open={showBrands}
        onOpenChange={setShowBrands}
        userId={user?.id}
        brands={brands}
        onChanged={refetchBrands}
      />
    </div>
  )
}

function HeroBrandLogo({ brand }) {
  const signed = useSignedImage(brand?.logo_url || undefined)
  const src = signed || brand?.logo_url
  if (src) {
    return <img src={src} alt={`${brand.name} logo`} className='h-12 w-12 rounded-xl object-cover' />
  }
  return <Sprout className='w-12 h-12 text-cyan-300' />
}

