# Design: Auto Interest Based on block.timestamp (No Snapshot)

## Overview
- **Remove**: Snapshot mechanism completely
- **New Logic**: Interest accrues automatically based on block.timestamp
- **Owner Action**: Deposit USDC → Update index based on current totalSupply
- **User Claim**: Calculate based on cumulativeCouponIndex at claim time

## Key Changes

### 1. Remove Snapshot-Related State
- ❌ Remove: `recordCount`, `lastRecordTime`, `nextRecordTime`, `lastDistributedRecord`
- ❌ Remove: `snapshots` mapping, `Snapshot` struct
- ❌ Remove: `recordSnapshot()` function
- ❌ Remove: `SNAPSHOT_INTERVAL` constant (or keep for reference)

### 2. New State Variables
- ✅ Keep: `cumulativeCouponIndex` → Rename to `lastDistributionIndex` (index value at last distribution time)
- ✅ Add: `lastDistributionTime` - timestamp when index was last set (initialize to constructor time)
- ✅ Remove: `recordCount`, `lastRecordTime`, `nextRecordTime`, `lastDistributedRecord`

### 3. New Logic: `distributeCoupon()`
- Owner deposits USDC at any time
- **ONLY** transfers USDC into contract (no index update)
- Index increases continuously based on time (calculated real-time in claim)

### 4. Interest Calculation Formula

```
// Interest rate per second (per token)
INTEREST_PER_SECOND = COUPON_PER_TOKEN_PER_DAY / 86400
// = 0.001e6 / 86400 = 11.57407... (units: USDC per token per second)

// Index rate per second (for cumulative index calculation)
INDEX_RATE_PER_SECOND = INTEREST_PER_SECOND * PRECISION
// This is the rate at which cumulativeCouponIndex increases per second
// per token in the system

// Current index (calculated real-time)
currentIndex = lastDistributionIndex + (block.timestamp - lastDistributionTime) * INDEX_RATE_PER_SECOND

// User claimable amount
timeElapsed = block.timestamp - lastDistributionTime
accruedIndex = timeElapsed * INDEX_RATE_PER_SECOND
currentIndex = lastDistributionIndex + accruedIndex
claimableAmount = (currentIndex - userClaimedIndex) * userBalance / PRECISION
```

**Important:** Index increases continuously, owner deposit is just funding the contract.

### 5. Emergency Mode
- Instead of checking snapshot count, check time since last distribution
- Enable emergency mode if > 3 days since last distribution

## Implementation Steps

1. **Remove snapshot-related code:**
   - Remove `recordCount`, `lastRecordTime`, `nextRecordTime`, `lastDistributedRecord`
   - Remove `snapshots` mapping and `Snapshot` struct
   - Remove `recordSnapshot()` function
   - Remove `SNAPSHOT_INTERVAL` constant (or keep for reference)

2. **Add new state variables:**
   - `lastDistributionIndex` - index value at last distribution (initialize to 0)
   - `lastDistributionTime` - timestamp of last distribution (initialize to constructor block.timestamp)

3. **Modify `distributeCoupon()`:**
   - Remove snapshot checks
   - Simply transfer USDC from owner to contract
   - Update `lastDistributionIndex` to current calculated index (snapshot the index at this moment)
   - Update `lastDistributionTime` to block.timestamp
   - This "snapshots" the continuously growing index

4. **Modify `claimCoupon()`:**
   - Calculate current index real-time: `currentIndex = lastDistributionIndex + (block.timestamp - lastDistributionTime) * INDEX_RATE_PER_SECOND`
   - Use currentIndex instead of cumulativeCouponIndex for claim calculation
   - Update user's claimedIndex to currentIndex

5. **Update constructor:**
   - Initialize `lastDistributionTime = block.timestamp`
   - Initialize `lastDistributionIndex = 0`
   - Remove snapshot timing initialization

6. **Update view functions:**
   - `claimableAmount()`: Calculate current index real-time
   - Remove snapshot-related views (`getSnapshotStatus`, etc.)

7. **Update emergency mode:**
   - Check time since last distribution (not snapshot count)
   - Enable if `block.timestamp - lastDistributionTime > 3 days`

## Benefits
- ✅ No need for keeper/snapshot automation
- ✅ Interest accrues continuously and fairly
- ✅ Users who deposit mid-period still get interest
- ✅ Simpler contract logic
- ✅ Owner has flexibility to deposit anytime

## Considerations
- Owner must deposit regularly to fund interest payments
- Need to track `lastDistributionTime` accurately
- Interest calculation happens on each deposit (gas cost)
- May want to add minimum time interval between distributions to prevent abuse

