import { E } from '@agoric/eventual-send';
import { makeWebSocketHandler } from './lib-http';

export default harden(
  ({ board, http, treasuryFacet, invitationIssuer }, _invitationMaker) => {
    return makeWebSocketHandler(http, (send, _meta) =>
      harden({
        async onMessage(obj, __meta) {
          const { type } = obj;
          switch (type) {
            case 'treasury/makeLoanInvitation': {
              console.error('RECV', obj);
              const { invitationDepositId, offer } = obj.data;
              const depositFacet = E(board).getValue(invitationDepositId);
              const invitation = await E(treasuryFacet).makeLoanInvitation();
              const invitationAmount = await E(invitationIssuer).getAmountOf(
                invitation,
              );
              const {
                value: [{ handle }],
              } = invitationAmount;
              const invitationHandleBoardId = await E(board).getId(handle);
              const updatedOffer = { ...offer, invitationHandleBoardId };
              // We need to wait for the invitation to be
              // received, or we will possibly win the race of
              // proposing the offer before the invitation is ready.
              // TODO: We should make this process more robust.
              await E(depositFacet).receive(invitation);

              send({
                type: 'treasury/makeLoanInvitationResponse',
                data: { offer: updatedOffer },
              });
              return true;
            }

            default: {
              return undefined;
            }
          }
        },
      }),
    );
  },
);
