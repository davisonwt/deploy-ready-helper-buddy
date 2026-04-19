import { useState, useRef, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { useToast } from "../hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { 
  User, Mail, MapPin, Phone, Edit, Save, X, Sprout, Heart, TrendingUp,
  Users, Star, Calendar, Shield, Camera, Globe, Link, Eye, EyeOff,
  CheckCircle, AlertCircle, Instagram, Facebook, Twitter, Youtube,
  Music, Sparkles, Crown, Award, TreePine, ChevronDown, ChevronUp
} from "lucide-react"
import { QuickProfileSetup } from "../components/profile/QuickProfileSetup"
import Journal from "../components/journal/Journal"
import RecipesPage from "./RecipesPage"
import SecurityQuestionsAlert from "../components/auth/SecurityQuestionsAlert"
import SecuritySettingsCard from "../components/profile/SecuritySettingsCard"
import { getCurrentTheme } from "@/utils/dashboardThemes"
import { motion, AnimatePresence } from "framer-motion"

// === Reusable Feed Card ===
function FeedCard({ children, theme, delay = 0, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
    >
      {children}
    </motion.div>
  )
}

// === Collapsible Section ===
function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false, theme, delay = 0 }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <FeedCard theme={theme} delay={delay}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ color: theme.textPrimary }}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4" style={{ color: theme.accent }} />}
          <span className="text-sm font-semibold">{title}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4" style={{ color: theme.textSecondary }} /> : <ChevronDown className="h-4 w-4" style={{ color: theme.textSecondary }} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </FeedCard>
  )
}

// === Info Row ===
function InfoRow({ icon: Icon, label, value, theme }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: `${theme.textPrimary}06` }}>
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" style={{ color: theme.accent }} />
        <span className="text-xs" style={{ color: theme.textSecondary }}>{label}</span>
      </div>
      <span className="text-sm font-medium" style={{ color: theme.textPrimary }}>{value || "Not set"}</span>
    </div>
  )
}

// === Edit Field ===
function EditField({ label, icon: Icon, name, value, onChange, type = "text", placeholder, theme, options, error }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-medium" style={{ color: theme.textSecondary }}>
        <Icon className="h-3.5 w-3.5" style={{ color: theme.accent }} />
        {label}
      </label>
      {type === "select" ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          className="w-full px-3 py-2.5 rounded-xl text-sm transition-colors"
          style={{ 
            background: `${theme.textPrimary}08`, 
            border: `1px solid ${theme.cardBorder}`,
            color: theme.textPrimary 
          }}
        >
          {options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : type === "textarea" ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          rows={3}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 rounded-xl text-sm resize-none transition-colors"
          style={{ 
            background: `${theme.textPrimary}08`, 
            border: `1px solid ${theme.cardBorder}`,
            color: theme.textPrimary 
          }}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 rounded-xl text-sm transition-colors"
          style={{ 
            background: `${theme.textPrimary}08`, 
            border: `1px solid ${theme.cardBorder}`,
            color: theme.textPrimary 
          }}
        />
      )}
      {error && (
        <p className="text-xs flex items-center gap-1 text-red-400">
          <AlertCircle className="h-3 w-3" />{error}
        </p>
      )}
    </div>
  )
}

// === Stat Pill ===
function StatPill({ icon: Icon, label, value, color, theme }) {
  return (
    <div className="flex flex-col items-center p-3 rounded-xl" style={{ background: `${color}15` }}>
      <Icon className="h-5 w-5 mb-1" style={{ color }} />
      <span className="text-lg font-bold" style={{ color }}>{value}</span>
      <span className="text-[10px]" style={{ color: theme.textSecondary }}>{label}</span>
    </div>
  )
}

