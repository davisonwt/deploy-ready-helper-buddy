import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
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
