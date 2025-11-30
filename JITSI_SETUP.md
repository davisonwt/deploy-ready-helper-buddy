# Self-Hosting Jitsi Meet with Docker

This guide provides complete instructions for setting up a self-hosted Jitsi Meet server using Docker.

## Prerequisites

- A server with:
  - Ubuntu 20.04/22.04 LTS or Debian 11/12
  - Minimum 4GB RAM (8GB+ recommended for production)
  - 2+ CPU cores
  - 20GB+ disk space
  - Public IP address
- Docker and Docker Compose installed
- A domain name pointing to your server (e.g., `meet.yourdomain.com`)
- Ports open in firewall:
  - 80/tcp (HTTP)
  - 443/tcp (HTTPS)
  - 4443/tcp (Jitsi web)
  - 10000/udp (Video bridge)
  - 3478/udp (STUN/TURN)
  - 5349/tcp (TURN over TLS)

## Installation Steps

### 1. Install Docker and Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y

# Add your user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Create Jitsi Directory Structure

```bash
mkdir -p ~/jitsi-meet
cd ~/jitsi-meet

# Create required directories
mkdir -p ~/.jitsi-meet-cfg/{web,transcripts,prosody/config,prosody/prosody-plugins-custom,jicofo,jvb,jigasi,jibri}
```

### 3. Download Configuration Files

**Option A: Download Latest from GitHub (Recommended)**

```bash
cd ~/jitsi-meet

# Download the latest release
ZIP_URL=$(wget -q -O - https://api.github.com/repos/jitsi/docker-jitsi-meet/releases/latest | grep zip | cut -d\" -f4)
ZIP_FILE=$(basename "$ZIP_URL")
wget "$ZIP_URL"

# Unzip the downloaded file
unzip "$ZIP_FILE"

# Navigate into the extracted directory (remove .zip extension)
DIR_NAME="${ZIP_FILE%.zip}"
cd "$DIR_NAME"
```

**Option B: Use Files from This Repository**

Copy the `docker-compose.yml` and `.env.jitsi` files from this repository to `~/jitsi-meet/`

### 4. Configure Environment Variables

Copy the example environment file and edit it:

```bash
# Copy the example environment file
cp env.example .env

# Edit the environment file
nano .env
```

Or if you prefer a different editor:
```bash
# Using vim
vim .env

# Using VS Code (if installed)
code .env
```

Set the following variables in `.env`:

```bash
# Domain & Ports
PUBLIC_URL=https://meet.yourdomain.com  # Your domain
HTTP_PORT=80
HTTPS_PORT=443

# SSL (Let's Encrypt – recommended)
ENABLE_LETSENCRYPT=1
LETSENCRYPT_DOMAIN=meet.yourdomain.com
LETSENCRYPT_EMAIL=admin@yourdomain.com
ENABLE_HTTP_REDIRECT=1  # Redirect HTTP to HTTPS

# Authentication (guest = open; internal = users)
ENABLE_AUTH=0  # Set to 1 for internal auth
AUTH_TYPE=guest

# Timezone & Misc
TZ=America/New_York
JVB_ADVERTISE_IPS=your.public.ip  # If NAT/LAN
ENABLE_HSTS=1  # Security header

# REQUIRED: Generate strong passwords (these are auto-generated if not set)
# JICOFO_AUTH_PASSWORD=$(openssl rand -hex 16)
# JVB_AUTH_PASSWORD=$(openssl rand -hex 16)
# JIGASI_XMPP_PASSWORD=$(openssl rand -hex 16)
# JIBRI_RECORDER_PASSWORD=$(openssl rand -hex 16)
# JIBRI_XMPP_PASSWORD=$(openssl rand -hex 16)
```

**Note**: Replace `meet.yourdomain.com` with your actual domain and `your.public.ip` with your server's public IP address if behind NAT/LAN.

**Generate Passwords**:

After editing your `.env` file, run the password generation script:

