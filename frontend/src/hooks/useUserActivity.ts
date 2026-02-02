import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import { formatUnits } from 'viem';
import { ENVIO_GRAPHQL_ENDPOINT, ENVIO_QUERIES } from '@/config/envio';

export type ActivityType = 'Deposit' | 'Redeem' | 'Claim Interest' | 'Transfer' | 'MINT' | 'BURN';

export interface ActivityItem {
    id: string;
    type: string;
    amount: string;
    asset: string;
    time: string;
    status: 'Success';
    hash: string;
    timestamp: number;
    color: string;
}

interface EnvioActivity {
    id: string;
    timestamp: string;
    activityType: ActivityType;
    amount: string;
    txHash: string;
}

/**
 * Hook to fetch user's recent activity logs from Envio Indexer
 */
export function useUserActivity() {
    const { address } = useAccount();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const userAddress = address;
        if (!userAddress) return;

        let isMounted = true;

        async function fetchActivities() {
            if (!userAddress) return;
            setIsLoading(true);
            try {
                const response = await fetch(ENVIO_GRAPHQL_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: ENVIO_QUERIES.GET_USER_ACTIVITY,
                        variables: { user: userAddress.toLowerCase() }
                    })
                });

                const result = await response.json();
                const items: EnvioActivity[] = result.data?.Activity || [];

                const formattedActivities: ActivityItem[] = items.map((item) => {
                    const timestamp = Number(item.timestamp);
                    const type = item.activityType;

                    let color = 'text-gray-600';
                    if (type === 'MINT' || type === 'Deposit') color = 'text-blue-600';
                    else if (type === 'BURN' || type === 'Redeem') color = 'text-rose-600';
                    else if (type === 'Transfer') color = 'text-emerald-600';

                    return {
                        id: item.id,
                        type: type === 'MINT' ? 'Deposit' : type === 'BURN' ? 'Redeem' : type,
                        amount: formatUnits(BigInt(item.amount) / BigInt(10), 6), // Fixed: Divide by 10 to show USDC value
                        asset: 'USDC',
                        time: timestamp > 0 ? formatRelativeTime(timestamp) : 'Just now',
                        status: 'Success',
                        hash: item.txHash,
                        timestamp: timestamp,
                        color: color
                    };
                });

                if (isMounted) {
                    setActivities(formattedActivities);
                }
            } catch (error) {
                console.error("Failed to fetch Envio activity:", error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        fetchActivities();
        const interval = setInterval(fetchActivities, 15000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [address]);

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
