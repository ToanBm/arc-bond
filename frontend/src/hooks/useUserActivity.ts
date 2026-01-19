import { usePublicClient, useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import { parseAbiItem, formatUnits, type Log } from 'viem';
import { usePool } from '@/contexts/PoolContext';

export type ActivityType = 'Deposit' | 'Redeem' | 'Claim Interest';

export interface ActivityItem {
    id: string;
    type: ActivityType;
    amount: string;
    asset: string;
    time: string;
    status: 'Success';
    hash: string;
    timestamp: number;
    color: string;
}

/**
 * Hook to fetch user's recent activity logs from the blockchain
 */
export function useUserActivity() {
    const { address } = useAccount();
    const { selectedPool } = usePool();
    const publicClient = usePublicClient();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const bondSeriesAddress = selectedPool?.bondSeries as `0x${string}`;

    useEffect(() => {
        async function fetchActivities() {
            if (!address || !bondSeriesAddress || !publicClient) return;

            setIsLoading(true);
            try {
                const currentBlock = await publicClient.getBlockNumber();
                // Reduce range and fetch in one go to avoid parallel overhead/rate limits
                const fetchRange = BigInt(20000);
                const startBlock = currentBlock > fetchRange ? currentBlock - fetchRange : BigInt(0);

                const eventConfigs = [
                    {
                        type: 'Deposit' as ActivityType,
                        abi: parseAbiItem('event Deposited(address indexed user, uint256 usdcAmount, uint256 bondAmount, uint256 timestamp)'),
                        color: 'text-blue-600'
                    },
                    {
                        type: 'Redeem' as ActivityType,
                        abi: parseAbiItem('event Redeemed(address indexed user, uint256 bondAmount, uint256 usdcAmount, uint256 timestamp)'),
                        color: 'text-rose-600'
                    },
                    {
                        type: 'Claim Interest' as ActivityType,
                        abi: parseAbiItem('event InterestClaimed(address indexed user, uint256 amount, uint256 timestamp)'),
                        color: 'text-emerald-600'
                    }
                ];

                // Fetch logs sequentially or in a single call if possible
                // Viem getLogs with 'event' doesn't support arrays of events easily
                // So we'll fetch them and catch 429

                const allLogs: (Log & { config: typeof eventConfigs[0] })[] = [];
                for (const config of eventConfigs) {
                    try {
                        const logs = await publicClient.getLogs({
                            address: bondSeriesAddress,
                            event: config.abi,
                            args: { user: address },
                            fromBlock: startBlock,
                            toBlock: currentBlock
                        });
                        allLogs.push(...logs.map(l => ({ ...l, config })));

                        await new Promise(resolve => setTimeout(resolve, 200));
                    } catch {
                        // Skip failed config silently
                    }
                }

                const formattedActivities: ActivityItem[] = allLogs.map((log) => {
                    const { args, transactionHash, config } = log as unknown as {
                        args: { usdcAmount?: bigint; amount?: bigint; timestamp?: bigint };
                        transactionHash: `0x${string}`;
                        config: (typeof eventConfigs)[number];
                    };
                    let amountStr = '0';

                    if (config.type === 'Deposit') {
                        amountStr = formatUnits(args.usdcAmount ?? BigInt(0), 6);
                    } else if (config.type === 'Redeem') {
                        amountStr = formatUnits(args.usdcAmount ?? BigInt(0), 6);
                    } else if (config.type === 'Claim Interest') {
                        amountStr = formatUnits(args.amount ?? BigInt(0), 6);
                    }

                    const timestamp = Number(args.timestamp ?? 0);

                    return {
                        id: `${transactionHash}-${log.logIndex}`,
                        type: config.type,
                        amount: amountStr,
                        asset: 'USDC',
                        time: timestamp > 0 ? formatRelativeTime(timestamp) : 'Just now',
                        status: 'Success',
                        hash: transactionHash,
                        timestamp: timestamp,
                        color: config.color
                    };
                });

                setActivities(formattedActivities.sort((a, b) => b.timestamp - a.timestamp));

            } catch {
                // Silently handle top-level error
            } finally {
                setIsLoading(false);
            }
        }

        fetchActivities();
        // Refresh every 30 seconds
        const interval = setInterval(fetchActivities, 30000);
        return () => clearInterval(interval);
    }, [address, bondSeriesAddress, publicClient]);

    return { activities, isLoading };
}

function formatRelativeTime(timestamp: number) {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

    return new Date(timestamp * 1000).toLocaleDateString();
}
