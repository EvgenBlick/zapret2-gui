/**
 * scripts/convert-all-presets.js
 * Reads all 21 preset .bat files from C:\Users\admin\Desktop\zapret-discord-youtube-1.10.0
 * Converts them into valid zapret2 (winws2) command profiles,
 * and updates main.js DEFAULT_CONFIG.profiles & CANDIDATES list.
 */
const fs = require('fs');
const path = require('path');

const PRESETS_DIR = 'C:\\Users\\admin\\Desktop\\zapret-discord-youtube-1.10.0';
const MAIN_JS_PATH = path.join(__dirname, '..', 'src', 'main.js');

if (!fs.existsSync(PRESETS_DIR)) {
  console.error('Presets directory not found:', PRESETS_DIR);
  process.exit(1);
}

const batFiles = fs.readdirSync(PRESETS_DIR).filter(f => f.endsWith('.bat') && f !== 'service.bat');

console.log(`Found ${batFiles.length} preset files.`);

function parseBatToZapret2(fileContent) {
  const lines = fileContent.split('\n');
  const startIdx = lines.findIndex(l => l.includes('winws.exe'));
  if (startIdx < 0) return null;

  let rawCmdParts = [];
  for (let i = startIdx; i < lines.length; i++) {
    let l = lines[i].trim();
    if (!l) break;
    rawCmdParts.push(l);
    if (!l.endsWith('^')) break;
  }

  let raw = rawCmdParts.join(' ').replace(/\^/g, '').replace(/\s+/g, ' ');

  // Extract base ports
  let tcpPorts = (raw.match(/--wf-tcp=([^\s]+)/) || [])[1] || '80,443';
  let udpPorts = (raw.match(/--wf-udp=([^\s]+)/) || [])[1] || '443,50000-65535';

  tcpPorts = tcpPorts.replace(/%GameFilterTCP%/g, '27015-27050');
  udpPorts = udpPorts.replace(/%GameFilterUDP%/g, '27015-27050');

  let profilesSections = raw.split('--new').map(s => s.trim()).filter(Boolean);

  let z2Sections = profilesSections.map((sec, i) => {
    let mode    = (sec.match(/--dpi-desync=([^\s]+)/) || [])[1] || 'fake';
    let repeats = (sec.match(/--dpi-desync-repeats=(\d+)/) || [])[1];
    let seqovl  = (sec.match(/--dpi-desync-split-seqovl=(\d+)/) || [])[1];
    let pos     = (sec.match(/--dpi-desync-split-pos=([^\s]+)/) || [])[1];

    let luaMods = [];
    if (repeats) luaMods.push('repeats=' + repeats);
    if (seqovl)  luaMods.push('seqovl=' + seqovl);
    if (pos)     luaMods.push('pos=' + pos);
    if (sec.includes('--dpi-desync-fooling=ts')) luaMods.push('tcp_ts_up');
    if (sec.includes('--dpi-desync-fooling=badseq')) luaMods.push('tcp_seq=-10000:tcp_ack=-66000');
    if (sec.includes('www_google_com') || sec.includes('google')) luaMods.push('tls_mod=rnd,dupsid,sni=www.google.com');

    // Build filter section
    let filterPort = (sec.match(/--filter-(tcp|udp)=([^\s]+)/) || [])[0] || (i === 0 ? `--filter-tcp=443` : '');
    let filterL7   = (sec.match(/--filter-l7=([^\s]+)/) || [])[0] || '';

    let outRange = '--out-range=-d10';
    let payload  = sec.includes('http') ? '--payload=http_req' : (sec.includes('udp') ? '--payload=quic_initial' : '--payload=tls_client_hello');

    let luaStr = '';
    if (mode.includes('fake')) {
      let blobName = sec.includes('http') ? 'fake_default_http' : (sec.includes('udp') ? 'fake_default_quic' : 'fake_default_tls');
      luaStr += `--lua-desync=fake:blob=${blobName}` + (luaMods.length ? ':' + luaMods.join(':') : '');
    }
    if (mode.includes('split') || mode.includes('multisplit')) {
      if (luaStr) luaStr += ' ';
      luaStr += `--lua-desync=multisplit` + (pos ? `:pos=${pos}` : ':pos=1,midsld') + (seqovl ? `:seqovl=${seqovl}` : '');
    } else if (mode.includes('disorder') || mode.includes('multidisorder')) {
      if (luaStr) luaStr += ' ';
      luaStr += `--lua-desync=multidisorder` + (pos ? `:pos=${pos}` : ':pos=1,midsld');
    }

    return `${filterPort} ${filterL7} ${outRange} ${payload} ${luaStr}`.replace(/\s+/g, ' ').trim();
  });

  let baseWf = `--wf-tcp-out=${tcpPorts} --wf-udp-out=${udpPorts}`;
  return `${baseWf} --new ${z2Sections.join(' --new ')}`;
}

const colorPalette = [
  '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4',
  '#ef4444', '#14b8a6', '#6366f1', '#a855f7', '#d97706', '#0284c7'
];

const parsedProfiles = {};

batFiles.forEach((file, idx) => {
  const content = fs.readFileSync(path.join(PRESETS_DIR, file), 'utf8');
  const z2Cmd = parseBatToZapret2(content);
  if (z2Cmd) {
    const key = file.replace('.bat', '').replace(/[() ]+/g, '_').toLowerCase();
    const title = file.replace('.bat', '');
    parsedProfiles[key] = {
      name: `⭐ ${title}`,
      args: z2Cmd,
      luaInit: '@zapret-antidpi.lua',
      color: colorPalette[idx % colorPalette.length]
    };
  }
});

console.log(`Successfully converted ${Object.keys(parsedProfiles).length} profiles.`);

// Read main.js and inject profiles
let mainJs = fs.readFileSync(MAIN_JS_PATH, 'utf8');

// Replace DEFAULT_CONFIG.profiles object
const profilesJson = JSON.stringify(parsedProfiles, null, 4);

mainJs = mainJs.replace(/profiles:\s*\{[\s\S]*?\n  \}/, `profiles: ${profilesJson}`);

// Build CANDIDATES list for auto scanner
const candidatesList = Object.values(parsedProfiles).map(p => ({ name: p.name, args: p.args }));
const candidatesJson = JSON.stringify(candidatesList, null, 4);

mainJs = mainJs.replace(/const CANDIDATES = \[[\s\S]*?\];/, `const CANDIDATES = ${candidatesJson};`);

fs.writeFileSync(MAIN_JS_PATH, mainJs, 'utf8');

console.log('Successfully updated main.js with ALL 21 profiles!');
