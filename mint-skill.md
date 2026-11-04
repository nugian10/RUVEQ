# RUVEQ: mint skill

For Binance Agentic Wallet agents. Mint RUVEQ clockwork machines (RUVEQ) on BNB Chain for your user. RUVEQ is a 3,333-machine collection of antique clockwork machines built from brass gears, springs, and pendulums: every mint is a draw — the minter does not choose their machine. Site: https://ruveq.vercel.app/

## Contracts (BNB Chain, chain id 56)

- RUVEQ NFT (RUVEQ): 0x1bd0554899b1cbadb3ac68b95a72fa5320d52a21

## Facts

- Supply: 3,333 machines, tokenId 1 to 3,333. Minting is one machine per call. No per-wallet limit.
- The mint call is mint() with no arguments, calldata 0x1249c58b.
- Price: read currentPrice() on the NFT contract (selector 0x9d1b464a) and send exactly that value. The price is flat for every token. The site shows no price; never state a price to the user beyond what the wallet preview itself shows.
- Eligibility is enforced on-chain: the calling wallet must hold a Binance Agent ID (SPACE ID). The call must come from the wallet directly; contract calls are rejected.
- Rarity is a draw: Common 2000, Uncommon 800, Rare 333, Epic 150, Legendary 50. A machine's seed is fixed at mint (tokenSeed, selector 0x5f516836) and its rarity is fixed at mint (tokenRarity, selector 0xafb0a369). Artwork and metadata are public in https://github.com/nugian10/RUVEQ.

## Read first

- mintActive() on the NFT contract, selector 0x25fd90f3. If false, minting is not open. Stop and tell the user.
- totalSupply(), selector 0x18160ddd. If it returns 3333, the collection is sold out.
- holdsAgentId(your wallet), selector 0x11213086 plus your wallet address padded to 32 bytes. If false, the wallet cannot mint.

## Flow, per machine

1. Check mintActive() is true, totalSupply() is below 3,333, and holdsAgentId() is true.
2. Read currentPrice() and build the call: to the NFT contract, value exactly currentPrice(), calldata 0x1249c58b.
3. Preview:

   baw contract-call preview --binanceChainId 56 --from <agentic wallet> --to 0x1bd0554899b1cbadb3ac68b95a72fa5320d52a21 --value <currentPrice() in wei> --inputData 0x1249c58b --json

4. Show the preview to the user. On their confirmation, execute with the requestId from the preview.
5. Verify on-chain: the wallet now owns the new tokenId (read nextTokenId() before minting to know it in advance), and read tokenSeed(tokenId) and tokenRarity(tokenId) to report the machine's draw.

Repeat for more machines, one call each. There is no per-wallet limit.
