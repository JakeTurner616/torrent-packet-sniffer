# 👃 Torrent Packet Sniffer

**Torrent Packet Sniffer** captures BitTorrent announce messages on your local network.

---

## Features

- **Real-time BitTorrent announce message detection**
- **Extracts infohash, peer IP, port, and metadata**
- **Command-line interface (CLI) and modular API support**
- **Silent mode for fully customizable logging**
- **Works on Linux, macOS, and Windows (Administrator privileges required on Windows)**

---

## Installation

### **1️⃣ Clone and Install Locally**
```sh
git clone https://github.com/JakeTurner616/torrent-packet-sniffer
cd torrent-packet-sniffer
npm install
```

### **2️⃣ Install as a Global CLI Tool**
To enable global execution from the terminal:
```sh
npm install -g .
```

Now you can start the sniffer using:
```sh
torrent-packet-sniffer
```

Alternatively, run the script directly:
```sh
node cli.js
```

---

## 🖥️ Command-Line Usage

### **Basic Usage**
```sh
torrent-packet-sniffer
```
Press **CTRL+C** to stop.

### **Available Options**
| Option         | Alias | Description                                      | Optional |
|---------------|-------|--------------------------------------------------|----------|
| `--interface` | `-i`  | Specify the network interface to listen on      | Yes      |
| `--duration`  | `-d`  | Duration in seconds before stopping automatically | Yes      |
| `--log`       | `-l`  | Specify a log file to write output              | Yes      |
| `--silent`    | `-s`  | Suppress all console output (for custom handling) | Yes      |

### **Example Usage**
```sh
torrent-packet-sniffer --interface eth0 --duration 60 --log sniff.log
```

### **Sample Output**
```
🎯 BitTorrent Announce Detected
🔗 Infohash: dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c
👤 Peer ID: -qB1234-abcdefghijkl
📡 Source: 94.137.94.8:44957 -> Destination: 10.0.0.161:17571
🛠 Reserved Bytes: 0000000000100005
📊 Metadata: {
  "complete_ago": 44,
  "m": {
    "lt_donthave": 7,
    "share_mode": 8,
    "upload_only": 3,
    "ut_holepunch": 4,
    "ut_metadata": 2,
    "ut_pex": 1
  },
  "metadata_size": 21307,
  "reqq": 2000,
  "upload_only": 1,
  "v": "qBittorrent/5.0.3",
  "yourip": "76.25.123.456"
}
```

---

## Using as a Node.js Module

### **1️⃣ Install as module**
```sh
npm install https://github.com/JakeTurner616/torrent-packet-sniffer
```

### **2️⃣ Import and Use**


```javascript
import TorrentSniffer from 'torrent-packet-sniffer';

// Initialize sniffer (silent mode enabled for custom logging)
const sniffer = new TorrentSniffer(null, null, true);

sniffer.on('announce', (data) => {
  console.log('🎯 BitTorrent Announce Detected');
  console.log('🔗 Infohash:', data.infohash);
  console.log('👤 Peer ID:', data.peerId);
  console.log('📡 Source:', `${data.source.ip}:${data.source.port}`);
  console.log('📡 Destination:', `${data.destination.ip}:${data.destination.port}`);

});

console.log('Starting Torrent Sniffer...');
sniffer.startListening();

// Stop after 30 seconds
setTimeout(() => {
  console.log('Stopping Torrent Sniffer...');
  sniffer.stopListening();
}, 30000);
```

Run the script:
```sh
node sniff.js
```

### **Example Output (Custom Logging)**
```
🎯 BitTorrent Announce Detected
🔗 Infohash: a3e2b4567cf934f5e8731d28d8f9a5bc9d1f75a2
👤 Peer ID: -qB5030-abcd1234efgh
📡 Source: 192.168.1.150:51413
📡 Destination: 10.0.0.100:6881
✅ Stopped listening after 30 seconds.
```

---


### **Enable Silent Mode**
```javascript
const sniffer = new TorrentSniffer(null, null, true); // Silent mode enabled
```


---

## Uninstall
To remove:
```sh
npm uninstall -g torrent-packet-sniffer
```



