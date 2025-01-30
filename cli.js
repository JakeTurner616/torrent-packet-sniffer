#!/usr/bin/env node
import TorrentSniffer from './index.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';

// Parse command-line arguments correctly
const argv = yargs(hideBin(process.argv))
  .option('interface', {
    alias: 'i',
    describe: 'Specify the network interface to listen on',
    type: 'string',
  })
  .option('duration', {
    alias: 'd',
    describe: 'Duration in seconds before stopping automatically',
    type: 'number',
  })
  .option('log', {
    alias: 'l',
    describe: 'Specify a log file to write output',
    type: 'string',
  })
  .option('silent', {
    alias: 's',
    describe: 'Suppress all non-error console output',
    type: 'boolean',
    default: false,
  })
  .option('help', {
    alias: 'h',
    describe: 'Show help',
    type: 'boolean',
  })
  .help()
  .argv;

if (argv.help) {
  console.log(`
Usage: torrent-packet-sniffer [options]

Options:
  -i, --interface <name>   Specify the network interface to listen on
  -d, --duration <seconds> Run for a limited duration in seconds
  -l, --log <file>         Write output to a log file
  -s, --silent             Suppress all non-error console output
  -h, --help               Show help
  `);
  process.exit(0);
}

// Pass log file and silent flag to TorrentSniffer
const sniffer = new TorrentSniffer(argv.interface, argv.log, argv.silent);

sniffer.on('announce', (data) => {
  const message = `🎯 BitTorrent Announce Detected from ${data.source.ip}:${data.source.port}\n🔗 Infohash: ${data.infohash}`;

  if (argv.log) {
    fs.appendFile(argv.log, message + '\n', (err) => {
      if (err) console.error('Error writing to log file:', err);
    });
  }

  if (!argv.silent) {
    console.log(message);
  }
});

sniffer.startListening();

if (argv.duration) {
  setTimeout(() => {
    sniffer.stopListening();
    if (!argv.silent) console.log(`✅ Stopped listening after ${argv.duration} seconds.`);
    process.exit(0);
  }, argv.duration * 1000);
}

// Graceful exit handling
process.on('SIGINT', () => {
  sniffer.stopListening();
  process.exit();
});
