require('dotenv').config({ override: true });

const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log('\n🚀 Nomina Release Tool');
console.log('────────────────────────');
console.log(`Current version: ${pkg.version}`);

rl.question('New version (e.g. 1.1.0): ', (version) => {
  version = version.trim();

  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
    console.error('❌ Invalid version format. Use x.y.z (e.g. 1.1.0)');
    rl.close();
    process.exit(1);
  }

  rl.question('Describe what changed (for commit message): ', (desc) => {
    desc = desc.trim() || 'update';

    // ── Open Notepad for patch notes ─────────────────────────────────────────
    const tmpFile = path.join(os.tmpdir(), `nomina-notes-v${version}.txt`);
    const template = [
      `# Patch notes for v${version} — delete these lines before saving`,
      `# Prefix each note with +new, +improved, or +fixed`,
      `#`,
      `# Examples:`,
      `#   +new Added file preview panel`,
      `#   +improved Faster PDF extraction`,
      `#   +fixed Crash when keyword not found`,
      `# ──────────────────────────────────────────────────────────────`,
      ``
    ].join('\n');

    fs.writeFileSync(tmpFile, template, 'utf8');
    console.log('\n📝 Notepad is opening — write your patch notes, save, and close it...');

    try {
      execSync(`notepad.exe "${tmpFile}"`, { stdio: 'inherit' });
    } catch (e) { /* Notepad sometimes exits non-zero, safe to ignore */ }

    const raw = fs.existsSync(tmpFile) ? fs.readFileSync(tmpFile, 'utf8') : '';
    try { fs.unlinkSync(tmpFile); } catch (e) { }

    const notes = raw
      .split('\n')
      .filter(l => !l.trim().startsWith('#'))
      .join('\n')
      .trim() || desc;

    if (notes === desc) {
      console.log('⚠  No patch notes entered — using commit message as fallback');
    } else {
      console.log('✓  Patch notes captured');
    }

    rl.close();

    console.log(`\n📦 Releasing v${version} — "${desc}"\n`);

    // Always prefer NOMINA_GH_TOKEN over any system-level GH_TOKEN
    if (process.env.NOMINA_GH_TOKEN) {
      process.env.GH_TOKEN = process.env.NOMINA_GH_TOKEN;
    }

    if (!process.env.GH_TOKEN) {
      console.error('❌ No token found. Set NOMINA_GH_TOKEN in your .env file.');
      process.exit(1);
    }

    try {
      // 1. Update version in package.json
      pkg.version = version;
      fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
      console.log(`✓ Updated package.json to v${version}`);

      // 2. Git add all
      execSync('git add -A', { stdio: 'inherit' });
      console.log('✓ git add -A');

      // 3. Git commit
      const safeDesc = desc.replace(/"/g, '\\"');
      execSync(`git commit -m "v${version} - ${safeDesc}"`, { stdio: 'inherit' });
      console.log('✓ git commit');

      // 4. Git push
      execSync('git push', { stdio: 'inherit' });
      console.log('✓ git push');

      // 5. Build + publish
      console.log('\n🔨 Building and publishing to GitHub...\n');
      execSync('npm run electron:build', {
        stdio: 'inherit',
        env: { ...process.env },
      });

      console.log(`\n✅ v${version} released successfully!`);

      // 6. Clean up old installers from dist/
      cleanupDist(version);

      // 7. Upload patch notes to GitHub release body
      uploadPatchNotes(version, notes);

    } catch (err) {
      console.error('\n❌ Release failed:', err.message);
      process.exit(1);
    }
  });
});

function cleanupDist(newVersion) {
  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) return;

  const newExe = `Nomina Setup ${newVersion}.exe`;
  const newBlockmap = `Nomina Setup ${newVersion}.exe.blockmap`;

  if (!fs.existsSync(path.join(distDir, newExe))) {
    console.log('\n⚠  New installer not found in dist/ — skipping cleanup.');
    return;
  }

  let deleted = 0;
  fs.readdirSync(distDir).forEach(file => {
    const isOldExe = file.endsWith('.exe') && file.startsWith('Nomina Setup') && file !== newExe;
    const isOldBlockmap = file.endsWith('.exe.blockmap') && file.startsWith('Nomina Setup') && file !== newBlockmap;
    if (isOldExe || isOldBlockmap) {
      try {
        fs.unlinkSync(path.join(distDir, file));
        console.log(`🗑  Removed: ${file}`);
        deleted++;
      } catch (e) {
        console.warn(`⚠  Could not remove ${file}: ${e.message}`);
      }
    }
  });

  if (deleted > 0) {
    console.log(`\n✓ Cleaned up ${deleted} old installer file${deleted !== 1 ? 's' : ''} from dist/`);
  } else {
    console.log('\n✓ dist/ already clean — no old installers to remove');
  }
}

function uploadPatchNotes(version, notes) {
  const token = process.env.GH_TOKEN;
  if (!token) { console.log('\n⚠  No GH_TOKEN — patch notes not uploaded'); return; }

  console.log('\n📝 Uploading patch notes to GitHub release...');

  // Use /releases (not /releases/tags/) so we can find draft releases too
  githubRequest('GET', `/repos/vslnnd/Nomina/releases?per_page=10`, token, null, (err, releases) => {
    if (err || !Array.isArray(releases)) {
      console.log('⚠  Could not list GitHub releases — patch notes skipped'); return;
    }
    const release = releases.find(r => r.tag_name === `v${version}`);
    if (!release || !release.id) {
      console.log(`⚠  Could not find release for v${version} — patch notes skipped`); return;
    }
    githubRequest('PATCH', `/repos/vslnnd/Nomina/releases/${release.id}`, token, { body: notes }, (err2) => {
      if (err2) console.log('⚠  Failed to upload patch notes:', err2.message);
      else console.log('✓  Patch notes uploaded to release');
    });
  });
}

function githubRequest(method, endpoint, token, body, cb) {
  const data = body ? JSON.stringify(body) : null;
  const req = https.request({
    hostname: 'api.github.com',
    path: endpoint,
    method,
    headers: {
      'Authorization': `token ${token}`,
      'User-Agent': 'Nomina-Release-Tool',
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
    }
  }, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => { try { cb(null, JSON.parse(raw)); } catch (e) { cb(null, {}); } });
  });
  req.on('error', cb);
  if (data) req.write(data);
  req.end();
}
