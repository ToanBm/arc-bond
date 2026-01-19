import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits, parseAbiItem } from 'viem';
import { usePool } from '@/contexts/PoolContext';

export type TVLDataPoint = {
    date: string; // "Jan 19"
    timestamp: number;
    tvl: number; // TVL in USDC
    volume: number; // Volume change in that day (+Deposit, -Redeem)
};

export type TimeRange = '1D' | '1W' | 'ALL';

export function usePoolTVLHistory(range: TimeRange = 'ALL') {
    const publicClient = usePublicClient();
    const { selectedPool } = usePool();
    const [data, setData] = useState<TVLDataPoint[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const bondSeriesAddress = selectedPool?.bondSeries;

    useEffect(() => {
        if (!publicClient || !bondSeriesAddress) return;

        let isMounted = true;

        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                const currentBlock = await publicClient.getBlockNumber();

                // Adjusted for ~2s block time (Arc Testnet is fast)
                // 1 day = 43,200 blocks. 
                // For 12 points:
                // 1D (24h): ~3,600 blocks per point (every 2h)
                // 1W (7d): ~25,000 blocks per point (every 14h)
                // ALL (14d): ~50,000 blocks per point (every 1 day)

                const numPoints = 12;
                let blocksPerPoint = BigInt(50000);
                if (range === '1D') blocksPerPoint = BigInt(3600);
                else if (range === '1W') blocksPerPoint = BigInt(25000);

                const points: TVLDataPoint[] = [];

                // SEQUENTIAL STATE QUERIES (The Right Principle)
                for (let i = 0; i < numPoints; i++) {
                    if (!isMounted) return;

                    const targetBlock = currentBlock - (BigInt(i) * blocksPerPoint);
                    if (targetBlock <= BigInt(0)) break;

                    try {
                        // Parallel fetch for TVL and Block Info (timestamp)
                        const [rawTvl, block] = await Promise.all([
                            publicClient.readContract({
                                address: bondSeriesAddress as `0x${string}`,
                                abi: [parseAbiItem('function totalDeposited() view returns (uint256)')],
                                functionName: 'totalDeposited',
                                blockNumber: targetBlock
                            }),
                            publicClient.getBlock({ blockNumber: targetBlock })
                        ]);

                        const timestamp = Number(block.timestamp);
                        const dateObj = new Date(timestamp * 1000);

                        // Label formatting based on range
                        let label = "";
                        if (range === '1D') {
                            label = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }) + ":00";
                        } else {
                            label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }

                        points.push({
                            date: label,
                            timestamp: timestamp,
                            tvl: Number(formatUnits(rawTvl as bigint, 6)),
                            volume: 0
                        });
                        await new Promise(resolve => setTimeout(resolve, i === 0 ? 0 : 100));
                    } catch {
                        // Skip missing historical blocks silently
                    }
                }

                if (isMounted) {
                    setData(points.reverse());
                }
            } catch {
                // Silently handle top-level error
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
        return () => { isMounted = false; };
    }, [publicClient, bondSeriesAddress, range]);

    return { data, isLoading };
}
