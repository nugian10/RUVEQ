const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

const OWNER = "0x0262e8e5E4584D8AB840fD950a6E2E0A414d4097";
const REVENUE = "0x89c37649Ba3BAA9E1ce028612b7DE4e9c3a947B7";
const REGISTRY = "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F";
const BASE_URI = "https://raw.githubusercontent.com/nugian10/RUVEQ/main/collection/metadata/";
const EXPECTED_DECK_HASH = "0x1c41cd1f1305d3227b896c0c6985e6c370b7bac4b6cc6ad2be5af31248a9e8c1";
const PRICE = ethers.parseEther("0.0003");

const deckJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "..", "scripts", "deck.json"), "utf8")
);
const deckBytes = ethers.getBytes(
  "0x" + deckJson.deck.map((t) => t.toString(16).padStart(2, "0")).join("")
);

describe("RuveqNFT", function () {
  let ruveq, registry, caller, owner, revenue, minter, stranger;
  let ownerSigner;

  async function deploy() {
    [ownerSigner, minter, stranger] = await ethers.getSigners();
    // Tests run as Hardhat signers; the CONTRACT owner/revenue are the
    // real addresses (no funds there), so owner-only calls are made by
    // impersonating the owner address.
    await ethers.provider.send("hardhat_setBalance", [
      OWNER,
      "0x8AC7230489E80000", // 10 ETH
    ]);
    owner = await ethers.getImpersonatedSigner(OWNER);

    const Registry = await ethers.getContractFactory("MockAgentIdNFT");
    registry = await Registry.deploy();
    await registry.waitForDeployment();

    const Caller = await ethers.getContractFactory("MockCaller");
    caller = await Caller.deploy();
    await caller.waitForDeployment();

    const Factory = await ethers.getContractFactory("RuveqNFT");
    ruveq = await Factory.deploy(OWNER, REVENUE, await registry.getAddress(), BASE_URI, deckBytes);
    await ruveq.waitForDeployment();

    // Give the minter an Agent ID in the mock registry.
    await registry.mintTo(minter.address);
  }

  beforeEach(deploy);

  describe("deployment", function () {
    it("has the right name, symbol, supply and flat price", async function () {
      expect(await ruveq.name()).to.equal("Ruveq");
      expect(await ruveq.symbol()).to.equal("RUVEQ");
      expect(await ruveq.MAX_SUPPLY()).to.equal(3333);
      expect(await ruveq.MINT_PRICE()).to.equal(PRICE);
      expect(await ruveq.mintPrice()).to.equal(PRICE);
      expect(await ruveq.currentPrice()).to.equal(PRICE);
      expect(await ruveq.getMintPrice()).to.equal(PRICE);
      // Flat: every token ID costs the same.
      expect(await ruveq.priceForTokenId(1)).to.equal(PRICE);
      expect(await ruveq.priceForTokenId(500)).to.equal(PRICE);
      expect(await ruveq.priceForTokenId(501)).to.equal(PRICE);
      expect(await ruveq.priceForTokenId(3333)).to.equal(PRICE);
      await expect(ruveq.priceForTokenId(0)).to.be.revertedWithCustomError(ruveq, "ExceedsMaxSupply");
      await expect(ruveq.priceForTokenId(3334)).to.be.revertedWithCustomError(ruveq, "ExceedsMaxSupply");
    });

    it("has NO per-wallet limit (OOBIX v2 rule)", async function () {
      // No MAX_PER_WALLET constant and no ExceedsWalletLimit error exist.
      expect(ruveq.MAX_PER_WALLET).to.equal(undefined);
      expect(ruveq.interface.getError("ExceedsWalletLimit")).to.equal(null);
    });

    it("has the right owner, revenue, registry, baseURI, mintActive=false", async function () {
      expect(await ruveq.owner()).to.equal(OWNER);
      expect(await ruveq.revenueWallet()).to.equal(REVENUE);
      expect(await ruveq.agentIdRegistry()).to.equal(await registry.getAddress());
      expect(await ruveq.DEFAULT_AGENT_ID_REGISTRY()).to.equal(REGISTRY);
      expect(await ruveq.baseURI()).to.equal(BASE_URI);
      expect(await ruveq.mintActive()).to.equal(false);
      expect(await ruveq.mintOpen()).to.equal(false);
      expect(await ruveq.agentIdCheckRequired()).to.equal(true);
      expect(await ruveq.totalSupply()).to.equal(0);
      expect(await ruveq.totalMinted()).to.equal(0);
      expect(await ruveq.nextTokenId()).to.equal(1);
    });

    it("deckHash matches the committed deck exactly", async function () {
      // Off-chain: the recorded hash is SHA-256 of the compact JSON
      // encoding (the generator's convention).
      const crypto = require("crypto");
      const offChain = "0x" + crypto.createHash("sha256")
        .update(JSON.stringify(deckJson.deck))
        .digest("hex");
      expect(offChain).to.equal(EXPECTED_DECK_HASH);
      expect(await ruveq.EXPECTED_DECK_HASH()).to.equal(EXPECTED_DECK_HASH);
      // On-chain: deckHash() rebuilds that same encoding and hashes it.
      expect(await ruveq.deckHash()).to.equal(EXPECTED_DECK_HASH);
    });

    it("deck counts match the spec exactly", async function () {
      expect(await ruveq.COUNT_COMMON()).to.equal(2000);
      expect(await ruveq.COUNT_UNCOMMON()).to.equal(800);
      expect(await ruveq.COUNT_RARE()).to.equal(333);
      expect(await ruveq.COUNT_EPIC()).to.equal(150);
      expect(await ruveq.COUNT_LEGENDARY()).to.equal(50);
      const counts = [0, 0, 0, 0, 0];
      for (const t of deckJson.deck) counts[t]++;
      expect(counts).to.deep.equal([2000, 800, 333, 150, 50]);
    });

    it("rarityOf matches deck.json for sampled token IDs", async function () {
      for (const id of [1, 2, 100, 1000, 3000, 3333]) {
        expect(await ruveq.rarityOf(id)).to.equal(deckJson.deck[id - 1]);
      }
      await expect(ruveq.rarityOf(0)).to.be.revertedWithCustomError(ruveq, "ExceedsMaxSupply");
      await expect(ruveq.rarityOf(3334)).to.be.revertedWithCustomError(ruveq, "ExceedsMaxSupply");
    });

    it("reverts on a wrong deck (bad counts)", async function () {
      const bad = new Uint8Array(3333).fill(0);
      const Factory = await ethers.getContractFactory("RuveqNFT");
      await expect(
        Factory.deploy(OWNER, REVENUE, await registry.getAddress(), BASE_URI, bad)
      ).to.be.revertedWithCustomError(Factory, "InvalidDeck");
    });

    it("reverts on a wrong-length deck", async function () {
      const short = new Uint8Array(3332).fill(0);
      const Factory = await ethers.getContractFactory("RuveqNFT");
      await expect(
        Factory.deploy(OWNER, REVENUE, await registry.getAddress(), BASE_URI, short)
      ).to.be.revertedWithCustomError(Factory, "InvalidDeck");
    });

    it("reverts on a zero owner / revenue / registry", async function () {
      const Factory = await ethers.getContractFactory("RuveqNFT");
      // Zero owner is caught first by OpenZeppelin Ownable.
      await expect(
        Factory.deploy(ethers.ZeroAddress, REVENUE, await registry.getAddress(), BASE_URI, deckBytes)
      ).to.be.revertedWithCustomError(Factory, "OwnableInvalidOwner");
      await expect(
        Factory.deploy(OWNER, ethers.ZeroAddress, await registry.getAddress(), BASE_URI, deckBytes)
      ).to.be.revertedWithCustomError(Factory, "InvalidAddress");
      await expect(
        Factory.deploy(OWNER, REVENUE, ethers.ZeroAddress, BASE_URI, deckBytes)
      ).to.be.revertedWithCustomError(Factory, "InvalidAddress");
    });
  });

  describe("agent ID gate", function () {
    it("holdsAgentId / hasAgentId reflect the registry", async function () {
      expect(await ruveq.holdsAgentId(minter.address)).to.equal(true);
      expect(await ruveq.hasAgentId(minter.address)).to.equal(true);
      expect(await ruveq.holdsAgentId(stranger.address)).to.equal(false);
    });

    it("reverts NoAgentId for a wallet without an Agent ID", async function () {
      await ruveq.connect(owner).setMintActive(true);
      await expect(
        ruveq.connect(stranger).mint({ value: PRICE })
      ).to.be.revertedWithCustomError(ruveq, "NoAgentId");
    });
  });

  describe("minting", function () {
    beforeEach(async function () {
      await ruveq.connect(owner).setMintActive(true);
    });

    it("reverts MintInactive when mint is off", async function () {
      await ruveq.connect(owner).setMintActive(false);
      await expect(
        ruveq.connect(minter).mint({ value: PRICE })
      ).to.be.revertedWithCustomError(ruveq, "MintInactive");
    });

    it("reverts NoContracts for calls from a contract", async function () {
      await expect(
        caller.tryMint(await ruveq.getAddress(), { value: PRICE })
      ).to.not.be.reverted; // the call itself succeeds, inner mint fails
      const ok = await caller.tryMint.staticCall(await ruveq.getAddress(), { value: PRICE });
      expect(ok).to.equal(false);
      expect(await ruveq.totalSupply()).to.equal(0);
    });

    it("reverts IncorrectPayment on under- and overpayment", async function () {
      await expect(
        ruveq.connect(minter).mint({ value: PRICE - 1n })
      ).to.be.revertedWithCustomError(ruveq, "IncorrectPayment");
      await expect(
        ruveq.connect(minter).mint({ value: PRICE + 1n })
      ).to.be.revertedWithCustomError(ruveq, "IncorrectPayment");
      await expect(
        ruveq.connect(minter).mint({ value: 0 })
      ).to.be.revertedWithCustomError(ruveq, "IncorrectPayment");
    });

    it("mints token #1 with the deck rarity, seed, tokenURI and payment forwarded", async function () {
      const revenueBefore = await ethers.provider.getBalance(REVENUE);
      const tx = await ruveq.connect(minter).mint({ value: PRICE });
      const receipt = await tx.wait();

      expect(await ruveq.totalSupply()).to.equal(1);
      expect(await ruveq.ownerOf(1)).to.equal(minter.address);
      expect(await ruveq.tokenRarity(1)).to.equal(deckJson.deck[0]);
      expect(await ruveq.tokenSeed(1)).to.not.equal(ethers.ZeroHash);
      expect(await ruveq.tokenURI(1)).to.equal(BASE_URI + "1.json");
      expect(await ruveq.mintedBy(minter.address)).to.equal(1);
      // Payment forwarded directly: contract holds nothing, revenue got it.
      expect(await ethers.provider.getBalance(await ruveq.getAddress())).to.equal(0);
      expect(await ethers.provider.getBalance(REVENUE)).to.equal(revenueBefore + PRICE);

      // Minted event carries minter, tokenId, price, rarity, seed.
      const ev = receipt.logs.find((l) => {
        try {
          return ruveq.interface.parseLog(l).name === "Minted";
        } catch {
          return false;
        }
      });
      const parsed = ruveq.interface.parseLog(ev);
      expect(parsed.args.minter).to.equal(minter.address);
      expect(parsed.args.tokenId).to.equal(1);
      expect(parsed.args.price).to.equal(PRICE);
      expect(parsed.args.rarity).to.equal(deckJson.deck[0]);
    });

    it("tokenURI reverts for an unminted token", async function () {
      await expect(ruveq.tokenURI(1)).to.be.revertedWithCustomError(
        ruveq,
        "ERC721NonexistentToken"
      );
    });

    it("has NO per-wallet limit: one wallet can mint 15 times", async function () {
      // Aenovra caps at 10; RUVEQ (OOBIX v2 rule) does not.
      for (let i = 0; i < 15; i++) {
        await ruveq.connect(minter).mint({ value: PRICE });
      }
      expect(await ruveq.mintedBy(minter.address)).to.equal(15);
      expect(await ruveq.totalSupply()).to.equal(15);
      expect(await ruveq.ownerOf(15)).to.equal(minter.address);
    });

    it("lets the owner disable the Agent ID gate", async function () {
      await ruveq.connect(owner).setAgentIdCheckRequired(false);
      await ruveq.connect(stranger).mint({ value: PRICE });
      expect(await ruveq.ownerOf(1)).to.equal(stranger.address);
    });

    it("only the owner can change admin settings", async function () {
      await expect(ruveq.connect(minter).setMintActive(false))
        .to.be.revertedWithCustomError(ruveq, "OwnableUnauthorizedAccount");
      await expect(ruveq.connect(minter).setAgentIdCheckRequired(false))
        .to.be.revertedWithCustomError(ruveq, "OwnableUnauthorizedAccount");
      await expect(ruveq.connect(minter).setBaseURI("https://example.com/"))
        .to.be.revertedWithCustomError(ruveq, "OwnableUnauthorizedAccount");
      await expect(ruveq.connect(minter).setRevenueWallet(stranger.address))
        .to.be.revertedWithCustomError(ruveq, "OwnableUnauthorizedAccount");
      await expect(ruveq.connect(minter).setAgentIdRegistry(stranger.address))
        .to.be.revertedWithCustomError(ruveq, "OwnableUnauthorizedAccount");
      await expect(ruveq.connect(minter).setMintPrice(PRICE))
        .to.be.revertedWithCustomError(ruveq, "OwnableUnauthorizedAccount");
      await expect(ruveq.connect(minter).withdraw())
        .to.be.revertedWithCustomError(ruveq, "OwnableUnauthorizedAccount");
    });
  });

  describe("price admin", function () {
    it("owner can change the flat price before the first mint, not after", async function () {
      const newPrice = ethers.parseEther("0.0005");
      await ruveq.connect(owner).setMintPrice(newPrice);
      expect(await ruveq.currentPrice()).to.equal(newPrice);
      expect(await ruveq.mintPrice()).to.equal(newPrice);
      // Back to the spec price, then mint once and try again.
      await ruveq.connect(owner).setMintPrice(PRICE);
      await ruveq.connect(owner).setMintActive(true);
      await ruveq.connect(minter).mint({ value: PRICE });
      await expect(
        ruveq.connect(owner).setMintPrice(newPrice)
      ).to.be.revertedWithCustomError(ruveq, "PriceLocked");
    });

    it("reverts InvalidPrice for a zero price before the first mint", async function () {
      await expect(
        ruveq.connect(owner).setMintPrice(0)
      ).to.be.revertedWithCustomError(ruveq, "InvalidPrice");
    });
  });

  describe("withdraw safety valve", function () {
    it("forwards force-sent funds to revenue and reverts when empty", async function () {
      await expect(ruveq.connect(owner).withdraw())
        .to.be.revertedWithCustomError(ruveq, "NoFunds");
      // Force-send 0.01 ETH outside mint() (as a selfdestruct would):
      // the contract has no receive/fallback, so simulate it by
      // setting its balance directly on the Hardhat network.
      // 0.01 ETH = 10^16 wei = 0x2386F26FC10000.
      await ethers.provider.send("hardhat_setBalance", [
        await ruveq.getAddress(),
        "0x2386F26FC10000",
      ]);
      const revenueBefore = await ethers.provider.getBalance(REVENUE);
      await ruveq.connect(owner).withdraw();
      expect(await ethers.provider.getBalance(await ruveq.getAddress())).to.equal(0);
      expect(await ethers.provider.getBalance(REVENUE)).to.equal(
        revenueBefore + ethers.parseEther("0.01")
      );
    });
  });
});
