// Import the TorrentSniffer module
import TorrentSniffer from '../index.js';

// Enable silent mode to suppress built-in logging (so we control all output)
const sniffer = new TorrentSniffer(null, null, true); // Silent mode enabled

// ─────────────────────────────────────────────────────────────────────
//   EVENT LISTENER: Handle detected BitTorrent announce messages
//   We manually log each captured announce message, despite silent mode
// ─────────────────────────────────────────────────────────────────────
sniffer.on('announce', (data) => {
    // Custom formatted log output (no chalk, just plain text)
    const formattedOutput = `
BitTorrent Announce Detected
───────────────────────────────────────────────
Infohash: ${data.infohash}
Peer ID: ${data.peerId}
Source: ${data.source.ip}:${data.source.port}  
Destination: ${data.destination.ip}:${data.destination.port}
Reserved Bytes: ${data.reservedBytes}
Metadata: ${typeof data.metadata === "object" ? JSON.stringify(data.metadata, null, 2) : data.metadata}
`;

    // Print captured data (silent mode only suppresses internal logs)
    console.log(formattedOutput);



});

// ─────────────────────────────────────────────────────────────────────
//   START LISTENING FOR BITTORRENT TRAFFIC
//   The module handles networking, so we control how we log the data
// ─────────────────────────────────────────────────────────────────────
console.log('Starting Torrent Sniffer...');
sniffer.startListening();

// ─────────────────────────────────────────────────────────────────────
//   STOP LISTENING AFTER 60 SECONDS (Optional)
//   Allows automatic stop after 1 minute, useful for scheduled scans
// ─────────────────────────────────────────────────────────────────────
setTimeout(() => {
    console.log('Stopping Torrent Sniffer...');
    sniffer.stopListening();
}, 60000);  // Stop after 60 seconds
