#!/usr/bin/env node
/**
 * generate-notices.js (ESM version)
 *
 * Scans all npm dependencies of this project (including transitive ones)
 * and generates a THIRD-PARTY-NOTICES.md file listing each package's
 * name, version, license, and license text/repository link.
 *
 * Usage:
 *   node generate-notices.js
 *
 * Requires: license-checker-rseidelsohn
 *   npm install --save-dev license-checker-rseidelsohn
 *
 * Flags:
 *   --prod-only   Only include production dependencies (default: all)
 *   --out=<path>  Output file path (default: ./THIRD-PARTY-NOTICES.md)
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

// license-checker-rseidelsohn is still published as CommonJS,
// so we bridge it into this ES module via createRequire.
const require = createRequire(import.meta.url);

// ---- Config -----------------------------------------------------------

const args = process.argv.slice(2);
const prodOnly = args.includes('--prod-only');
const outArg = args.find((a) => a.startsWith('--out='));
const outPath = outArg
  ? path.resolve(outArg.split('=')[1])
  : path.join(process.cwd(), 'THIRD-PARTY-NOTICES.md');

// Licenses considered "copyleft" / worth flagging for manual review.
// (Not exhaustive — always double check anything unfamiliar.)
const FLAG_PATTERNS = [/GPL/i, /AGPL/i, /LGPL/i, /CC-BY-SA/i, /EUPL/i, /MPL/i];

// ---- Ensure license-checker-rseidelsohn is available -------------------

function ensureLicenseChecker() {
  try {
    return require('license-checker-rseidelsohn');
  } catch (err) {
    console.error(
      '\n[!] "license-checker-rseidelsohn" is not installed.\n' +
        '    Install it first with:\n\n' +
        '    npm install --save-dev license-checker-rseidelsohn\n'
    );
    process.exit(1);
  }
}

// ---- Main ---------------------------------------------------------------

function main() {
  const checker = ensureLicenseChecker();

  checker.init(
    {
      start: process.cwd(),
      production: prodOnly,
      excludePrivatePackages: true,
    },
    (err, packages) => {
      if (err) {
        console.error('Error while scanning dependencies:', err);
        process.exit(1);
      }

      const selfName = getSelfName();
      const entries = Object.entries(packages)
        .filter(([key]) => !key.startsWith(selfName + '@'))
        .sort(([a], [b]) => a.localeCompare(b));

      const flagged = [];
      const licenseGroups = {};

      for (const [nameVersion, info] of entries) {
        const license = normalizeLicense(info.licenses);
        if (!licenseGroups[license]) licenseGroups[license] = [];
        licenseGroups[license].push({ nameVersion, info });

        if (FLAG_PATTERNS.some((re) => re.test(license))) {
          flagged.push({ nameVersion, license });
        }
      }

      const md = buildMarkdown(licenseGroups, flagged, entries.length);
      fs.writeFileSync(outPath, md, 'utf8');

      console.log(`\n✔ ${entries.length} packages scanned.`);
      console.log(`✔ Written to ${path.relative(process.cwd(), outPath)}`);
      if (flagged.length) {
        console.log(
          `\n⚠ ${flagged.length} package(s) use a license worth a manual look (e.g. copyleft):`
        );
        flagged.forEach((f) => console.log(`   - ${f.nameVersion} (${f.license})`));
      } else {
        console.log('✔ No copyleft-style licenses detected among the flagged patterns.');
      }
    }
  );
}

function getSelfName() {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
    );
    return pkg.name || '';
  } catch {
    return '';
  }
}

function normalizeLicense(licenses) {
  if (!licenses) return 'UNKNOWN';
  if (Array.isArray(licenses)) return licenses.join(' OR ');
  return String(licenses);
}

function buildMarkdown(licenseGroups, flagged, total) {
  const today = new Date().toISOString().split('T')[0];
  const licenseNames = Object.keys(licenseGroups).sort();

  let md = `# Third-Party Notices\n\n`;
  md += `This project includes third-party open-source software. `;
  md += `The following is a list of all direct and transitive npm dependencies `;
  md += `at the time of generation (${today}), grouped by license type.\n\n`;
  md += `Generated automatically with \`generate-notices.js\` (based on `;
  md += `[license-checker-rseidelsohn](https://www.npmjs.com/package/license-checker-rseidelsohn)). `;
  md += `Total packages scanned: **${total}**.\n\n`;

  if (flagged.length) {
    md += `> ⚠ **Note:** The following package(s) use a license type that typically `;
    md += `carries copyleft or attribution obligations beyond a simple notice `;
    md += `(e.g. GPL, LGPL, AGPL, MPL). Review these manually:\n>\n`;
    flagged.forEach((f) => {
      md += `> - \`${f.nameVersion}\` — ${f.license}\n`;
    });
    md += `\n`;
  }

  md += `---\n\n`;
  md += `## Table of Contents\n\n`;
  licenseNames.forEach((license) => {
    const anchor = license.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    md += `- [${license}](#${anchor}) (${licenseGroups[license].length})\n`;
  });
  md += `\n---\n\n`;

  licenseNames.forEach((license) => {
    md += `## ${license}\n\n`;
    licenseGroups[license]
      .sort((a, b) => a.nameVersion.localeCompare(b.nameVersion))
      .forEach(({ nameVersion, info }) => {
        md += `### ${nameVersion}\n\n`;
        if (info.repository) md += `- Repository: ${info.repository}\n`;
        if (info.publisher) md += `- Publisher: ${info.publisher}\n`;
        if (info.url) md += `- URL: ${info.url}\n`;
        if (info.licenseFile) {
          md += `- License file: \`${path.relative(process.cwd(), info.licenseFile)}\`\n`;
        }
        md += `\n`;
      });
  });

  return md;
}

main();
