// @ts-check

import dappConstants from '../lib/constants.js';

// TODO: Allow multiple brands for tipping.
const { Tip: tipBrandRegKey, Assurance: assuranceBrandRegKey } = dappConstants.brandRegKeys;
const allowedBrandRegKeys = [tipBrandRegKey];

/**
 * @typedef {Object.<string, HTMLOptionElement>} Purse
 * @property {string} issuerPetname
 * @property {string} pursePetname
 * @property {any} extent
 * @property {string} brandRegKey
 */

/**
 * @type {Purse[]}
 */
const tipPurses = [];

/**
 * @type {Purse[]}
 */
const tipIssuers = [];

/**
 * @type {Purse[]}
 */
let intoPurses = [];

/**
 * @type {Purse[]}
 */
const existingIntoPurses = [];

/**
 * @type {Purse[]}
 */
let allPurses = [];

/**
 * Compare two values, much like Perl's cmp operator.
 * 
 * @param {any} a
 * @param {any} b
 * @returns {number} -1, 0, or 1
 */
const cmp = (a, b) => (a < b ? -1 : a === b ? 0 : 1);

/**
 * Adjust the option elements in existing.
 * 
 * @param {string} key
 * @param {Purse[]} existing
 * @param {Purse[]} currents
 * @param {string[]} names
 * @param {Object.<string, HTMLSelectElement>} selects
 */
const updateOptions = (key, existing, currents, names, selects, showBalances = true) => {
  for (const name of names) {
    const children = selects[name].children;
    for (let i = 0; i < children.length; i ++) {
      if (children[i].getAttribute('value') === 'remove()') {
        children[i].remove();
      }
    }
  }

  let i = 0;
  let j = 0;
  while (i < currents.length) {
    const c = j < existing.length ? cmp(currents[i][key], existing[j][key]) : -1;
    if (c > 0) {
      // Have an extra one, so delete.
      for (const name of names) {
        selects[name].removeChild(existing[j][name]);
      }
      existing.splice(j, 1);
    } else {
      const current = currents[i];
      let newText;
      switch (key) {
        case 'pursePetname':
          if (showBalances) {
            newText = `${current[key]} (${current.extent} ${current.issuerPetname})`
          } else {
            newText = `${current[key]}`;
          }
          break;
        default: 
          newText = `${current[key]}`;
      }
      if (c < 0) {
        // Haven't got yet, so insert.
        const value = current[key];
        existing.splice(j, 0, current);
        for (const name of names) {
          const option = document.createElement('option');
          option.setAttribute('value', value);
          existing[j][name] = option;
          if (j + 1 < existing.length) {
            selects[name].insertBefore(existing[j + 1][name], option);
          } else {
            selects[name].append(option);
          }
        }
      }
      // Now have, so update.
      for (const name of names) {
        existing[j][name].innerText = newText;
      }
      i += 1;
      j += 1;
    }
  }

  for (const name of names) {
    selects[name].removeAttribute('disabled');
  }
}

/**
 * Apply the update purses message.
 * 
 * @param {Purse[]} purses
 * @param {Object.<string, HTMLSelectElement>} selects
 */
export function walletUpdatePurses(purses, selects) {
  allPurses = purses.filter(
    ({ brandRegKey }) => !allowedBrandRegKeys || allowedBrandRegKeys.includes(brandRegKey)
  ).sort(({ pursePetname: a }, { pursePetname: b }) => cmp(a, b));

  intoPurses = purses.filter(
    ({ brandRegKey }) => brandRegKey === assuranceBrandRegKey,
  ).sort(({ pursePetname: a }, { pursePetname: b }) => cmp(a, b));

  const newPurses = intoPurses.sort(({ pursePetname: a }, { pursePetname: b}) =>
    cmp(a, b));

  const newIssuers = allPurses.sort(({ issuerPetname: a }, { issuerPetname: b }) =>
    cmp(a, b));

  // Enable the purse list.
  updateOptions('issuerPetname', tipIssuers, newIssuers, ['$brands'], selects);

  flipSelectedBrands(selects);

  updateOptions(
    'pursePetname',
    existingIntoPurses,
    newPurses,
    ['$intoPurse'],
    selects,
    false,
  );
}

/**
 * @param {Object.<string, HTMLSelectElement>} selects
 */
export function flipSelectedBrands(selects) {
  let i = 0;
  while (i < tipPurses.length) {
    const purse = tipPurses[i];
    if (purse.issuerPetname !== selects.$brands.value) {
      // Remove the purse.
      selects.$tipPurse.removeChild(purse.$tipPurse);
      delete purse.$tipPurse;
      tipPurses.splice(i, 1);
    } else {
      i += 1;
    }
  }

  updateOptions(
    'pursePetname',
    tipPurses,
    allPurses.filter(({ issuerPetname }) => issuerPetname === selects.$brands.value),
    ['$tipPurse'],
    selects,
  );
}