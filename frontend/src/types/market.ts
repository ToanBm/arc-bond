export interface Order {
    seller: `0x${string}`;
    bondToken: `0x${string}`;
    bondAmount: string; // uint256 as string
    usdcAmount: string; // uint256 as string
    nonce: string; // uint256 as string
    deadline: string; // uint256 as string
}

export interface SignedOrder extends Order {
    signature: `0x${string}`;
    createdAt: number;
}
