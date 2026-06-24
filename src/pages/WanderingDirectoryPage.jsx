import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from '../hooks/useAuth'

const ROLES = [
  { key: 'all', label: 'All', emoji: '🌿' },
  { key: 'wheel', label: 'Wandering Wheel', emoji: '🚗', table: 'community_drivers' },
  { key: 'hand', label: 'Wandering Hand', emoji: '🤲', table: 'service_providers' },
  { key: 'whisperer', label: 'Whisperer', emoji: '🌬️', table: 'whisperers' },
  { key: 'pillow', label: 'Wandering Pillow', emoji: '🛏️', table: 'stay_listings' },
  { key: 'field', label: 'Wandering Field', emoji: '🌾', table: 'providers' },
  { key: 'heart', label: 'Wandering Heart', emoji: '💚', table: 'tribal_hearts_profiles' },
  { key: 'forge', label: 'Wandering Forge', emoji: '⚒️', table: 'providers' },
  { key: 'story', label: 'Wandering Story', emoji: '🎥', table: 'providers' },
  { key: 'hearth', label: 'Wandering Hearth', emoji: '🔥', table: 'providers' },
]

const ROLE_COLORS = {
  wheel: '#0891b2', hand: '#16a34a', whisperer: '#7c3aed',
  pillow: '#db2777', field: '#ca8a04', heart: '#dc2626',
  forge: '#ea580c', story: '#6366f1', hearth: '#f97316',
}