```bash
# Generate passwords and back up .env as .env.bak
./gen-passwords.sh
```

This script will:
- Generate secure random passwords for all required services
- Add them to your `.env` file
- Create a backup of your original `.env` file as `.env.bak`

### 5. Configure SSL Certificates

**Option A: Let's Encrypt (Recommended for Production)**

The Let's Encrypt configuration is already included in the `.env` file above. Make sure:
- `ENABLE_LETSENCRYPT=1`
- `LETSENCRYPT_DOMAIN` matches your domain
- `LETSENCRYPT_EMAIL` is a valid email address
- `ENABLE_HTTP_REDIRECT=1` to automatically redirect HTTP to HTTPS

**Option B: Custom Certificates**

Place your certificates in:
- `~/.jitsi-meet-cfg/web/keys/cert.crt`
- `~/.jitsi-meet-cfg/web/keys/cert.key`

### 6. Start Jitsi Meet

```bash
cd ~/jitsi-meet
docker-compose up -d
```

### 7. Verify Installation

Check container status:
```bash
docker-compose ps
```

All containers should show "Up" status.

Access your Jitsi instance at: `https://meet.yourdomain.com`

## Configuration for Production

### Enable TURN Server (for NAT traversal)

Edit `.env`:

```bash
# TURN server configuration
TURN_CREDENTIALS=myturnsecret
TURN_HOST=turn.yourdomain.com
TURN_PORT=443
TURNS_HOST=turn.yourdomain.com
TURNS_PORT=5349
```

### Optimize Video Quality

Edit `~/.jitsi-meet-cfg/web/config.js`:

```javascript
// Video constraints
var config = {
    constraints: {
        video: {
            height: {
                ideal: 720,
                max: 1080,
                min: 240
            }
        }
    },
    // Enable simulcast for better performance
    enableLayerSuspension: true,
    // Set default video quality
    videoQuality: {
        maxBitratesVideo: {
            low: 200000,
            standard: 500000,
            high: 1500000
        }
    },
    // Mobile optimization
    disableAudioLevels: false,
    enableNoAudioDetection: true,
    enableNoisyMicDetection: true,
};
```

### Configure Room Persistence

Edit `~/.jitsi-meet-cfg/prosody/prosody.cfg.lua`:

```lua
-- Enable room persistence
muc_mapper_domain_base = "meet.yourdomain.com";
muc_mapper_domain_prefix = "muc";

-- Disable room cleanup (keep rooms alive)
component "conference.meet.yourdomain.com" "muc"
    storage = "memory"
    modules_enabled = {
        "muc_meeting_id";
        "muc_domain_mapper";
        "polls";
    }
    admins = { "focus@auth.meet.yourdomain.com" }
    muc_room_locking = false
    muc_room_default_public_jids = true
```

### Enable Recording (Jibri)

1. Install additional dependencies:
```bash
# Add Chrome repository
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
sudo apt update
sudo apt install google-chrome-stable -y
```

2. Enable Jibri in `.env`:
```bash
ENABLE_RECORDING=1
```

3. Restart services:
```bash
docker-compose restart
```

## Mobile Optimization

Add to `~/.jitsi-meet-cfg/web/config.js`:

```javascript
// Mobile specific settings
disableDeepLinking: false,
enableWelcomePage: false,
enableClosePage: false,
startAudioOnly: false,
startWithAudioMuted: false,
startWithVideoMuted: false,

// Mobile constraints
constraints: {
    video: {
        aspectRatio: 16 / 9,
        height: {
            ideal: 720,
            max: 1080,
            min: 180
        },
        width: {
            ideal: 1280,
            max: 1920,
            min: 320
        }
    }
},
```

