// @ts-check
import { rpc } from '../lib/socket.js';
import { activateSocket as startApi, deactivateSocket as stopApi } from '../lib/api-client.js';
import { activateSocket as startBridge, deactivateSocket as stopBridge } from '../lib/wallet-client.js';

const $messages = /** @type {HTMLDivElement} */ (document.getElementById(`messages`));
const $debug = /** @type {HTMLInputElement} */ (document.getElementById('debug'));

function debugChange() {
  // console.log('checked', $debug.checked);
  if ($debug.checked) {
    $messages.style.display = '';
  } else {
    $messages.style.display = 'none';
  }
}
$debug.addEventListener('change', debugChange);
debugChange();

/**
 * @param {string} id
 * @param {(obj: { type: string, data: any }) => void} recv
 */
export const connect = (id, recv) => {
  const $status = /** @type {HTMLSpanElement} */(document.getElementById(`${id}-status`));
  $status.innerHTML = 'Connecting...';

  const endpoint = id === 'wallet' ? '/private/wallet-bridge' : '/api';

  /**
   * @param {{ type: string, data: any}} obj
   */
  const send = obj => {
    const $m = document.createElement('div');
    $m.className = `message send ${id}`;
    $m.innerText = `${id}> ${JSON.stringify(obj)}`;
    $messages.appendChild($m);
    console.log(`${id}>`, obj);
    return rpc(obj, endpoint);
  };

  /**
   * @type {(value?: any) => void}
   */
  let resolve;
  /**
   * @type {(reason?: any) => void}
   */
  let reject;
  const sendP = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  })
  const activator = id === 'wallet' ? startBridge : startApi;
  activator({
    onConnect() {
      $status.innerHTML = 'Connected';
      resolve(send);
    },
    /**
     * @param {{ type: string }} msg
     */
    onMessage(obj) {
      if (!obj || typeof obj.type !== 'string') {
        return;
      }
      const $m = document.createElement('div');
      $m.className = `message receive ${id}`;
      $m.innerText = `${id}< ${JSON.stringify(obj)}`;
      $messages.appendChild($m);
      console.log(`${id}<`, obj);
      recv(obj);
    },
    onDisconnect() {
      $status.innerHTML = 'Disconnected';
      reject();
    },
  }, endpoint);

  return sendP;
};
