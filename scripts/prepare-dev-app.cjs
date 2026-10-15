const { cpSync, constants, existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, copyFileSync, statSync } = require('node:fs');
const { dirname, join } = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');

function prepareDevApp({ electronExecutable, outputRoot, icon, sign = bundle => execFileSync('/usr/bin/codesign', ['--force', '--deep', '--sign', '-', bundle], { stdio: 'inherit' }) }) {
  const source = dirname(dirname(dirname(electronExecutable)));
  const bundle = join(outputRoot, 'Swttch.app');
  const executable = join(bundle, 'Contents', 'MacOS', 'Electron');
  const stamp = join(outputRoot, 'stamp');
  const info = readFileSync(join(source, 'Contents', 'Info.plist'), 'utf8');
  const binary = statSync(electronExecutable);
  const digest = createHash('sha256').update(info).update(readFileSync(icon)).update(readFileSync(__filename)).update(`${binary.size}:${binary.mtimeMs}`).digest('hex');
  if (existsSync(executable) && existsSync(stamp) && readFileSync(stamp, 'utf8') === digest) return executable;
  mkdirSync(outputRoot, { recursive: true });
  rmSync(bundle, { recursive: true, force: true });
  // APFS clones avoid duplicating runtime bytes; the installed runtime stays untouched.
  cpSync(source, bundle, { recursive: true, mode: constants.COPYFILE_FICLONE, verbatimSymlinks: true });
  let plist = info;
  for (const [key, value] of Object.entries({ CFBundleName: 'Swttch', CFBundleDisplayName: 'Swttch', CFBundleIdentifier: 'app.swttch.desktop.dev', CFBundleIconFile: 'swttch.icns' })) {
    const property = new RegExp(`(<key>${key}</key>\\s*)<string>[^<]*</string>`);
    plist = property.test(plist) ? plist.replace(property, `$1<string>${value}</string>`) : plist.replace('<dict>', `<dict><key>${key}</key><string>${value}</string>`);
  }
  writeFileSync(join(bundle, 'Contents', 'Info.plist'), plist);
  copyFileSync(icon, join(bundle, 'Contents', 'Resources', 'swttch.icns'));
  sign(bundle);
  writeFileSync(stamp, digest);
  return executable;
}
module.exports = { prepareDevApp };