## Maintenance

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web
docker-compose logs -f jvb
```

### Restart Services
```bash
docker-compose restart
```

### Update Jitsi
```bash
docker-compose pull
docker-compose up -d
```

### Backup Configuration
```bash
tar -czf jitsi-backup-$(date +%Y%m%d).tar.gz ~/.jitsi-meet-cfg/
```

## Firewall Configuration

### UFW (Ubuntu)
```bash
sudo ufw allow 80/tcp   # HTTP (for SSL)
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 4443/tcp # Jitsi web
sudo ufw allow 10000/udp # Video bridge
sudo ufw allow 3478/udp  # STUN/TURN
sudo ufw allow 5349/tcp  # TURN over TLS
sudo ufw enable
```

### iptables
```bash
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT    # HTTP
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT     # HTTPS
sudo iptables -A INPUT -p tcp --dport 4443 -j ACCEPT   # Jitsi web
sudo iptables -A INPUT -p udp --dport 10000 -j ACCEPT  # Video bridge
sudo iptables -A INPUT -p udp --dport 3478 -j ACCEPT   # STUN/TURN
sudo iptables -A INPUT -p tcp --dport 5349 -j ACCEPT   # TURN over TLS
```

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker-compose logs

# Remove and recreate
docker-compose down
docker-compose up -d
```

### No Audio/Video
- Check firewall allows UDP port 10000
- Verify TURN server is configured
- Check browser console for errors

### High CPU Usage
- Reduce video quality in config.js
- Enable simulcast
- Increase server resources

### SSL Certificate Issues
```bash
# Renew Let's Encrypt certificate
docker-compose exec web certbot renew

# Check certificate expiry
docker-compose exec web certbot certificates
```

## Performance Tuning

### For 50+ Concurrent Users

Edit `.env`:
```bash
# JVB tuning
JVB_OPTS=--apis=rest,xmpp
JVB_BREWERY_MUC=JvbBrewery
JVB_ENABLE_APIS=rest,xmpp
COLIBRI_REST_ENABLED=true

# Increase JVB memory
JAVA_SYS_PROPS=-Xmx4096m
```

### For 100+ Concurrent Users
- Use multiple JVB instances (load balancing)
- Deploy on dedicated server with 16GB+ RAM
- Use CDN for static assets
- Enable recording to separate server

## Security Best Practices

1. **Enable Authentication**:
```bash
ENABLE_AUTH=1
ENABLE_GUESTS=0
```

2. **Restrict Room Creation**:
- Only authenticated users can create rooms
- Set up user accounts via Prosody

3. **Enable Lobby Mode**:
```javascript
// In config.js
enableLobbyChat: true,
```

4. **Regular Updates**:
```bash
docker-compose pull
docker-compose up -d
```

## Integration with Your App

Once your Jitsi server is running, integrate it into your React app:

1. Set the Jitsi domain in your `.env`:
```bash
VITE_JITSI_DOMAIN=meet.yourdomain.com
```

2. Use the JitsiRoom component (created separately)

3. Create persistent rooms in your database with custom URLs

## Cost Estimates

### Self-Hosted (Monthly)

- **Small (10-25 users)**: $20-40
  - 4GB RAM, 2 CPU VPS (DigitalOcean, Linode)
  
- **Medium (50-100 users)**: $80-120
  - 8GB RAM, 4 CPU VPS
  
- **Large (200+ users)**: $200-400+
  - 16GB+ RAM, 8+ CPU
  - Multiple JVB instances
  - Dedicated TURN server

### Bandwidth
- ~1-2 Mbps per video participant
- Plan for 2-3x peak concurrent users

## Support Resources

- [Official Jitsi Documentation](https://jitsi.github.io/handbook/)
- [Jitsi Community Forum](https://community.jitsi.org/)
- [Docker Hub - Jitsi](https://hub.docker.com/u/jitsi)
- [GitHub - Jitsi Meet](https://github.com/jitsi/jitsi-meet)

## Next Steps

After setup:
1. Test room creation and joining
2. Test on mobile devices
3. Configure branding (logo, colors)
4. Set up monitoring (Prometheus/Grafana)
5. Configure backups
6. Set up CDN for static assets
7. Integrate with your app's authentication system
