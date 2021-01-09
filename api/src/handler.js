import { E } from '@agoric/eventual-send';

export default harden(({ registry, publicAPI }, _invitationMaker) => {
  const cacheOfPromiseForValue = new Map();
  const getFromRegistry = registryKey => {
    let valueP = cacheOfPromiseForValue.get(registryKey);
    if (!valueP) {
      // Cache miss, so try the registry.
      valueP = E(registry).get(registryKey);
      cacheOfPromiseForValue.set(registryKey, valueP);
    }
    return valueP;
  };

  // returns a promise
  const hydrateBrand = dehydratedBrand => getFromRegistry(dehydratedBrand);

  // returns a promise
  const hydrateAmount = dehydratedAmount => {
    return hydrateBrand(dehydratedAmount.brand).then(brand => {
      return {
        brand,
        extent: dehydratedAmount.extent,
      };
    });
  };

  return harden({
    getCommandHandler() {
      return harden({
        onError(obj, _meta) {
          console.error('Have error', obj);
        },
        onOpen: (_obj, _meta) => {},
        onClose: (_obj, _meta) => {},
        async onMessage(obj, _meta) {
          const { type, data } = obj;
          switch (type) {
            case 'autoswapGetCurrentPrice': {
              const {
                amountIn: dehydratedAmountIn,
                brandOut: dehydratedBrandOut,
              } = data;

              // A dehydrated amount has the form: { brand:
              // brandRegKey, extent }

              // dehydratedBrandOut is a brandRegKey
              const [amountIn, brandOut] = await Promise.all([
                hydrateAmount(dehydratedAmountIn),
                hydrateBrand(dehydratedBrandOut),
              ]);
              const { extent } = await E(publicAPI).getCurrentPrice(
                amountIn,
                brandOut,
              );
              return { type: 'autoswapGetCurrentPriceResponse', data: extent };
            }

            default: {
              console.log('UNEXPECTED ACTION: ', type, obj);
              return false;
            }
          }
        },
      });
    },
  });
});