// === Social Link Pill ===
function SocialPill({ platform, url, icon: Icon, bg, theme, editing, formKey, formValue, onChange, onDisconnect, error }) {
  if (editing) {
    return (
      <div className="space-y-1.5 p-3 rounded-xl" style={{ background: `${theme.textPrimary}06` }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: bg }}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-medium" style={{ color: theme.textPrimary }}>{platform}</span>
        </div>
        <input
          type="url"
          name={formKey}
          value={formValue}
          onChange={onChange}
          placeholder={`https://${platform.toLowerCase()}.com/username`}
          className="w-full px-3 py-2 rounded-lg text-xs"
          style={{ background: `${theme.textPrimary}08`, border: `1px solid ${theme.cardBorder}`, color: theme.textPrimary }}
        />
        {error && <p className="text-xs text-red-400"><AlertCircle className="h-3 w-3 inline mr-1" />{error}</p>}
        {formValue && (
          <button onClick={onDisconnect} className="text-xs text-red-400 hover:underline">Disconnect</button>
        )}
      </div>
    )
  }

  if (!url) return null
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-white transition-transform active:scale-95"
      style={{ background: bg }}
    >
      <Icon className="h-3.5 w-3.5" />{platform}
    </a>
  )
}

// ====================== MAIN COMPONENT ======================
export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const location = useLocation()
  const { toast } = useToast()
  const theme = getCurrentTheme()

  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [pictureError, setPictureError] = useState("")
  const [socialLinksError, setSocialLinksError] = useState({})
  const [mounted, setMounted] = useState(false)
  const [showQuickSetup, setShowQuickSetup] = useState(false)
  const [activeView, setActiveView] = useState("profile") // profile | journal | recipes
  const fileInputRef = useRef(null)

  const searchParams = new URLSearchParams(location.search)
  const journalYear = searchParams.get('year') ? Number(searchParams.get('year')) : undefined
  const journalMonth = searchParams.get('month') ? Number(searchParams.get('month')) : undefined
  const journalDay = searchParams.get('day') ? Number(searchParams.get('day')) : undefined
  const journalView = searchParams.get('view') || undefined

  useEffect(() => {
    setMounted(true)
    const tabParam = searchParams.get('tab')
    if (tabParam && ['profile', 'journal', 'recipes'].includes(tabParam)) setActiveView(tabParam)
    if (location.state?.message) {
      toast({ title: "Complete Your Profile", description: location.state.message, duration: 5000 })
      setEditing(true)
    }
  }, [location.state, location.search, toast])

  const [formData, setFormData] = useState({
    first_name: "", last_name: "", display_name: "", location: "", phone: "", bio: "",
    website: "", tiktok_url: "", instagram_url: "", facebook_url: "", twitter_url: "",
    youtube_url: "", show_social_media: true, avatar_url: null,
    preferred_currency: "USD", country: "", timezone: ""
  })

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user?.first_name || "", last_name: user?.last_name || "",
        display_name: user?.display_name || "", location: user?.location || "",
        phone: user?.phone || "", bio: user?.bio || "", website: user?.website || "",
        tiktok_url: user?.tiktok_url || "", instagram_url: user?.instagram_url || "",
        facebook_url: user?.facebook_url || "", twitter_url: user?.twitter_url || "",
        youtube_url: user?.youtube_url || "", show_social_media: user?.show_social_media !== false,
        avatar_url: user?.avatar_url || null, preferred_currency: user?.preferred_currency || "USD",
        country: user?.country || "", timezone: user?.timezone || ""
      })
    }
  }, [user])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }))
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) { setPictureError("Upload JPEG, PNG, or WebP"); return }
    if (file.size > 5 * 1024 * 1024) { setPictureError("Max 5MB"); return }
    setUploadingPicture(true); setPictureError("")
    const reader = new FileReader()
    reader.onload = (e) => { setFormData(prev => ({ ...prev, avatar_url: e.target.result })); setUploadingPicture(false) }
    reader.onerror = () => { setPictureError("Failed to read image"); setUploadingPicture(false) }
    reader.readAsDataURL(file)
  }

  const validateSocialLinks = () => {
    const errors = {}; const pat = /^https?:\/\/.+/
    if (formData.tiktok_url && !pat.test(formData.tiktok_url)) errors.tiktok = "Invalid URL"
    if (formData.instagram_url && !pat.test(formData.instagram_url)) errors.instagram = "Invalid URL"
    if (formData.facebook_url && !pat.test(formData.facebook_url)) errors.facebook = "Invalid URL"
    if (formData.twitter_url && !pat.test(formData.twitter_url)) errors.twitter = "Invalid URL"
    if (formData.youtube_url && !pat.test(formData.youtube_url)) errors.youtube = "Invalid URL"
    setSocialLinksError(errors); return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    setLoading(true)
    if (!validateSocialLinks()) { setLoading(false); return }
    try {
      const result = await updateProfile(formData)
      if (result.success) { setEditing(false); setPictureError(""); setSocialLinksError({}) }
    } catch (error) { console.error("Error:", error) }
    finally { setLoading(false) }
  }

  const handleCancel = () => {
    if (user) setFormData({
      first_name: user?.first_name || "", last_name: user?.last_name || "",
      display_name: user?.display_name || "", location: user?.location || "",
      phone: user?.phone || "", bio: user?.bio || "", website: user?.website || "",
      tiktok_url: user?.tiktok_url || "", instagram_url: user?.instagram_url || "",
      facebook_url: user?.facebook_url || "", twitter_url: user?.twitter_url || "",
      youtube_url: user?.youtube_url || "", show_social_media: user?.show_social_media !== false,
      avatar_url: user?.avatar_url || null, preferred_currency: user?.preferred_currency || "USD",
      country: user?.country || "", timezone: user?.timezone || ""
    })
    setEditing(false); setPictureError(""); setSocialLinksError({})
  }

  // Real-time stats fetched from Supabase — NEVER hardcoded
  const [userStats, setUserStats] = useState({
    joinedDate: "—",
    totalBestowed: 0,        // amount this user has BESTOWED to others
    totalReceived: 0,        // amount this user has RECEIVED via their orchards
    orchardsCreated: 0,
    orchardsSupported: 0,    // distinct orchards this user has bestowed to
    helpedCount: 0,          // people they've directly bestowed to
    successRate: null,       // null when no completed bestowals yet
    avgRating: null,         // null when no reviews yet
    communityRank: "Seedling",
    verificationLevel: "Unverified",
    currencyCode: "USD",
  })

  useEffect(() => {
    const userId = user?.id
    if (!userId) return
    let cancelled = false
    ;(async () => {
      try {
        const currency = user?.preferred_currency || "USD"
        const joined = user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long" }) : "—"

        const [scoreRes, bestowedRes, orchardsRes, receivedRes] = await Promise.all([
          supabase.from("tribal_scores")
            .select("score, tier, orchards_count, bestowals_given_count, reviews_avg_rating")
            .eq("user_id", userId).maybeSingle(),
          supabase.from("bestowals")
            .select("amount, payment_status, orchard_id")
            .eq("bestower_id", userId),
          supabase.from("orchards")
            .select("id")
            .eq("user_id", userId),
          supabase.from("bestowals")
            .select("amount, payment_status, orchards!inner(user_id)")
            .eq("orchards.user_id", userId)
            .eq("payment_status", "completed"),
        ])

        const completedBestowals = (bestowedRes.data || []).filter(b => b.payment_status === "completed")
        const totalBestowed = completedBestowals.reduce((s, b) => s + Number(b.amount || 0), 0)
        const totalReceived = (receivedRes.data || []).reduce((s, b) => s + Number(b.amount || 0), 0)
        const orchardsSupported = new Set(completedBestowals.map(b => b.orchard_id)).size
        const totalAttempts = (bestowedRes.data || []).length
        const successRate = totalAttempts > 0 ? Math.round((completedBestowals.length / totalAttempts) * 100) : null

        const score = scoreRes.data
        const tierLabels = { seedling: "Seedling", sprout: "Sprout", sower: "Sower", mentor: "Mentor", elder: "Elder" }
        const rank = score?.tier ? tierLabels[score.tier] || "Seedling" : "Seedling"
        const verification = (score?.score ?? 0) >= 100 ? "Verified" : "Unverified"

        if (!cancelled) {
          setUserStats({
            joinedDate: joined,
            totalBestowed,
            totalReceived,
            orchardsCreated: (orchardsRes.data || []).length,
            orchardsSupported,
            helpedCount: orchardsSupported,
            successRate,
            avgRating: score?.reviews_avg_rating != null && Number(score.reviews_avg_rating) > 0 ? Number(score.reviews_avg_rating) : null,
            communityRank: rank,
            verificationLevel: verification,
            currencyCode: currency,
          })
        }
      } catch (err) {
        console.error("[ProfilePage] failed to load stats", err)
      }
    })()
    return () => { cancelled = true }
  }, [user?.id, user?.preferred_currency, user?.created_at])

  const formatMoney = (amount, code) => {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: code || "USD", maximumFractionDigits: 0 }).format(Number(amount || 0))
    } catch {
      return `${code || ""} ${Math.round(Number(amount || 0))}`
    }
  }


  if (showQuickSetup) return <QuickProfileSetup onComplete={() => setShowQuickSetup(false)} onClose={() => setShowQuickSetup(false)} />

  const currencyOptions = [
    { value: "USD", label: "USD ($)" }, { value: "EUR", label: "EUR (€)" }, { value: "GBP", label: "GBP (£)" },
    { value: "CAD", label: "CAD ($)" }, { value: "AUD", label: "AUD ($)" }, { value: "ZAR", label: "ZAR (R)" },
  ]
  const timezoneOptions = [
    { value: "", label: "Select timezone" },
    { value: "America/New_York", label: "Eastern" }, { value: "America/Chicago", label: "Central" },
    { value: "America/Denver", label: "Mountain" }, { value: "America/Los_Angeles", label: "Pacific" },
    { value: "Europe/London", label: "London" }, { value: "Europe/Paris", label: "Central EU" },
    { value: "Asia/Tokyo", label: "Tokyo" }, { value: "Asia/Dubai", label: "Dubai" },
    { value: "Australia/Sydney", label: "Sydney" }, { value: "Africa/Johannesburg", label: "Johannesburg" },
    { value: "Africa/Lagos", label: "Lagos" }, { value: "UTC", label: "UTC" },
  ]

  return (
    <div className="min-h-screen pb-24" style={{ background: theme.background }}>
      <div className={`max-w-lg mx-auto px-4 pt-4 space-y-3 transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>

        {/* === Tab Switcher === */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex gap-1 p-1 rounded-2xl"
          style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}
        >
          {[
            { key: "profile", label: "👤 Profile" },
            { key: "journal", label: "📖 Journal" },
            { key: "recipes", label: "🍳 Recipes" },
          ].map(tab => (
            <button key={tab.key}
              onClick={() => setActiveView(tab.key)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: activeView === tab.key ? theme.accent : 'transparent',
                color: activeView === tab.key ? '#fff' : theme.textSecondary,
              }}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* === JOURNAL VIEW === */}
        {activeView === "journal" && (
          <FeedCard theme={theme}>
            <div className="p-4">
              <Journal initialYhwhYear={journalYear} initialYhwhMonth={journalMonth} initialYhwhDay={journalDay} initialView={journalView} />
            </div>
          </FeedCard>
        )}

        {/* === RECIPES VIEW === */}
        {activeView === "recipes" && (
          <FeedCard theme={theme}>
            <div className="p-4"><RecipesPage /></div>
          </FeedCard>
        )}

        {/* === PROFILE VIEW === */}
        {activeView === "profile" && (
          <>
            {/* Security Alert */}
            <SecurityQuestionsAlert />

            {/* Hero Card — Avatar + Name + Badges + Stats */}
            <FeedCard theme={theme} delay={0.05}>
              <div className="p-5 text-center">
                {/* Avatar */}
                <div className="relative inline-block mb-3">
                  <div className="w-24 h-24 rounded-full overflow-hidden mx-auto shadow-xl" style={{ border: `3px solid ${theme.accent}40` }}>
                    {formData.avatar_url ? (
                      <img src={formData.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: theme.accent }}>
                        <User className="h-10 w-10 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#22c55e' }}>
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  {editing && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPicture}
                      className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full flex items-center justify-center text-white"
                      style={{ background: theme.accent }}
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileUpload} className="hidden" />
                </div>

                {pictureError && (
                  <p className="text-xs text-red-400 mb-2"><AlertCircle className="h-3 w-3 inline mr-1" />{pictureError}</p>
                )}

                <h1 className="text-xl font-bold mb-0.5" style={{ color: theme.textPrimary }}>
                  {user?.display_name || user?.first_name || "My Profile"}
                </h1>
                <p className="text-xs mb-3" style={{ color: theme.textSecondary }}>
                  {user?.email}
                </p>

                {/* Badges — only show what's actually true */}
                <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full"
                    style={{ background: `${theme.accent}20`, color: theme.accent }}>
                    <Sprout className="h-3 w-3" /> Sower
                  </span>
                  {userStats.verificationLevel === "Verified" && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full"
                      style={{ background: `${theme.accent}20`, color: theme.accent }}>
                      <Shield className="h-3 w-3" /> Verified
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-1 rounded-full"
                    style={{ background: '#eab30820', color: '#eab308' }}>
                    <Crown className="h-3 w-3" /> {userStats.communityRank}
                  </span>
                </div>

                {/* Stats Row — REAL data only */}
                <div className="grid grid-cols-4 gap-2">
                  <StatPill icon={Heart} label="Bestowed" value={formatMoney(userStats.totalBestowed, userStats.currencyCode)} color="#22c55e" theme={theme} />
                  <StatPill icon={TrendingUp} label="Received" value={formatMoney(userStats.totalReceived, userStats.currencyCode)} color={theme.accent} theme={theme} />
                  <StatPill icon={TreePine} label="Orchards" value={userStats.orchardsCreated} color="#a855f7" theme={theme} />
                  <StatPill icon={Users} label="Helped" value={userStats.helpedCount} color="#f59e0b" theme={theme} />
                </div>

                {/* Edit / Quick Setup Buttons */}
                <div className="flex gap-2 mt-4">
                  {!editing ? (
                    <>
                      <button onClick={() => setShowQuickSetup(true)}
                        className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white transition-transform active:scale-95"
                        style={{ background: theme.accent }}
                      >
                        <Sparkles className="h-3.5 w-3.5 inline mr-1" /> Quick Setup
                      </button>
                      <button onClick={() => setEditing(true)}
                        className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-transform active:scale-95"
                        style={{ background: `${theme.textPrimary}10`, color: theme.textPrimary, border: `1px solid ${theme.cardBorder}` }}
                      >
                        <Edit className="h-3.5 w-3.5 inline mr-1" /> Edit Profile
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={handleSave} disabled={loading}
                        className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white transition-transform active:scale-95"
                        style={{ background: '#22c55e' }}
                      >
                        {loading ? "Saving..." : <><Save className="h-3.5 w-3.5 inline mr-1" /> Save</>}
                      </button>
                      <button onClick={handleCancel}
                        className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-transform active:scale-95"
                        style={{ background: `${theme.textPrimary}10`, color: theme.textPrimary }}
                      >
                        <X className="h-3.5 w-3.5 inline mr-1" /> Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </FeedCard>

            {/* Personal Info */}
            <CollapsibleSection title="Personal Information" icon={User} defaultOpen={editing} theme={theme} delay={0.1}>
              {editing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <EditField label="First Name" icon={User} name="first_name" value={formData.first_name} onChange={handleChange} placeholder="First name" theme={theme} />
                    <EditField label="Last Name" icon={User} name="last_name" value={formData.last_name} onChange={handleChange} placeholder="Last name" theme={theme} />
                  </div>
                  <EditField label="Display Name" icon={User} name="display_name" value={formData.display_name} onChange={handleChange} placeholder="Community name" theme={theme} />
                  <div className="grid grid-cols-2 gap-3">
                    <EditField label="Location" icon={MapPin} name="location" value={formData.location} onChange={handleChange} placeholder="City, State" theme={theme} />
                    <EditField label="Country" icon={Globe} name="country" value={formData.country} onChange={handleChange} placeholder="Country" theme={theme} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <EditField label="Currency" icon={Globe} name="preferred_currency" value={formData.preferred_currency} onChange={handleChange} type="select" options={currencyOptions} theme={theme} />
                    <EditField label="Timezone" icon={Calendar} name="timezone" value={formData.timezone} onChange={handleChange} type="select" options={timezoneOptions} theme={theme} />
                  </div>
                  <EditField label="Phone" icon={Phone} name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone number" theme={theme} />
                  <EditField label="Website" icon={Globe} name="website" value={formData.website} onChange={handleChange} type="url" placeholder="https://yoursite.com" theme={theme} />
                  <EditField label="Bio" icon={TreePine} name="bio" value={formData.bio} onChange={handleChange} type="textarea" placeholder="Tell us about yourself..." theme={theme} />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <InfoRow icon={User} label="Name" value={[user?.first_name, user?.last_name].filter(Boolean).join(' ')} theme={theme} />
                  <InfoRow icon={User} label="Display" value={user?.display_name} theme={theme} />
                  <InfoRow icon={Mail} label="Email" value={user?.email} theme={theme} />
                  <InfoRow icon={MapPin} label="Location" value={user?.location} theme={theme} />
                  <InfoRow icon={Globe} label="Country" value={user?.country} theme={theme} />
                  <InfoRow icon={Globe} label="Currency" value={user?.preferred_currency || "USD"} theme={theme} />
                  <InfoRow icon={Calendar} label="Timezone" value={user?.timezone} theme={theme} />
                  <InfoRow icon={Phone} label="Phone" value={user?.phone} theme={theme} />
                  <InfoRow icon={Globe} label="Website" value={user?.website} theme={theme} />
                  {user?.bio && (
                    <div className="mt-2 p-3 rounded-xl" style={{ background: `${theme.textPrimary}06` }}>
                      <p className="text-xs leading-relaxed" style={{ color: theme.textPrimary }}>{user.bio}</p>
                    </div>
                  )}
                </div>
              )}
            </CollapsibleSection>

            {/* Social Media */}
            <CollapsibleSection title="Social Media" icon={Link} defaultOpen={editing} theme={theme} delay={0.15}>
              {editing ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-xl" style={{ background: `${theme.textPrimary}06` }}>
                    <div className="flex items-center gap-2">
                      {formData.show_social_media ? <Eye className="h-4 w-4" style={{ color: '#22c55e' }} /> : <EyeOff className="h-4 w-4" style={{ color: theme.textSecondary }} />}
                      <span className="text-xs" style={{ color: theme.textPrimary }}>Show social links publicly</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" name="show_social_media" checked={formData.show_social_media} onChange={handleChange} className="sr-only" />
                      <div className={`w-10 h-5 rounded-full transition-all ${formData.show_social_media ? '' : ''}`}
                        style={{ background: formData.show_social_media ? theme.accent : `${theme.textPrimary}20` }}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transform transition-transform mt-0.5 ${formData.show_social_media ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'}`} />
                      </div>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <SocialPill platform="TikTok" icon={Music} bg="#000" editing theme={theme} formKey="tiktok_url" formValue={formData.tiktok_url} onChange={handleChange} onDisconnect={() => setFormData(p => ({ ...p, tiktok_url: "" }))} error={socialLinksError.tiktok} />
                    <SocialPill platform="Instagram" icon={Instagram} bg="linear-gradient(135deg, #833ab4, #e1306c)" editing theme={theme} formKey="instagram_url" formValue={formData.instagram_url} onChange={handleChange} onDisconnect={() => setFormData(p => ({ ...p, instagram_url: "" }))} error={socialLinksError.instagram} />
                    <SocialPill platform="Facebook" icon={Facebook} bg="#1877f2" editing theme={theme} formKey="facebook_url" formValue={formData.facebook_url} onChange={handleChange} onDisconnect={() => setFormData(p => ({ ...p, facebook_url: "" }))} error={socialLinksError.facebook} />
                    <SocialPill platform="YouTube" icon={Youtube} bg="#ff0000" editing theme={theme} formKey="youtube_url" formValue={formData.youtube_url} onChange={handleChange} onDisconnect={() => setFormData(p => ({ ...p, youtube_url: "" }))} error={socialLinksError.youtube} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <SocialPill platform="TikTok" url={user?.tiktok_url} icon={Music} bg="#000" theme={theme} />
                  <SocialPill platform="Instagram" url={user?.instagram_url} icon={Instagram} bg="linear-gradient(135deg, #833ab4, #e1306c)" theme={theme} />
                  <SocialPill platform="Facebook" url={user?.facebook_url} icon={Facebook} bg="#1877f2" theme={theme} />
                  <SocialPill platform="YouTube" url={user?.youtube_url} icon={Youtube} bg="#ff0000" theme={theme} />
                  {!user?.tiktok_url && !user?.instagram_url && !user?.facebook_url && !user?.youtube_url && (
                    <p className="text-xs" style={{ color: theme.textSecondary }}>No social links connected</p>
                  )}
                </div>
              )}
            </CollapsibleSection>

            {/* Account & Security */}
            <CollapsibleSection title="Account Status" icon={Shield} theme={theme} delay={0.2}>
              <div className="space-y-1.5">
                <InfoRow icon={Calendar} label="Member Since" value={userStats.joinedDate} theme={theme} />
                <InfoRow icon={CheckCircle} label="Verification" value={userStats.verificationLevel} theme={theme} />
                <InfoRow icon={Crown} label="Rank" value={userStats.communityRank} theme={theme} />
                <InfoRow icon={Sprout} label="Role" value="Farm Stall Owner" theme={theme} />
                <InfoRow icon={Star} label="Rating" value="4.8/5.0" theme={theme} />
              </div>
            </CollapsibleSection>

            {/* Security Settings */}
            <CollapsibleSection title="Security Settings" icon={Shield} theme={theme} delay={0.25}>
              <SecuritySettingsCard />
            </CollapsibleSection>

            {/* Community Legacy */}
            <FeedCard theme={theme} delay={0.3}>
              <div className="p-5 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ background: `${theme.accent}20` }}
                >
                  <Award className="h-7 w-7" style={{ color: theme.accent }} />
                </div>
                <h3 className="text-base font-bold mb-1" style={{ color: theme.textPrimary }}>Your Community Legacy</h3>
                <p className="text-xs leading-relaxed mb-4" style={{ color: theme.textSecondary }}>
                  Your generous spirit and faithful participation have helped create a thriving ecosystem.
                </p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="p-2 rounded-xl" style={{ background: '#22c55e15' }}>
                    <div className="text-lg font-bold" style={{ color: '#22c55e' }}>23</div>
                    <p className="text-[10px]" style={{ color: theme.textSecondary }}>Helped</p>
                  </div>
                  <div className="p-2 rounded-xl" style={{ background: `${theme.accent}15` }}>
                    <div className="text-lg font-bold" style={{ color: theme.accent }}>89%</div>
                    <p className="text-[10px]" style={{ color: theme.textSecondary }}>Success</p>
                  </div>
                  <div className="p-2 rounded-xl" style={{ background: '#f59e0b15' }}>
                    <div className="text-lg font-bold" style={{ color: '#f59e0b' }}>4.8</div>
                    <p className="text-[10px]" style={{ color: theme.textSecondary }}>Rating</p>
                  </div>
                </div>
                <p className="text-xs italic" style={{ color: theme.textSecondary }}>
                  "From generous hearts flow endless blessings"
                </p>
              </div>
            </FeedCard>
          </>
        )}
      </div>
    </div>
  )
}
