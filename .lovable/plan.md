

## Update Jitsi Domain to New Vultr Server

### What
Update the `VITE_JITSI_DOMAIN` environment variable from the old IP (`139.180.132.20`) to your new Vultr Jitsi server (`96.30.204.125`).

### Change
- **File**: `.env`
- Update `VITE_JITSI_DOMAIN` from `"139.180.132.20"` to `"96.30.204.125"`

That's it -- one line change. All call components already read from this variable via `src/lib/jitsi-config.ts`, so voice calls, video calls, and live rooms will automatically use your new server.

### After Deployment
1. Open `http://96.30.204.125` in your browser to confirm Jitsi is accessible
2. Test a voice or video call in your app to verify connectivity

