import { useEffect, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

/**
 * Broadcasts the current user's presence on the 'gosat-presence' channel.
 * Should be mounted once at app level (e.g. Layout) for GoSat users.
 * Non-GoSat users also join so they can read presence state, but only GoSat users track.
 */
export function useGosatPresence(isGosat) {
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
        if (status === 'SUBSCRIBED' && isGosat) {
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
  }, [user?.id, isGosat])
}
