// Measure RuveqNFT deploy gas on a local Hardhat network.
// Run: npx hardhat run scripts/measure-gas.js
const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {
  const deckJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "..", "scripts", "deck.json"), "utf8")
  );
  const deck = ethers.getBytes("0x" + deckJson.deck.map((t) => t.toString(16).padStart(2, "0")).join(""));
  const F = await ethers.getContractFactory("RuveqNFT");
  const c = await F.deploy(
    "0x0262e8e5E4584D8AB840fD950a6E2E0A414d4097",
    "0x89c37649Ba3BAA9E1ce028612b7DE4e9c3a947B7",
    "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F",
    "https://raw.githubusercontent.com/nugian10/RUVEQ/main/collection/metadata/",
    deck
  );
  const r = await c.deploymentTransaction().wait();
  const code = await ethers.provider.getCode(await c.getAddress());
  console.log("RUVEQ deploy gasUsed:", r.gasUsed.toString());
  console.log("runtime bytes:", (code.length - 2) / 2);
  console.log("on-chain deckHash:", await c.deckHash());
}

main().catch((e) => { console.error(e); process.exit(1); });
