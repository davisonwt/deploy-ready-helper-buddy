import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Bell, BellOff } from "lucide-react"
import { usePushNotifications } from "@/lib/pushNotifications"

const NotificationSettings = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    Notification.permission === 'granted'
  )
  const { enableNotifications, disableNotifications } = usePushNotifications()

  const handleToggleNotifications = async () => {
    if (notificationsEnabled) {
      await disableNotifications()
      setNotificationsEnabled(false)
    } else {
      const success = await enableNotifications()
      setNotificationsEnabled(success)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {notificationsEnabled ? (
            <Bell className="h-5 w-5" />
          ) : (
            <BellOff className="h-5 w-5" />
          )}
          Push Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Enable push notifications</p>
            <p className="text-xs text-muted-foreground">
              Get notified about new opportunities, achievements, and updates
            </p>
          </div>
          <Switch
            checked={notificationsEnabled}
            onCheckedChange={handleToggleNotifications}
          />
        </div>
        
        {!('Notification' in window) && (
          <p className="text-xs text-destructive">
            Your browser doesn't support push notifications
          </p>
        )}
        
        {Notification.permission === 'denied' && (
          <p className="text-xs text-destructive">
            Notifications are blocked. Please enable them in your browser settings.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default NotificationSettings