import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const { headers } = req
  const upgradeHeader = headers.get("upgrade") || ""

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: corsHeaders 
    })
  }

  const { socket, response } = Deno.upgradeWebSocket(req)
  
  console.log("Grove Station WebSocket connection established")
  
  // OpenAI Realtime API connection
  let openAISocket: WebSocket | null = null
  let sessionConfigured = false

  // Connect to OpenAI Realtime API
  const connectToOpenAI = () => {
    const openAIUrl = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"
    
    console.log("Connecting to OpenAI Realtime API...")
    openAISocket = new WebSocket(openAIUrl, {
      headers: {
        "Authorization": `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        "OpenAI-Beta": "realtime=v1"
      }
    })

    openAISocket.onopen = () => {
      console.log("Connected to OpenAI Realtime API")
    }

    openAISocket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log("OpenAI message type:", data.type)
      
      // Handle session creation
      if (data.type === 'session.created' && !sessionConfigured) {
        sessionConfigured = true
        console.log("OpenAI session created, ready for configuration")
      }
      
      // Forward relevant messages to the client
      if ([
        'session.created',
        'session.updated', 
        'response.audio.delta',
        'response.audio_transcript.delta',
        'response.audio.done',
        'response.audio_transcript.done',
        'response.function_call_arguments.delta',
        'response.function_call_arguments.done',
        'response.created',
        'response.done',
        'error'
      ].includes(data.type)) {
        try {
          socket.send(JSON.stringify(data))
        } catch (error) {
          console.error("Error sending to client:", error)
        }
      }
      
      // Handle function calls
      if (data.type === 'response.function_call_arguments.done') {
        handleFunctionCall(data)
      }
    }

    openAISocket.onerror = (error) => {
      console.error("OpenAI WebSocket error:", error)
      try {
        socket.send(JSON.stringify({
          type: 'error',
          message: 'OpenAI connection error'
        }))
      } catch (e) {
        console.error("Error sending error to client:", e)
      }
    }

    openAISocket.onclose = () => {
      console.log("OpenAI WebSocket closed")
      sessionConfigured = false
    }
  }

  // Handle function calls from OpenAI
  const handleFunctionCall = async (data: any) => {
    const { call_id, name, arguments: args } = data
    let result = {}

    try {
      const parsedArgs = JSON.parse(args)
      console.log(`Executing function: ${name}`, parsedArgs)

      switch (name) {
        case 'get_community_updates':
          result = await getCommunityUpdates(parsedArgs.category)
          break
          
        case 'suggest_music':
          result = await suggestMusic(parsedArgs.genre, parsedArgs.mood)
          break
          
        default:
          result = { error: `Unknown function: ${name}` }
      }

      // Send function result back to OpenAI
      if (openAISocket && openAISocket.readyState === WebSocket.OPEN) {
        openAISocket.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: call_id,
            output: JSON.stringify(result)
          }
        }))
        
        // Trigger response generation
        openAISocket.send(JSON.stringify({
          type: 'response.create'
        }))
      }

    } catch (error) {
      console.error("Function call error:", error)
      
      if (openAISocket && openAISocket.readyState === WebSocket.OPEN) {
        openAISocket.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: call_id,
            output: JSON.stringify({ error: error.message })
          }
        }))
      }
    }
  }

  // Function implementations
  const getCommunityUpdates = async (category?: string) => {
    // TODO: Implement actual database queries
    const updates = [
      "New orchard 'Sustainable Living Tips' just launched with 50 pockets!",
      "Community member Alex completed their web development course orchard",
      "Grove Station now has 150+ active DJs broadcasting daily",
      "This week's most popular orchard: 'Morning Meditation Sessions'",
      "Weekend community garden meetup planned for Saturday at 2 PM"
    ]
    
    return {
      category: category || 'general',
      updates: updates.slice(0, 3),
      timestamp: new Date().toISOString()
    }
  }

  const suggestMusic = async (genre?: string, mood?: string) => {
    const suggestions = {
      upbeat: ["Uplifting folk tracks", "Positive indie music", "Feel-good acoustic sets"],
      relaxing: ["Ambient instrumentals", "Soft jazz selections", "Nature-inspired soundscapes"],
      energetic: ["Upbeat electronic", "Motivational rock", "Dance-friendly hits"],
      focused: ["Lo-fi hip hop", "Instrumental jazz", "Minimal electronic"]
    }
    
    const moodKey = mood?.toLowerCase() || 'upbeat'
    const tracks = suggestions[moodKey as keyof typeof suggestions] || suggestions.upbeat
    
    return {
      genre: genre || 'mixed',
      mood: mood || 'upbeat',
      suggestions: tracks,
      recommendation: `Perfect for Grove Station's community vibe!`
    }
  }

  // Client message handling
  socket.onopen = () => {
    console.log("Client WebSocket opened")
    connectToOpenAI()
  }

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      console.log("Client message type:", data.type)
      
      // Handle different message types from the client
      switch (data.type) {
        case 'session.update':
          // Forward session configuration to OpenAI
          if (openAISocket && openAISocket.readyState === WebSocket.OPEN && sessionConfigured) {
            console.log("Forwarding session config to OpenAI")
            openAISocket.send(JSON.stringify(data))
          } else {
            console.log("Queueing session config (OpenAI not ready)")
            // Queue the configuration for when OpenAI is ready
            setTimeout(() => {
              if (openAISocket && openAISocket.readyState === WebSocket.OPEN) {
                openAISocket.send(JSON.stringify(data))
              }
            }, 1000)
          }
          break
          
        case 'input_audio_buffer.append':
          // Forward audio data to OpenAI
          if (openAISocket && openAISocket.readyState === WebSocket.OPEN) {
            openAISocket.send(JSON.stringify(data))
          }
          break
          
        case 'conversation.item.create':
          // Forward conversation items to OpenAI
          if (openAISocket && openAISocket.readyState === WebSocket.OPEN) {
            openAISocket.send(JSON.stringify(data))
          }
          break
          
        case 'response.create':
          // Forward response creation to OpenAI
          if (openAISocket && openAISocket.readyState === WebSocket.OPEN) {
            openAISocket.send(JSON.stringify(data))
          }
          break
          
        case 'dj_message':
          // Handle DJ chat messages
          console.log(`DJ ${data.dj_name}: ${data.message}`)
          // Broadcast to other listeners (implement listener management)
          break
          
        case 'listener_join':
          // Handle listener joining
          console.log("Listener joined")
          socket.send(JSON.stringify({
            type: 'listener_update',
            count: 1 // TODO: Implement actual listener counting
          }))
          break
          
        default:
          console.log("Unknown message type:", data.type)
      }
      
    } catch (error) {
      console.error("Error processing client message:", error)
    }
  }

  socket.onerror = (error) => {
    console.error("Client WebSocket error:", error)
  }

  socket.onclose = () => {
    console.log("Client WebSocket closed")
    
    // Close OpenAI connection
    if (openAISocket) {
      openAI Socket.close()
      openAISocket = null
    }
  }

  return response
})