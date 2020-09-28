let debugInstance = 1;

function makeTracer(name) {
  let debugCount = 1;
  const key = `----- ${name}.${debugInstance} `
  function debugTick(...args) {
    console.log(key, debugCount++, ...args);
  }
  return debugTick;
}

export { makeTracer };