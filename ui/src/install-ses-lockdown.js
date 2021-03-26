/* global process */
// import 'ses/lockdown';
import '@agoric/eventual-send/shim';

function ifDevMode(thunk) {
  if (typeof process !== 'undefined' && typeof process.env === 'object') {
    console.log({ NODE_ENV: process.env.NODE_ENV });

    if (process.env.NODE_ENV === 'development') {
      thunk();
    }
  }
}

// In production, to avoid react-scripts / webpack rewriting SES,
// we call lockdown() elsewhere. See ses-patch.js.
ifDevMode(() =>
  lockdown({
    __allowUnsafeMonkeyPatching__: 'unsafe',
    errorTaming: 'unsafe',
    overrideTaming: 'severe',
  }),
);

// Even on non-v8, we tame the start compartment's Error constructor so
// this assignment is not rejected, even if it does nothing.
Error.stackTraceLimit = Infinity;
