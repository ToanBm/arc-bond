import {
    BondFactory,
    BondToken,
    Pool,
    UserPosition,
    Activity,
    PoolSnapshot,
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

    // Initialize BondToken Entity
    const bondToken: BondToken = {
        id: bondTokenAddress,
        pool_id: poolId,
        totalSupply: 0n,
    };
    context.BondToken.set(bondToken);
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

    // 5. Update BondToken Total Supply and Create Snapshot
    let bondToken = await context.BondToken.get(tokenAddress);
    if (bondToken) {
        let newTotalSupply = bondToken.totalSupply;
        if (activityType === "MINT") newTotalSupply += amount;
        else if (activityType === "BURN") newTotalSupply -= amount;

        if (newTotalSupply !== bondToken.totalSupply) {
            context.BondToken.set({
                ...bondToken,
                totalSupply: newTotalSupply,
            });

            // Create Snapshot for Charting (daily bucket)
            const dayInternal = Math.floor(Number(timestamp) / 86400);
            const snapshotId = `${bondToken.pool_id}-${dayInternal}`;
            const snapshot: PoolSnapshot = {
                id: snapshotId,
                pool_id: bondToken.pool_id,
                totalSupply: newTotalSupply,
                timestamp: timestamp,
            };
            context.PoolSnapshot.set(snapshot);
        }
    }
});
