// @ts-check
import dappConstants from '../lib/constants.js';
import { connect } from './connect.js';
import { walletUpdatePurses, flipSelectedBrands } from './wallet.js';

const { INSTANCE_REG_KEY } = dappConstants;

/**
 * @type {Object.<string, HTMLSelectElement>}
 */
const selects = {
  $brands: /** @type {HTMLSelectElement} */ (document.getElementById('brands')),
  $tipPurse: /** @type {HTMLSelectElement} */ (document.getElementById('tipPurse')),
  $intoPurse: /** @type {HTMLSelectElement} */ (document.getElementById('intoPurse')),
};

const $forFree = /** @type {HTMLInputElement} */ (document.getElementById('forFree'));
const $forTip = /** @type {HTMLInputElement} */ (document.getElementById('forTip'));
const $encourageForm = /** @type {HTMLFormElement} */ (document.getElementById('encourageForm'));

export default async function main() {
  selects.$brands.addEventListener('change', () => {
    flipSelectedBrands(selects);
  });
  
  /**
   * @param {{ type: string; data: any; walletURL: string }} obj
   */
  const walletRecv = obj => {
    switch (obj.type) {
      case 'walletUpdatePurses': {
        const purses = JSON.parse(obj.data);
        console.log('got purses', purses);
        walletUpdatePurses(purses, selects);
        $inputAmount.removeAttribute('disabled');
        break;
      }
      case 'walletURL': {
       // Change the form action to URL.
       $encourageForm.action = `${obj.walletURL}`;
       break;
      }
    }
  };

  const $numEncouragements = /** @type {HTMLInputElement} */ (document.getElementById('numEncouragements'));
  const $inputAmount = /** @type {HTMLInputElement} */ (document.getElementById('inputAmount'));

  /**
   * @param {{ type: string; data: any; }} obj
   */
  const apiRecv = obj => {
    switch (obj.type) {
      case 'encouragement/getEncouragementResponse':
        alert(`Encourager says: ${obj.data}`);
        break;
      case 'encouragement/encouragedResponse':
        $numEncouragements.innerHTML = obj.data.count;
        break;
    }
  };

  const $encourageMe = /** @type {HTMLInputElement} */ (document.getElementById('encourageMe'));
  
  const walletSend = await connect('wallet', walletRecv).then(walletSend => {
    walletSend({ type: 'walletGetPurses'});
    return walletSend;
  });

  const apiSend = await connect('api', apiRecv).then(apiSend => {
    apiSend({
      type: 'encouragement/subscribeNotifications',
    });

    $encourageMe.removeAttribute('disabled');
    $encourageMe.addEventListener('click', () => {
      if ($forFree.checked) {
        $encourageForm.target = '';
        apiSend({
          type: 'encouragement/getEncouragement',
        });
      }
      if ($forTip.checked) {
        $encourageForm.target = 'wallet';

        let optWant = {};
        const intoPurse = selects.$intoPurse.value;
        if (intoPurse && intoPurse !== 'remove()') {
          optWant = {
            want: {
              Assurance: {
                pursePetname: intoPurse,
                extent: [],
              },
            },
          };
        }

        const now = Date.now();
        const offer = {
          // JSONable ID for this offer.  This is scoped to the origin.
          id: now,
      
          // Contract-specific metadata.
          instanceRegKey: INSTANCE_REG_KEY,
      
          // Format is:
          //   hooks[targetName][hookName] = [hookMethod, ...hookArgs].
          // Then is called within the wallet as:
          //   E(target)[hookMethod](...hookArgs)
          hooks: {
            publicAPI: {
              getInvite: ['makeInvite'], // E(publicAPI).makeInvite()
            },
          },
      
          proposalTemplate: {
            give: {
              Tip: {
                // The pursePetname identifies which purse we want to use
                pursePetname: selects.$tipPurse.value,
                extent: Number($inputAmount.value),
              },
            },
            ...optWant,
            exit: { onDemand: null },
          },
        };
        walletSend({
          type: 'walletAddOffer',
          data: offer
        });
        alert('Please approve your tip, then close the wallet.')
      }
    });
    
    return apiSend;
  });
}

main();
