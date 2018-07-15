# PBFT-Typescript

*Work in progress, do not use in production.*

This library is a PBFT implementation of the PBFT algorithm (Practical Byzantine Fault Tolerance).

## To do

- [V] Remove node types from the tests
- [V] PBFT onLeaderChange should count itself
- [V] Generate new block via a blocks provider?
- [V] on new-view the new leader is not counting itself (not logging the PP before sending the new-view)
- [V] implement new-view
- [V] we should have a timer for each view. new-view shouldn't restart a timer if it's already started.
- [V] suggest block in new-view (inside PP)
- [V] Convert getBlock of "BlocksProvider" to async.
- [V] the onElected will trigger new-view more than once
- [V] new-view shouldn't restart a timer if it's already started.
- [V] Unsubscribe gossip on dispose of PBFT
- [V] Separate the PBFT to a 1-Height-PBFT and a full PBFT.
- [V] add isMember, and call it from pbft
- [V] missing protection against byzantine attacks with wrong term/senderId etc.
- [V] make sure on onReceiveNewView the PP.view === view
- [V] protect against wrong view in PBFTTerm
- [V] protect against bad leader messages
- [V] publish on npm
- [V] the PP validation should be extracted and used on new view PP
- [V] onReceiveNewView should match the PP.view with the view
- [V] onReceiveNewView should validate the given PP
- [V] use BlockStorage interface
- [V] publish the public types on the root of the library (import { Config } from 'pbft-typescript')
- [V] intellisense is not working for pbft-typescript imports
- [V] BlockStorage interface async compatible.
- [V] BlockStorage interface remove 'appendBlockToChain'.
- [V] add the git repo to the npm site
- [V] Rename OnNewBlock to OnCommitted(Block)
- [V] BlcokStorage.getTopMostBlock() => convert to BlcokStorage.getLastBlockHash()
- [V] BlocksProvider.getBlock() change to requestNewBlock(blockHeight: number)
- [V] BlockStorage: remove getBlockHashOnHeight(), getBlockChainHeight().
- [V] Convert "registerOnCommitted" to async.
- [V] Default implementations of: PBFTStorage.
- [V] Add "restart" to PBFT api
- [V] term should be taken from the height of the latest block (Use the BlockStorage)
- [V] Implement "registerOnCommitted" to async.
- [V] Implement "restart" to PBFT api
- [V] KeyManager passed in config
- [ ] Committee interface: { `getCommitteeMembersPKs(height, seed)`, `sendToMembers([pk])`, `subscribeToMessages(cb)`, `unsubscribeFromMessages`}
- [ ] Remove senderId from Gossip -> Use PK instead
- [ ] KeyManager implementation.
- [ ] PBFT-BC add CalculateBlockHash internally
- [ ] PBFT-BC override RequestNewBlock - adds header.pbftData.prevBlockHash
- [ ] PBFT-BC onCommitted - adds header.pbftData.pbftProof
- [ ] PBFT public interface {trigger `committed`, `verifyBlock`, `start`, `stop`, `restart`}
- [ ] Network rename Committee
- [ ] Move `isMemeber(pk)`, `getLeader(view)`, `getCommitteeCount()`, to PBFTTerm internal methods 
- [ ] Block interface {header}
- [ ] Merge BlockValidator into BlocksProvider.
- [ ] getNetworkMembersPKs(seed: string): string[]; // ordered 
- [ ] 
- [ ] Rename this.term => this.height
- [ ] BockProvider => rename BlockUtils
- [ ] BlockUtils interface implement.
- [ ] Have a better (Readable) tests solution to await nextTick
- [ ] Rename Network interface
- [ ] clear the pbftStorage
- [ ] sign messages including the message type
- [ ] trigger once, prepared, elected, new-view, committed.
- [!] suggest block in new-view (inside PP), with proofs from other nodes.
- [ ] documentation
- [ ] monitoring
- [ ] Optimizations: IData - Signature only on hash(header).
- [ ] Network: Responsible for MAP: PK - nodeAddress
- [?] Sync from external source.
- [ ] Rename PBFT to PBFTBlockChain