export default function WanderingDirectoryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeRole, setActiveRole] = useState('all')
  const [search, setSearch] = useState('')
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [locationFilter, setLocationFilter] = useState('')

  useEffect(() => { fetchMembers() }, [activeRole, locationFilter])

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const results = []
      const fetchRole = async (table, roleKey, roleLabel, roleEmoji) => {
        let query = supabase.from(table).select('*').eq('status', 'approved').limit(20)
        if (locationFilter) query = query.ilike('city', `%${locationFilter}%`)
        const { data } = await query
        if (data) data.forEach(item => results.push({
          ...item, _role: roleKey, _roleLabel: roleLabel,
          _roleEmoji: roleEmoji, _color: ROLE_COLORS[roleKey],
        }))
      }
      if (activeRole === 'all' || activeRole === 'wheel') await fetchRole('community_drivers', 'wheel', 'Wandering Wheel', '🚗')
      if (activeRole === 'all' || activeRole === 'hand') await fetchRole('service_providers', 'hand', 'Wandering Hand', '🤲')
      if (activeRole === 'all' || activeRole === 'whisperer') await fetchRole('whisperers', 'whisperer', 'Whisperer', '🌬️')
      if (activeRole === 'all' || activeRole === 'pillow') {
        const { data } = await supabase.from('stay_listings').select('*').eq('status', 'approved').limit(20)
        if (data) data.forEach(item => results.push({ ...item, _role: 'pillow', _roleLabel: 'Wandering Pillow', _roleEmoji: '🛏️', _color: ROLE_COLORS.pillow }))
      }
      if (activeRole === 'all' || activeRole === 'field') {
        const { data } = await supabase.from('providers').select('*').eq('status', 'approved').eq('subtype', 'farmer').limit(20)
        if (data) data.forEach(item => results.push({ ...item, _role: 'field', _roleLabel: 'Wandering Field', _roleEmoji: '🌾', _color: ROLE_COLORS.field }))
      }
      if (activeRole === 'all' || activeRole === 'forge') {
        const { data } = await supabase.from('providers').select('*').eq('status', 'approved').eq('subtype', 'manufacturer').limit(20)
        if (data) data.forEach(item => results.push({ ...item, _role: 'forge', _roleLabel: 'Wandering Forge', _roleEmoji: '⚒️', _color: ROLE_COLORS.forge }))
      }
      if (activeRole === 'all' || activeRole === 'story') {
        const { data } = await supabase.from('providers').select('*').eq('status', 'approved').eq('subtype', 'story').limit(20)
        if (data) data.forEach(item => results.push({ ...item, _role: 'story', _roleLabel: 'Wandering Story', _roleEmoji: '🎥', _color: ROLE_COLORS.story }))
      }
      if (activeRole === 'all' || activeRole === 'hearth') {
        const { data } = await supabase.from('providers').select('*').eq('status', 'approved').eq('subtype', 'hearth').limit(20)
        if (data) data.forEach(item => results.push({ ...item, _role: 'hearth', _roleLabel: 'Wandering Hearth', _roleEmoji: '🔥', _color: ROLE_COLORS.hearth }))
      }
      setMembers(results)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = members.filter(m => {
    const name = m.full_name || m.display_name || m.business_name || ''
    const city = m.city || m.country || ''
    return name.toLowerCase().includes(search.toLowerCase()) || city.toLowerCase().includes(search.toLowerCase())
  })

  const s = {
    root: { minHeight: '100vh', background: '#060a12', color: '#e2e8f0', fontFamily: "'DM Sans', system-ui, sans-serif", padding: '24px' },
    backBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 13, marginBottom: 20, padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none' },
    header: { marginBottom: 28 },
    title: { fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 },
    sub: { fontSize: 14, color: '#4b5563' },
    searchRow: { display: 'flex', gap: 10, marginBottom: 24 },
    input: { flex: 1, background: '#0d1117', border: '1px solid #1e2430', borderRadius: 10, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none' },
    roleRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 },
    roleBtn: (active, color) => ({
      padding: '8px 14px', borderRadius: 20,
      border: `1px solid ${active ? color : '#1e2430'}`,
      background: active ? color + '22' : 'transparent',
      color: active ? color : '#6b7280',
      fontSize: 13, fontWeight: 600, cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex', alignItems: 'center', gap: 6,
      boxShadow: active ? ('0 0 14px ' + color + '66') : 'none',
    }),
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
    card: (color) => ({ background: '#0d1117', border: `1px solid ${color}33`, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', textDecoration: 'none' }),
    cardTop: (color) => ({ height: 6, background: color }),
    cardBody: { padding: '16px' },
    cardHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
    avatar: (color) => ({ width: 48, height: 48, borderRadius: '50%', background: color + '33', border: `2px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }),
    cardName: { fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 },
    cardRole: (color) => ({ fontSize: 12, color, fontWeight: 600 }),
    cardDesc: { fontSize: 13, color: '#6b7280', lineHeight: 1.5, marginBottom: 12 },
    cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    cardLocation: { fontSize: 12, color: '#4b5563' },
    bookBtn: (color) => ({ padding: '7px 14px', borderRadius: 20, background: color, border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }),
    emptyState: { textAlign: 'center', padding: '60px 20px', color: '#4b5563' },
    loadingRow: { display: 'flex', justifyContent: 'center', padding: '60px 20px' },
    registerBanner: { background: 'linear-gradient(135deg, #16a34a22, #0891b222)', border: '1px solid #16a34a44', borderRadius: 14, padding: '16px 20px', marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    registerBtn: { padding: '8px 16px', background: '#16a34a', border: 'none', borderRadius: 20, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  }

  const getName = (m) => m.full_name || m.display_name || m.business_name || m.dj_name || 'Tribe Member'
  const getDesc = (m) => m.bio || m.description || m.services_offered?.join(', ') || m.specialties?.join(', ') || ''
  const getLocation = (m) => [m.city, m.country].filter(Boolean).join(', ') || 'Location not set'
  const getAvatar = (m) => m.logo_url || m.avatar_url || m.cover_photo || null
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/dashboard'))

  return (
    <div style={s.root}>
      <style>{`
        @keyframes roleGlow { 0%,100%{opacity:1} 50%{opacity:0.7} }
      `}</style>
      <button type="button" onClick={goBack} style={s.backBtn}>&#8592; Go Back</button>
      <div style={s.header}>
        <div style={s.title}>&#127807; The Wandering Directory</div>
        <div style={s.sub}>Find skilled tribe members ready to serve, create, and connect</div>
      </div>

      {user && (
        <div style={s.registerBanner}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>
              {activeRole === 'heart' ? 'Want to find your tribal match?' : 'Are you a Wandering member?'}
            </div>
            <div style={{ fontSize: 14, color: '#9ca3af' }}>
              {activeRole === 'heart'
                ? 'Create your Tribal Heart profile and join the circle'
                : 'Register your role and appear in the directory'}
            </div>
          </div>
          <Link to={activeRole === 'heart' ? '/tribal-hearts' : '/register-wandering'}>
            <button style={s.registerBtn}>
              {activeRole === 'heart' ? '💚 Become a Tribal Heart' : 'Register a Role'}
            </button>
          </Link>
        </div>
      )}

      <div style={s.searchRow}>
        <input style={s.input} placeholder="Search by name, city, or skill..." value={search} onChange={e => setSearch(e.target.value)} />
        <input style={{ ...s.input, flex: '0 0 180px' }} placeholder="Filter by city..." value={locationFilter} onChange={e => setLocationFilter(e.target.value)} onBlur={fetchMembers} />
      </div>

      <div style={s.roleRow}>
        {ROLES.map(role => (
          <button key={role.key} style={s.roleBtn(activeRole === role.key, ROLE_COLORS[role.key] || '#16a34a')} onClick={() => setActiveRole(role.key)}>
            <span style={{ fontSize: 16 }}>{role.emoji}</span>
            {role.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={s.loadingRow}><div style={{ color: '#4b5563', fontSize: 14 }}>Finding tribe members...</div></div>
      ) : filtered.length === 0 ? (
        <div style={s.emptyState}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>&#127807;</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>No tribe members found yet</div>
          <div style={{ fontSize: 14 }}>Be the first to register this Wandering role</div>
        </div>
      ) : (
        <div style={s.grid}>
          {filtered.map((m, i) => (
            <Link key={i} to={m._role === 'heart' ? '/tribal-hearts' : `/wandering/${m._role}/${m.id}`} style={s.card(m._color)}>
              <div style={s.cardTop(m._color)} />
              <div style={s.cardBody}>
                <div style={s.cardHeader}>
                  <div style={s.avatar(m._color)}>
                    {getAvatar(m) ? <img src={getAvatar(m)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : m._roleEmoji}
                  </div>
                  <div>
                    <div style={s.cardName}>{getName(m)}</div>
                    <div style={s.cardRole(m._color)}>{m._roleEmoji} {m._roleLabel}</div>
                  </div>
                </div>
                <div style={s.cardDesc}>{getDesc(m) ? getDesc(m).slice(0, 100) + (getDesc(m).length > 100 ? '...' : '') : 'Tribe member'}</div>
                <div style={s.cardFooter}>
                  <div style={s.cardLocation}>&#128205; {getLocation(m)}</div>
                  <button style={s.bookBtn(m._color)} onClick={e => e.preventDefault()}>
                    {m._role === 'heart' ? 'Connect' : m._role === 'whisperer' ? 'Invite' : 'Book'}
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
