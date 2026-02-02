import { useEffect, useState } from 'react';
import { usePool } from '@/contexts/PoolContext';
import { ENVIO_GRAPHQL_ENDPOINT, ENVIO_QUERIES } from '@/config/envio';

export type TVLDataPoint = {
    date: string; // "Jan 19"
    timestamp: number;
    tvl: number; // TVL in USDC
    volume: number; // Volume change in that day (+Deposit, -Redeem)
};

export type TimeRange = '1D' | '1W' | 'ALL';

export function usePoolTVLHistory(range: TimeRange = 'ALL') {
    const { selectedPool } = usePool();
    const [data, setData] = useState<TVLDataPoint[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!selectedPool?.poolId) return;

        let isMounted = true;

        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(ENVIO_GRAPHQL_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: ENVIO_QUERIES.GET_POOL_TVL_HISTORY,
                        variables: { poolId: selectedPool.poolId.toString() }
                    })
                });

                const result = await response.json();
                const snapshots = result.data?.PoolSnapshot || [];

                // 1. Generate standard time buckets
                const now = Math.floor(Date.now() / 1000);
                const points: TVLDataPoint[] = [];

                let numPoints = 12;
                let step = 3600; // default 1 hour

                if (range === '1D') { numPoints = 24; step = 3600; }
                else if (range === '1W') { numPoints = 7; step = 86400; }
                else { numPoints = 12; step = 86400; }

                // 2. Fill buckets with Fill-Forward logic
                let lastKnownTvl = 0;

                // Sort snapshots ascending to track historical TVL
                const sortedSnapshots = [...snapshots].sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

                for (let i = numPoints - 1; i >= 0; i--) {
                    const bucketTime = now - (i * step);

                    // Find the latest snapshot that happened ON or BEFORE this bucketTime
                    const availableSnapshot = sortedSnapshots
                        .filter(s => Number(s.timestamp) <= bucketTime)
                        .pop();

                    if (availableSnapshot) {
                        lastKnownTvl = Number(availableSnapshot.totalSupply) / 1e7;
                    }

                    const dateObj = new Date(bucketTime * 1000);
                    let label = "";
                    if (range === '1D') {
                        label = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }) + ":00";
                    } else {
                        label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }

                    points.push({
                        date: label,
                        timestamp: bucketTime,
                        tvl: lastKnownTvl,
                        volume: 0
                    });
                }

                if (isMounted) {
                    setData(points);
                }
            } catch (error) {
                console.error("Failed to fetch Envio TVL history:", error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchHistory();
        return () => { isMounted = false; };
    }, [selectedPool?.poolId, range]); // Added range to dependency array

    return { data, isLoading };
}
