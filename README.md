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
- [V] NetworkCommunication interface: { `getMembersPKs(height, seed)`, `sendToMembers([pk])`, `subscribeToMessages(cb)`, `unsubscribeFromMessages`}
- [V] Remove senderId from Gossip -> Use PK instead
- [V] Network rename NetworkCommunication
- [V] Block interface {header}
- [V] getNetworkMembersPKs(seed: string): string[]; // ordered
- [V] getHeight should by async
- [V] BlockUtils.calculateBlockHash(blockHeader) - bytes vs string?
- [V] Remove BlockStorage, instead cache the last committed block
- [V] BlockUtils - requestNewBlock and validate => use lastBlockHeader
- [V] KeyManager implementation.
- [V] Make BlockUtils external
- [V] remove blockProvider & blockValidator
- [V] PBFT.start should work with height
- [V] TDD trigger once

## None Blockers

- [!] suggest block in new-view (inside PP), with proofs from other nodes.
  - [V] PrePrepare Compare given blockHash with the hash of the given block
  - [V] Storage - store payloads
  - [V] GetLatestPreparedProof from storage
  - [V] Add proof validator that can validate the prepred proof
    - [V] Test for matching view/leader
    - [ ] Test that the pk is in the committee!
    - [ ] Verify the payloads
    - [ ] Make sure the preprepare hold a block
    - [ ] count null as a valid proof
  - [ ] send the proof on view change
  - [ ] on generate new-view add all the view-change proofs with a PP.
  - [ ] on new view verify the proof
  - [ ] sign messages
- [V] clear the pbftStorage
- [ ] Ask Eran, how byzantine tolerant should we be. and create tests accordingly
- [ ] send the committee members pks in the PBFTTerm constructor
- [ ] Think about view-change counting, when to count myself.
- [ ] call the clear pbftStorage after commit.
- [ ] add isACommitteeMember to PBFTTerm
- [ ] Change logging methodology - warning - added metadata
- [ ] PBFT-BC onCommitted - adds header.pbftData.pbftProof
- [ ] implement `verifyBlock`
- [ ] Have a better (Readable) tests solution to await nextTick
- [ ] documentation
- [ ] monitoring
- [ ] Optimizations: IData - Signature only on hash(header).
- [ ] Rename PBFT to PBFTBlockChain
