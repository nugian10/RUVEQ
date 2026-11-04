# RuveqNFT — Smart Contract

ERC-721, BNB Smart Chain Mainnet (chain ID 56). Modelled on the proven
OOBIX v2 pattern (WEDO model), flat price, no per-wallet limit.

## Spec (confirmed by Nugraha, 4 Nov 2026 — "pola oobix v2 tapi flat")

| Item | Value |
|---|---|
| Name / symbol | Ruveq / RUVEQ |
| MAX_SUPPLY | 3,333 (token IDs 1–3,333, sequential) |
| Price | Flat **0.0003 BNB** for every token (`currentPrice()`) |
| mint() | No arguments, 1 token per call, exact payment only |
| Agent gate | SPACE ID Agent ID, registry `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` (owner can disable) |
| NoContracts | Calls from contracts revert |
| Max per wallet | **None** (OOBIX v2 rule; `mintedBy` is a counter only, never enforced) |
| Rarity | Common 2000 / Uncommon 800 / Rare 333 / Epic 150 / Legendary 50 |
| deckHash | `0x1c41cd1f1305d3227b896c0c6985e6c370b7bac4b6cc6ad2be5af31248a9e8c1` |
| Payment | Forwarded directly to revenue wallet inside `mint()` — contract balance stays 0 |
| Owner | My Wallet `0x0262e8e5E4584D8AB840fD950a6E2E0A414d4097` |
| Revenue | Binance Agentic Wallet `0x89c37649Ba3BAA9E1ce028612b7DE4e9c3a947B7` |
| baseURI | `https://raw.githubusercontent.com/nugian10/RUVEQ/main/collection/metadata/` |
| mintActive | Default `false`; only the owner can activate |

## ⚠️ Collection not pushed yet

The 3,333 collection files (metadata + SVGs) are **NOT on GitHub yet**
(4 Nov 2026). Mint must stay inactive until they are live at the baseURI
above — otherwise `tokenURI` would 404 for every minted token. The deploy
script warns about this and does not activate minting.

## deckHash convention — read this

The recorded deckHash is **SHA-256 of the deck's compact JSON encoding**
(`"[0,0,1,2,...]"`), as computed by the deck generator
(`scripts/deck.json`, seed `RUVEQ-DECK-SEED-2026-11-04-v1`). It is **NOT**
keccak256 of the raw deck bytes — that would be a different value.

`deckHash()` on-chain rebuilds that exact JSON encoding from the stored
deck and returns its SHA-256, so the on-chain value equals the recorded
one exactly. Verified off-chain and on-chain in the test suite.
Anyone can re-check it with:
`sha256(json.dumps(deck, separators=(",", ":")).encode())`.

## Files

- `contracts/RuveqNFT.sol` — the contract
- `contracts/mocks/MockAgentIdNFT.sol` — test-only mock registry + mock contract caller
- `test/RuveqNFT.test.js` — tests (see below)
- `scripts/deploy.js` — mainnet deploy script (owner runs it; verifies deck hash off-chain first, aborts on mismatch)
- `scripts/measure-gas.js` — local deploy gas measurement
- `hardhat.config.js` — Solidity 0.8.24, optimizer runs 200, cancun, BSC + BSC testnet
- `AGENTIC-DEPLOY-PROMPT.md` — prompt for the owner's own agent to deploy

## Tests

```bash
npx hardhat test   # 22 passing
```

Measured 4 Nov 2026 (local Hardhat): deploy gas 5,558,917
(~0.0002779 BNB at 0.05 gwei, ~Rp 3,500); runtime 9,475 bytes
(limit 24,576); on-chain `deckHash()` =
`0x1c41cd1f1305d3227b896c0c6985e6c370b7bac4b6cc6ad2be5af31248a9e8c1` — exact match.

Covered: deployment values, flat price for every token ID, no per-wallet
limit (constant + error do not exist; one wallet mints 15 times), deckHash
exact match (off-chain + on-chain), deck counts, rarityOf vs deck.json,
wrong-deck rejection (bad counts, wrong length), Agent ID gate pass/fail,
NoContracts, mint inactive, exact-payment enforcement, mint #1 (rarity,
seed, tokenURI, payment forwarded, contract balance 0), gate disable by
owner, owner-only admin, price change locked after first mint, zero price
rejected, withdraw safety valve.

No audit — BscScan source verification is not an audit.
