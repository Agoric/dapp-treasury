/* global process, require, module */
// @ts-check
const patch = {
  target: '<link name="unprocessed-script" content="lockdown.umd.js"/>',
  replacement: `
    <script src="lockdown.umd.js"></script>
    <script>
    const { pow: mathPow } = Math;
    Math.pow = (base, exp) => (typeof base === 'bigint' && typeof exp ==='bigint') ? base ** exp : mathPow(base, exp);
    lockdown({ __allowUnsafeMonkeyPatching__: 'unsafe', errorTaming: 'unsafe', overrideTaming: 'severe' });
    console.log("lockdown done.");
    </script>
    `,
};

/**
 *
 * @param {string[]} args
 * @param {{
 *   readFile: typeof import('fs').promises.readFile,
 *   writeFile: typeof import('fs').promises.writeFile,
 * }} io
 */
async function main(args, { readFile, writeFile }) {
  const [filename] = args;
  const original = await readFile(filename, 'utf-8');
  if (original.indexOf(patch.target) < 0) {
    throw Error('target not found');
  }
  const patched = original.replace(patch.target, patch.replacement);
  await writeFile(filename, patched);
}

if (require.main === module) {
  // eslint-disable-next-line global-require
  main(process.argv.slice(2), require('fs').promises).catch(err =>
    console.error(err),
  );
}
