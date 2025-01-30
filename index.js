import cap from 'cap';
import os from 'os';
import fs from 'fs';
import { EventEmitter } from 'events';
import chalk from 'chalk';
import boxen from 'boxen';

const { Cap, decoders } = cap;
const { PROTOCOL } = decoders;

// Helper function to decode bencoded data
function decodeBencoded(data) {
  let index = 0;
  function parse() {
    if (index >= data.length) {
      throw new Error('Unexpected end of data while decoding bencoded data.');
    }
    if (data[index] === 100) { // 'd' for dictionary
      index++;
      const dict = {};
      while (data[index] !== 101) { // 'e' ends the dictionary
        const key = parse();
        const value = parse();
        dict[key] = value;
      }
      index++;
      return dict;
    } else if (data[index] === 108) { // 'l' for list
      index++;
      const list = [];
      while (data[index] !== 101) { // 'e' ends the list
        list.push(parse());
      }
      index++;
      return list;
    } else if (data[index] === 105) { // 'i' for integer
      index++;
      const end = data.indexOf(101, index);
      const num = parseInt(data.toString('utf8', index, end), 10);
      index = end + 1;
      return num;
    } else if (data[index] >= 48 && data[index] <= 57) { // '0-9' for string length
      const colon = data.indexOf(58, index);
      const length = parseInt(data.toString('utf8', index, colon), 10);
      index = colon + 1;
      const str = data.slice(index, index + length); // Keep as Buffer for proper `yourip` handling
      index += length;
      return str;
    } else {
      throw new Error(`Invalid bencoded data at index ${index}: ${data[index]}`);
    }
  }
  return parse();
}

// Helper function to parse binary IPv4 address
function parseIPv4Address(buffer) {
  return buffer.length === 4 ? `${buffer[0]}.${buffer[1]}.${buffer[2]}.${buffer[3]}` : `Invalid IP (${buffer.toString('hex')})`;
}

// Helper function to find the network interface
function getNetworkDevice() {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  throw new Error('No suitable network device found.');
}

class TorrentSniffer extends EventEmitter {
    constructor(interfaceName = null, logFilePath = null, silent = false) {
      super();
      this.cap = new Cap();
      this.interfaceName = interfaceName;
      this.logFilePath = logFilePath;
      this.silent = silent; // Suppress output when enabled
    }
  
    logData(data, isError = false) {
      if (this.silent && !isError) return; // Suppress non-error output
  
      if (this.logFilePath) {
        fs.appendFile(this.logFilePath, data + '\n', (err) => {
          if (err) console.error(chalk.red('Error writing to log file:'), err);
        });
      } else {
        console.log(
          boxen(data, { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'green' })
        );
      }
    }
  
    parseAnnounceMessage(data, source, destination) {
      const protocolLength = data.readUInt8(0);
      const protocol = data.slice(1, 1 + protocolLength).toString('utf8');
      if (protocol === 'BitTorrent protocol') {
        const reservedBytes = data.slice(1 + protocolLength, 1 + protocolLength + 8).toString('hex');
        const infohash = data.slice(1 + protocolLength + 8, 1 + protocolLength + 28).toString('hex');
        const peerId = data.slice(1 + protocolLength + 28, 1 + protocolLength + 48).toString('utf8');
        const remainingData = data.slice(1 + protocolLength + 48);
        let metadata = "N/A in this packet";  // Default if no metadata found
  
        try {
          const bencodeStart = remainingData.indexOf(100);
          if (bencodeStart !== -1) {
            metadata = decodeBencoded(remainingData.slice(bencodeStart));
  
            // Handle `yourip` correctly
            if (metadata.yourip) {
              if (Buffer.isBuffer(metadata.yourip) && metadata.yourip.length === 4) {
                metadata.yourip = parseIPv4Address(metadata.yourip); // Convert binary IP
              } else if (typeof metadata.yourip !== 'string') {
                metadata.yourip = "Invalid yourip format"; // Mark as invalid if incorrect
              }
            }
          }
        } catch (error) {
          this.logData(chalk.red('Failed to decode Announce Metadata: ') + error.message, true);
        }
  
        // Emit an event with structured data
        this.emit('announce', {
          infohash,
          peerId,
          source,
          destination,
          reservedBytes,
          metadata
        });
  
        const logEntry = `
  ${chalk.bold.green('🎯 BitTorrent Announce Detected')}
  ${chalk.blue('🔗 Infohash')}: ${infohash}
  ${chalk.yellow('👤 Peer ID')}: ${peerId}
  ${chalk.magenta('📡 Source')}: ${source.ip}:${source.port}  →  ${chalk.magenta('Destination')}: ${destination.ip}:${destination.port}
  ${chalk.cyan('🛠 Reserved Bytes')}: ${reservedBytes}
  ${chalk.green('📊 Metadata')}: ${typeof metadata === "object" ? JSON.stringify(metadata, null, 2) : metadata}`;
          
        this.logData(logEntry);
      }
    }

  startListening() {
    try {
      const localIp = this.interfaceName || getNetworkDevice();
      const device = Cap.findDevice(localIp);
      if (!device) throw new Error('No device found for IP address: ' + localIp);
      
      this.logData(chalk.green(`🚀 Using device: ${device}`));
      
      const filter = 'ip';
      const bufSize = 64 * 1024;
      const buffer = Buffer.alloc(65535);
      const linkType = this.cap.open(device, filter, bufSize, buffer);
      this.cap.setMinBytes && this.cap.setMinBytes(0);
      this.logData(chalk.blue('📡 Listening for BitTorrent traffic...'));

      this.cap.on('packet', () => {
        if (linkType === 'ETHERNET') {
          const ret = decoders.Ethernet(buffer);
          if (ret.info.type === PROTOCOL.ETHERNET.IPV4) {
            const ipv4 = decoders.IPV4(buffer, ret.offset);
            if ([PROTOCOL.IP.TCP, PROTOCOL.IP.UDP].includes(ipv4.info.protocol)) {
              const transport = ipv4.info.protocol === PROTOCOL.IP.TCP ? decoders.TCP(buffer, ipv4.offset) : decoders.UDP(buffer, ipv4.offset);
              const dataStart = transport.offset;
              const dataLength = ipv4.info.totallen - ipv4.hdrlen - transport.hdrlen;
              if (dataLength > 0) {
                this.parseAnnounceMessage(buffer.slice(dataStart, dataStart + dataLength), { ip: ipv4.info.srcaddr, port: transport.info.srcport }, { ip: ipv4.info.dstaddr, port: transport.info.dstport });
              }
            }
          }
        }
      });
    } catch (error) {
      this.logData(chalk.red('❌ Error: ') + error.message, true);
    }
  }

  stopListening() {
    this.cap.close();
    this.logData(chalk.yellow('🛑 Stopped listening for BitTorrent traffic.'));
  }
}

export default TorrentSniffer;
