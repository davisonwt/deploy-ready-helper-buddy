import { useEffect, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

/**
 * Broadcasts the current user's presence on the 'gosat-presence' channel.
 * Should be mounted once at app level (e.g. Layout).
 *
 * Note: tracking is done for any authenticated user; host visibility is still
 * restricted in RadioHostPanel to users with the 'gosat' role.
 */
export function useGosatPresence() {
  const { user } = useAuth()
  const channelRef = useRef(null)

  useEffect(() => {
    if (!user?.id) return

    const channel = supabase.channel('gosat-presence', {
      config: { presence: { key: user.id } }
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        // Presence state is read by RadioHostPanel via its own subscription
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString()
          })
        }
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [user?.id])
}

