# EchoPulse RPi - Rogue Echo & Polar H10 Telemetry Hub

High-contrast real-time telemetry dashboard designed for a **Raspberry Pi 4**, as well as any phone, tablet, or desktop computer connected to the same local network.

---

## 1. Quick Test in Your Browser (Right Now)

The development server is already running!
- **URL**: Check the preview pane or visit the development URL in Chrome or Edge.
- **Test with Simulator**: The app boots with the **Test Simulator** enabled by default. Click **Start Ride** -> choose **Tabata Protocol** or **50 Cal Sprint** to see live watts, cadence, and heart rate telemetry, interval beeps, and real-time graphs.
- **Pair Real Hardware**: Click **Sensors** in the top navigation bar, toggle **Live BLE**, and click **Pair Polar H10** and **Pair Echo Console**.

---

## 2. Running on Your Raspberry Pi 4

### Step A: Prerequisites on Raspberry Pi OS (Bookworm / 64-bit recommended)
Open terminal on your Raspberry Pi:
```bash
# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js (version 20 or higher) and git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git bluetooth bluez

# 3. Verify installation
node -v   # Should show v20.x.x
npm -v
```

### Step B: Copy or Clone the Code to your Pi
```bash
cd /home/pi
# Clone or copy your project folder into /home/pi/echopulse
git clone <your-repo-or-download-zip> echopulse
cd echopulse

# Install dependencies and build
# (Note: An .npmrc file is included with legacy-peer-deps=true for seamless React 19 resolution)
npm install
# Or explicitly if needed: npm install --legacy-peer-deps

npm run build
```

### Step C: Run the Application
To run in development or production mode:
```bash
# Starts the server on port 3000 accessible across your entire local network (0.0.0.0:3000)
npm start
```
You will see:
```text
[EchoPulse] Server running on http://0.0.0.0:3000
```

---

## 3. How to Connect from Mobile Phones & Tablets

1. Make sure your phone/tablet is connected to the same Wi-Fi network as your Raspberry Pi 4.
2. In your Pi's terminal, find its local IP address by typing:
   ```bash
   hostname -I
   # Example output: 192.168.1.140
   ```
3. Open your phone's browser (Safari, Chrome, or Edge) and go to:
   ```text
   http://192.168.1.140:3000
   ```
   *(Or simply scan the QR code displayed under the **"Pi Hub & Mobile QR"** tab on the dashboard!)*
4. Mount your phone on your Rogue Echo bike handlebar mount for live telemetry.

---

## 4. Raspberry Pi Autostart on Boot (Kiosk Mode)

To make your Raspberry Pi 4 boot directly into the EchoPulse HUD in fullscreen (e.g., on a 7" touchscreen or HDMI TV mounted by the bike):

### 1. Enable Node Service to Run in Background:
Create a systemd service file:
```bash
sudo nano /etc/systemd/system/echopulse.service
```
Paste this configuration:
```ini
[Unit]
Description=EchoPulse Telemetry Hub
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/echopulse
ExecStart=/usr/bin/npm start
Restart=always
Environment=NODE_ENV=production PORT=3000

[Install]
WantedBy=multi-user.target
```
Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable echopulse
sudo systemctl start echopulse
```

### 2. Autostart Chromium Fullscreen on Boot:
Edit the LXDE autostart file:
```bash
mkdir -p ~/.config/lxsession/LXDE-pi/
nano ~/.config/lxsession/LXDE-pi/autostart
```
Add these lines:
```bash
@xset s off
@xset -dpms
@xset s noblank
@chromium-browser --noerrdialogs --disable-infobars --kiosk http://localhost:3000
```
Reboot your Pi (`sudo reboot`) to test!

---

## 5. Connecting Your Sensors

### Polar H10 Heart Rate Strap
1. Lightly moisten the rubber electrode pads on the reverse side of the strap.
2. Fasten the strap snugly around your chest just below your chest muscles.
3. Snap the Polar H10 transmitter pod into the strap.
4. On the EchoPulse dashboard, go to **Sensors** -> Click **Pair Polar H10**. Select your device in the Bluetooth pop-up.

### Rogue Echo Bike Console
1. Push pedals or press any button on the console to power it on.
2. Press the **Bluetooth button** on the Rogue Echo console until the Bluetooth symbol begins flashing.
3. On the EchoPulse dashboard, click **Pair Echo Console**. Select your console from the list.
