/* Compare committed evidence with the original local bytes; never evaluate JS. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { sourceSelections } = require('./source-review-specs');
function verify(index, sourceDirectory) {
  const sha = value => crypto.createHash('sha256').update(value).digest('hex');
  const files = new Map(sourceSelections.map(([id, filename]) => [id, filename]));
  let excerpts = 0;
  for (const source of index.sources) {
    const bytes = fs.readFileSync(path.join(sourceDirectory, files.get(source.id)));
    if (bytes.length !== source.bytes || sha(bytes) !== source.sha256) throw new Error(`${source.id}: resource digest mismatch`);
    const text = bytes.toString('utf8');
    for (const excerpt of source.excerpts) {
      const actual = text.slice(excerpt.start, excerpt.end);
      if (actual !== excerpt.text || sha(actual) !== excerpt.sha256) throw new Error(`${source.id}: excerpt mismatch`);
      excerpts += 1;
    }
  }
  return { sources: index.sources.length, excerpts, errors: 0, applicationWrites: 0 };
}
if (require.main === module) {
  const argument = process.argv.indexOf('--source-dir');
  if (argument < 0 || !process.argv[argument + 1]) throw new Error('offline source directory required');
  const index = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'doc', 'requirements', 'evidence', 'source-review-20261023', 'index.json'), 'utf8'));
  console.log(JSON.stringify(verify(index, path.resolve(process.argv[argument + 1]))));
}
module.exports = { verify };
