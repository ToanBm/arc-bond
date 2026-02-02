export const ENVIO_GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_ENVIO_GRAPHQL_ENDPOINT || "https://indexer.dev.hyperindex.xyz/5da80b2/v1/graphql";

export const ENVIO_QUERIES = {
    GET_POOLS: `
        query GetPools {
            Pool(order_by: { poolId: desc }) {
                id
                poolId
                bondToken
                bondSeries
                maturityDate
                name
                symbol
                createdAt
            }
        }
    `,
    GET_USER_ACTIVITY: `
        query GetUserActivity($user: String!) {
            Activity(
                where: { user: { _ilike: $user } },
                order_by: { timestamp: desc },
                limit: 20
            ) {
                id
                activityType
                amount
                bondToken
                timestamp
                txHash
            }
        }
    `,
    GET_POOL_TVL_HISTORY: `
        query GetPoolTVLHistory($poolId: String!) {
            PoolSnapshot(
                where: { pool_id: { _eq: $poolId } },
                order_by: { timestamp: asc }
            ) {
                totalSupply
                timestamp
            }
        }
    `
};
