// Lightweight Service Worker - Network-first strategy
const CACHE_VERSION = '2025-11-08-v3'
const CACHE_NAME = `sow2grow-v${CACHE_VERSION}`

// Only cache critical static assets
const urlsToCache = [
  '/manifest.json',
  '/placeholder.svg'
]

// Install event - cache resources and skip waiting for immediate activation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Network-first for everything - minimal caching overhead
self.addEventListener('fetch', (event) => {
  const { request } = event
  
  // Skip caching for API calls
  if (request.url.includes('/api/') || request.url.includes('supabase')) {
    return
  }

  // Only cache GET requests
  if (request.method !== 'GET') {
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache successful responses for static assets
        if (response.status === 200 && request.url.match(/\.(js|css|png|jpg|svg|woff2?)$/)) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // Fallback to cache only for static assets
        return caches.match(request)
      })
  )
})

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push event received:', event)
  
  let data = {}
  if (event.data) {
    try {
      data = event.data.json()
    } catch (e) {
      data = { title: 'Sow2Grow', body: event.data.text() }
    }
  }

  const title = data.title || 'Sow2Grow'
  const notificationType = data.type || 'default'
  
  // Customize notification based on type
  let options = {
    body: data.body || 'You have a new notification',
    icon: '/placeholder.svg',
    badge: '/placeholder.svg',
    data: {
      url: data.url || '/',
      type: notificationType
    },
    tag: notificationType === 'incoming_call' ? 'call' : undefined,
    requireInteraction: notificationType === 'incoming_call',
    actions: []
  }

  // Add type-specific actions
  if (notificationType === 'incoming_call') {
    options.actions = [
      { action: 'answer', title: 'Answer' },
      { action: 'decline', title: 'Decline' }
    ]
    options.vibrate = [200, 100, 200, 100, 200]
  } else if (notificationType === 'new_message') {
    options.actions = [
      { action: 'open', title: 'Read Message' },
      { action: 'close', title: 'Dismiss' }
    ]
  } else if (notificationType === 'new_orchard' || notificationType === 'new_product') {
    options.actions = [
      { action: 'open', title: 'View Now' },
      { action: 'close', title: 'Later' }
    ]
  } else {
    options.actions = [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Close' }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  // Handle special actions
  if (event.action === 'close' || event.action === 'decline') {
    return
  }

  const data = event.notification.data || {}
  const url = data.url || '/'
  const type = data.type
  
  // Special handling for calls
  if (type === 'incoming_call' && event.action === 'answer') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Focus existing window if available
          for (let client of clientList) {
            if (client.url.includes(url) && 'focus' in client) {
              return client.focus()
            }
          }
          // Open new window if no existing window found
          if (clients.openWindow) {
            return clients.openWindow(url)
          }
        })
    )
  } else if (event.action === 'open' || !event.action) {
    // Default action: open URL
    event.waitUntil(
      clients.openWindow(url)
    )
  }
})

// Message event - allow immediate activation via postMessage
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync tasks
      console.log('Background sync triggered')
    )
  }
})