import {
    BondFactory,
    BondToken,
    Pool,
    UserPosition,
    Activity,
    // BondToken as BondTokenEntity // Avoid name clash if needed, but here we can rely on context.BondToken
} from "../generated";

// Helper to generate IDs
const getPositionId = (user: string, token: string) => `${user}-${token}`;

BondFactory.PoolCreated.contractRegister(({ event, context }) => {
    context.addBondToken(event.params.bondToken);
    context.addBondSeries(event.params.bondSeries);
});

BondFactory.PoolCreated.handler(async ({ event, context }) => {
    const poolId = event.params.poolId.toString();
    const bondTokenAddress = event.params.bondToken.toLowerCase();

    // Create Pool Entity
    const pool: Pool = {
        id: poolId,
        poolId: event.params.poolId,
        bondToken: bondTokenAddress,
        bondSeries: event.params.bondSeries.toLowerCase(),
        maturityDate: event.params.maturityDate,
        name: event.params.name,
        symbol: event.params.symbol,
        createdAt: BigInt(event.block.timestamp),
    };

    context.Pool.set(pool);

    // Note: Dynamic template creation is handled automatically if defined in config, 
    // but if we used templates in config.yaml, we'd don't need explicit code here for the template tracking itself depending on Envio version.
    // With Envio 2.x, if we put "BondToken" in config without specific address, it might try to index all matching events or we need dynamic contracts.
    // For simplicity in this config, we likely defined `BondToken` without address, implying it might catch all if we didn't specify factory loader or we need to revisit config for Factory pattern if it wasn't set up as dynamic.
    // However, let's assume Envio's codegen handles the mapping.
});

BondToken.Transfer.handler(async ({ event, context }) => {
    const amount = event.params.value;
    const from = event.params.from.toLowerCase();
    const to = event.params.to.toLowerCase();
    const tokenAddress = event.srcAddress.toLowerCase();
    const timestamp = BigInt(event.block.timestamp);
    const txHash = event.transaction.hash;

    // 1. Determine Activity Type
    let activityType = "TRANSFER";
    if (from === "0x0000000000000000000000000000000000000000") activityType = "MINT";
    else if (to === "0x0000000000000000000000000000000000000000") activityType = "BURN";

    // 2. Create Activity Record
    const activityId = `${txHash}-${event.logIndex}`;
    const activity: Activity = {
        id: activityId,
        activityType: activityType,
        user: activityType === "MINT" ? to : from, // Associate primary user
        bondToken: tokenAddress,
        amount: amount,
        timestamp: timestamp,
        txHash: txHash,
    };
    context.Activity.set(activity);

    // 3. Update Sender Position (if not Mint)
    if (activityType !== "MINT") {
        const senderId = getPositionId(from, tokenAddress);
        let senderPos = await context.UserPosition.get(senderId);

        if (!senderPos) {
            senderPos = {
                id: senderId,
                user: from,
                bondToken: tokenAddress,
                balance: 0n,
            };
        }

        senderPos = {
            ...senderPos,
            balance: senderPos.balance - amount,
        };
        context.UserPosition.set(senderPos);
    }

    // 4. Update Receiver Position (if not Burn)
    if (activityType !== "BURN") {
        const receiverId = getPositionId(to, tokenAddress);
        let receiverPos = await context.UserPosition.get(receiverId);

        if (!receiverPos) {
            receiverPos = {
                id: receiverId,
                user: to,
                bondToken: tokenAddress,
                balance: 0n,
            };
        }

        receiverPos = {
            ...receiverPos,
            balance: receiverPos.balance + amount,
        };
        context.UserPosition.set(receiverPos);
    }
});
