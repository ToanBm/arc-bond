import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("BondMarketV2", function () {
    async function deployMarketFixture() {
        const [owner, seller, buyer] = await ethers.getSigners();

        // Deploy Mock Tokens
        const Token = await ethers.getContractFactory("BondToken"); // Reusing BondToken as generic ERC20
        const usdc = await Token.deploy("USDC", "USDC", owner.address);
        const bond = await Token.deploy("Bond", "BOND", owner.address);

        // Deploy Market
        const Market = await ethers.getContractFactory("BondMarketV2");
        const market = await Market.deploy(await usdc.getAddress());

        // Setup: Mint tokens
        await usdc.mint(buyer.address, ethers.parseEther("1000"));
        await bond.mint(seller.address, ethers.parseEther("100"));

        return { market, usdc, bond, owner, seller, buyer };
    }

    it("Should match a valid order successfully", async function () {
        const { market, usdc, bond, seller, buyer } = await loadFixture(deployMarketFixture);
        const marketAddress = await market.getAddress();
        const bondAddress = await bond.getAddress();

        // 1. Approve Market
        await usdc.connect(buyer).approve(marketAddress, ethers.parseEther("1000"));
        await bond.connect(seller).approve(marketAddress, ethers.parseEther("100"));

        // 2. Create Order Data
        const domain = {
            name: "BondMarket",
            version: "2.0",
            chainId: (await ethers.provider.getNetwork()).chainId,
            verifyingContract: marketAddress,
        };

        const types = {
            Order: [
                { name: "seller", type: "address" },
                { name: "bondToken", type: "address" },
                { name: "bondAmount", type: "uint256" },
                { name: "usdcAmount", type: "uint256" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" },
            ],
        };

        const order = {
            seller: seller.address,
            bondToken: bondAddress,
            bondAmount: ethers.parseEther("10"),
            usdcAmount: ethers.parseEther("50"),
            nonce: 1n,
            deadline: BigInt(Math.floor(Date.now() / 1000) + 3600), // +1 hour
        };

        // 3. Sign Order
        const signature = await seller.signTypedData(domain, types, order);

        // 4. Match Order (Buyer calls)
        await expect(market.connect(buyer).matchOrder(order, signature))
            .to.emit(market, "OrderMatched")
            .withArgs(anyValue, seller.address, buyer.address, bondAddress, order.bondAmount, order.usdcAmount);

        // 5. Verify Balances
        expect(await bond.balanceOf(buyer.address)).to.equal(order.bondAmount);
        expect(await usdc.balanceOf(seller.address)).to.equal(order.usdcAmount);
    });

    it("Should revert invalid signature", async function () {
        const { market, usdc, bond, seller, buyer } = await loadFixture(deployMarketFixture);
        const marketAddress = await market.getAddress();

        // Order data
        const order = {
            seller: seller.address,
            bondToken: await bond.getAddress(),
            bondAmount: ethers.parseEther("10"),
            usdcAmount: ethers.parseEther("50"),
            nonce: 1n,
            deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
        };

        // Fake signature (signed by buyer instead of seller)
        const domain = {
            name: "BondMarket",
            version: "2.0",
            chainId: (await ethers.provider.getNetwork()).chainId,
            verifyingContract: marketAddress,
        };
        const types = {
            Order: [
                { name: "seller", type: "address" },
                { name: "bondToken", type: "address" },
                { name: "bondAmount", type: "uint256" },
                { name: "usdcAmount", type: "uint256" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" },
            ],
        };
        const signature = await buyer.signTypedData(domain, types, order);

        await expect(market.connect(buyer).matchOrder(order, signature))
            .to.be.revertedWithCustomError(market, "InvalidSignature");
    });

    it("Should revert used nonce (Replay Attack)", async function () {
        const { market, usdc, bond, seller, buyer } = await loadFixture(deployMarketFixture);
        const marketAddress = await market.getAddress();

        // Approve
        await usdc.connect(buyer).approve(marketAddress, ethers.parseEther("1000"));
        await bond.connect(seller).approve(marketAddress, ethers.parseEther("100"));

        // Setup valid order
        const domain = {
            name: "BondMarket",
            version: "2.0",
            chainId: (await ethers.provider.getNetwork()).chainId,
            verifyingContract: marketAddress,
        };
        const types = {
            Order: [
                { name: "seller", type: "address" },
                { name: "bondToken", type: "address" },
                { name: "bondAmount", type: "uint256" },
                { name: "usdcAmount", type: "uint256" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" },
            ],
        };
        const order = {
            seller: seller.address,
            bondToken: await bond.getAddress(),
            bondAmount: ethers.parseEther("10"),
            usdcAmount: ethers.parseEther("50"),
            nonce: 1n,
            deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
        };
        const signature = await seller.signTypedData(domain, types, order);

        // 1. First execution - Success
        await market.connect(buyer).matchOrder(order, signature);

        // 2. Replay - Fail
        await expect(market.connect(buyer).matchOrder(order, signature))
            .to.be.revertedWithCustomError(market, "NonceUsed");
    });
});
