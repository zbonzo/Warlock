# Mobile Device Setup Guide

## Steps to Connect from External Devices (Phone, Tablet, etc.)

### 1. Find Your Computer's Local IP Address

**On Linux/Mac:**
```bash
hostname -I
# or
ip addr show | grep inet
```

**On Windows:**
```cmd
ipconfig
```

Look for your IPv4 address (usually something like `192.168.1.XXX` or `10.0.0.XXX`)

### 2. Start the Development Server

```bash
cd /home/zac/warlock/Warlock
npm run dev
```

### 3. Access from Mobile Device

1. Make sure your mobile device is on the **same WiFi network** as your computer
2. Open your mobile browser
3. Navigate to: `http://YOUR_COMPUTER_IP:3000`
   - Example: `http://192.168.1.100:3000`

### 4. Firewall Configuration (if needed)

If you still get "Network Error", you may need to open the ports:

**Linux (Ubuntu/Debian):**
```bash
sudo ufw allow 3000/tcp  # Client port
sudo ufw allow 3001/tcp  # Server port
```

**Windows:**
- Open Windows Defender Firewall
- Click "Allow an app or feature"
- Add Node.js and allow both private and public networks

**Mac:**
- System Preferences → Security & Privacy → Firewall
- Click "Firewall Options"
- Add Node.js to allowed applications

### 5. Alternative: Use ngrok for Testing

If firewall issues persist, use ngrok to create a public tunnel:

```bash
# Install ngrok
npm install -g ngrok

# In one terminal, start your dev server
npm run dev

# In another terminal, create tunnels
ngrok http 3000  # For the client
# Note the HTTPS URL (e.g., https://abc123.ngrok.io)

# In a third terminal
ngrok http 3001  # For the server
# Note this URL too
```

Then set the environment variable before starting the client:
```bash
REACT_APP_API_URL=https://YOUR_NGROK_SERVER_URL.ngrok.io/api npm start --workspace=client
```

### Troubleshooting

1. **"Network Error" still appears:**
   - Verify both devices are on the same network
   - Check firewall settings
   - Try temporarily disabling firewall to test
   - Make sure server is running (`npm run dev`)

2. **Can access site but game won't work:**
   - Check browser console for errors
   - Ensure WebSocket connections are allowed
   - Try using HTTP instead of HTTPS

3. **Connection refused:**
   - Server might not be running
   - Wrong IP address
   - Firewall blocking the connection

### Production Deployment

For actual production use, consider:
- Using a proper domain name
- HTTPS certificates (Let's Encrypt)
- Reverse proxy (nginx)
- Cloud hosting (AWS, DigitalOcean, etc.)