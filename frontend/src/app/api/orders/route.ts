import { NextRequest, NextResponse } from "next/server";
import { type SignedOrder } from "@/types/market";
import { verifyTypedData, getAddress } from "viem";

// ============================================================================
// IN-MEMORY DATABASE (MVP)
// Note: This data will be lost when the server restarts.
// For production, use a real database (Postgres/MongoDB).
// ============================================================================
let activeOrders: SignedOrder[] = [];

// ============================================================================
// HELPER: Validate Signature
// ============================================================================
async function isValidOrder(order: SignedOrder, chainId: number, marketAddress: `0x${string}`): Promise<boolean> {
    try {
        const domain = {
            name: "BondMarket",
            version: "2.0",
            chainId: chainId,
            verifyingContract: marketAddress,
        } as const;

        const types = {
            Order: [
                { name: "seller", type: "address" },
                { name: "bondToken", type: "address" },
                { name: "bondAmount", type: "uint256" },
                { name: "usdcAmount", type: "uint256" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" },
            ],
        } as const;

        const message = {
            seller: order.seller,
            bondToken: order.bondToken,
            bondAmount: BigInt(order.bondAmount),
            usdcAmount: BigInt(order.usdcAmount),
            nonce: BigInt(order.nonce),
            deadline: BigInt(order.deadline),
        };

        const recoveredAddress = await verifyTypedData({
            address: order.seller,
            domain,
            types,
            primaryType: "Order",
            message,
            signature: order.signature,
        });

        return recoveredAddress;
    } catch (e) {
        console.error("Signature verification failed:", e);
        return false;
    }
}

// ============================================================================
// GET /api/orders
// Return all active orders
// ============================================================================
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const seller = searchParams.get("seller");

    // Filter by seller if provided
    let orders = activeOrders;
    if (seller) {
        orders = orders.filter((o) => o.seller.toLowerCase() === seller.toLowerCase());
    }

    // Filter expired orders
    const now = Math.floor(Date.now() / 1000);
    orders = orders.filter((o) => BigInt(o.deadline) > BigInt(now));

    return NextResponse.json(orders);
}

// ============================================================================
// POST /api/orders
// Create a new order
// ============================================================================
export async function POST(request: NextRequest) {
    try {
        const body: SignedOrder & { chainId: number; marketAddress: `0x${string}` } = await request.json();

        // Basic validation
        if (!body.seller || !body.bondToken || !body.signature || !body.chainId || !body.marketAddress) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Verify Signature logic (Crucial security step)
        const valid = await isValidOrder(body, body.chainId, body.marketAddress);
        if (!valid) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }

        // Check for duplicates (same nonce)
        const existing = activeOrders.find(
            (o) => o.seller === body.seller && o.nonce === body.nonce
        );
        if (existing) {
            return NextResponse.json({ error: "Nonce already used" }, { status: 409 });
        }

        // Store
        const newOrder: SignedOrder = {
            seller: getAddress(body.seller), // Checksum address
            bondToken: getAddress(body.bondToken),
            bondAmount: body.bondAmount,
            usdcAmount: body.usdcAmount,
            nonce: body.nonce,
            deadline: body.deadline,
            signature: body.signature,
            createdAt: Date.now(),
        };

        activeOrders.push(newOrder);



        return NextResponse.json({ success: true, order: newOrder });
    } catch (e) {
        console.error("POST Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// ============================================================================
// DELETE /api/orders?signature=xxx
// Delete an order after it's been filled
// ============================================================================
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const signature = searchParams.get("signature");

        if (!signature) {
            return NextResponse.json({ error: "Missing signature" }, { status: 400 });
        }

        // Remove order from array
        const initialLength = activeOrders.length;
        activeOrders = activeOrders.filter((o) => o.signature !== signature);

        if (activeOrders.length === initialLength) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }


        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("DELETE Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
