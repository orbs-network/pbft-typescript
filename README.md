# PBFT-Typescript

*Work in progress, do not use in production.*

This library is a PBFT implementation of the PBFT algorithm (Practical Byzantine Fault Tolerance).

## Algorithm
TODO: Flow
* Terminology: term; view; node; leader;
* Initial setup: leader; storage; term; view
* PBFT phases
* Passing data between nodes: messages; filters; Gossip
* Leader change: request view change; election; new view

Leader stores Prepare in Log
Leader boradcasts preprepare to all nodes
Node x receives onPreprepare; logs preprepare and its own Prepare
Node x broadcasts prepare
Node receives prepare, once it receives 2f+1 of those, it stores a commit and sends it out
Node receives 2f+1 commits - it commits to its blockchain and deletes from Log.

Node is created with PBFT with Config
Node calls PBFT.start() after init (it should know all other nodes first, as optimization)
External invocation of start() happens just once in the beginning.
start() gets block height

What can advance the flow: gossip events and election trigger.

Exponential timeouts


## API





## Developer notes

### Classes

#### PBFT
There is a single instance of `PBFT` class. It handles multiple *term*s.

* `start()` disposes of the previous `PBFTTerm` and creates a new one.
The Node calls it once initially when it starts. Subsequent calls to `start()` are made inside the callback `onCommittedBlock()`.

createPBFTTerm(): holds CB when block can be committed. The CB notifies listeners and advancesd PBFTTerm.


#### PBFTTerm
Each *term* has a separate instance of `PBFTTerm`.

* `startTerm()`: calls setView(), if node is not leader, it waits.
* `isLeader()`
* `dispose()`
* `onLeaderChange()` - callback
* setView() -



#### PBFTMessagesHandler
* `onReceivePrePrepare()`
* `onReceivePrepare()`
* `onReceiveViewChange()`
* `onReceiveCommit()`
* `onReceiveNewView()`: receive from new alleged leader along with required proofs.


#### NetworkMessagesFilter
Single instance per PBFT - holds messages from different block heights
* `NetworkCommunication` implementation of Gossip layer - discovery of member nodes; subscribe/unsubscribe to messages; send messages


* onCommittedCB


#### ViewState
REMOVING THIS - It only wraps ElectionTrigger so no need for it.
Holds the Election Trigger which is an exponential timer, that triggers if until the timeout, the current leader could not reach consensus in its suggested block.
* `newLeaderCallback()`



#### Config

#### BlockUtils
  * `requestNewBlock()`
  * `validateBlock()`
  * `calculateBlockHash()`

#### ElectionTrigger
This is a timer which triggers when the current leader failed to reach consensus on the current block after some configurable time.
* view - the view of this trigger
* `register()`

#### PBFTStorage
Implemented by InMemoryPBFTStorage
##### Methods
* `storePreprepare()`:
* `storePrepare()`:
* `storeCommit()`:
* `storeViewChange()`:
There are matching getter functions

`TermsMap` is a mapping (term -> (view -> payload))


## Running
### Tests
On the project directory run: `npm run tdd`


## See also
[Orbs website](https://orbs.com/)




## To do

- [x] Remove node types from the tests
- [x] PBFT onLeaderChange should count itself
- [x] Generate new block via a blocks provider?
- [x] on new-view the new leader is not counting itself (not logging the PP before sending the new-view)
- [x] implement new-view
- [x] we should have a timer for each view. new-view shouldn't restart a timer if it's already started.
- [x] suggest block in new-view (inside PP)
- [x] Convert getBlock of "BlocksProvider" to async.
- [x] the onElected will trigger new-view more than once
- [x] new-view shouldn't restart a timer if it's already started.
- [x] Unsubscribe gossip on dispose of PBFT
- [x] Separate the PBFT to a 1-Height-PBFT and a full PBFT.
- [x] add isMember, and call it from pbft
- [x] missing protection against byzantine attacks with wrong term/senderId etc.
- [x] make sure on onReceiveNewView the PP.view === view
- [x] protect against wrong view in PBFTTerm
- [x] protect against bad leader messages
- [x] publish on npm
- [x] the PP validation should be extracted and used on new view PP
- [x] onReceiveNewView should match the PP.view with the view
- [x] onReceiveNewView should validate the given PP
- [x] use BlockStorage interface
- [x] publish the public types on the root of the library (import { Config } from 'pbft-typescript')
- [x] intellisense is not working for pbft-typescript imports
- [x] BlockStorage interface async compatible.
- [x] BlockStorage interface remove 'appendBlockToChain'.
- [x] add the git repo to the npm site
- [x] Rename OnNewBlock to OnCommitted(Block)
- [x] BlcokStorage.getTopMostBlock() => convert to BlcokStorage.getLastBlockHash()
- [x] BlocksProvider.getBlock() change to requestNewBlock(blockHeight: number)
- [x] BlockStorage: remove getBlockHashOnHeight(), getBlockChainHeight().
- [x] Convert "registerOnCommitted" to async.
- [x] Default implementations of: PBFTStorage.
- [x] Add "restart" to PBFT api
- [x] term should be taken from the height of the latest block (Use the BlockStorage)
- [x] Implement "registerOnCommitted" to async.
- [x] Implement "restart" to PBFT api
- [x] KeyManager passed in config
- [x] NetworkCommunication interface: { `getMembersPKs(height, seed)`, `sendToMembers([pk])`, `subscribeToMessages(cb)`, `unsubscribeFromMessages`}
- [x] Remove senderId from Gossip -> Use PK instead
- [x] Network rename NetworkCommunication
- [x] Block interface {header}
- [x] getNetworkMembersPKs(seed: string): string[]; // ordered
- [x] getHeight should by async
- [x] BlockUtils.calculateBlockHash(blockHeader) - bytes vs string?
- [x] Remove BlockStorage, instead cache the last committed block
- [x] BlockUtils - requestNewBlock and validate => use lastBlockHeader
- [x] KeyManager implementation.
- [x] Make BlockUtils external
- [x] remove blockProvider & blockValidator
- [x] PBFT.start should work with height
- [x] TDD trigger once
- [x] Cache future messages and consume on each new term
- [x] CommitBlock - commit the matching preprepared block in the pbftstorage - not the temp in state (this.CB)
  
## None Blockers

- [x] call the clear pbftStorage after commit.
- [x] set the committee members pks in the PBFTTerm constructor
- [x] clear the pbftStorage
- [x] suggest block in new-view (inside PP), with proofs from other nodes.
  - [x] choose the "best" block (Out of view-change proofs) to offer on new-view
  - [x] on new-view verify that the leader offered the "best" block
  - [x] PrePrepare Compare given blockHash with the hash of the given block
  - [x] Storage - store payloads
  - [x] GetLatestPreparedProof from storage
  - [x] Add proof validator that can validate the prepred proof
    - [x] Test for matching view/leader
    - [x] Make sure the preprepare hold a block
    - [x] count null as a valid proof
    - [x] Verify the payloads
    - [x] Test that the pk is in the committee!
    - [x] Make sure that the prepares are not from the leader
    - [x] Prepared proof is valid only if it has 2f+1
  - [x] send the proof on view change
  - [x] validate the proof on view change
  - [x] on generate new-view add the view-change proof.
  - [x] extract ViewChange tests from onReceiveViewChange to a reusable function
  - [x] onReceiveNewView verify the proof
    - [x] not undefined
    - [x] isArray
    - [x] 2f+1 proofs
    - [x] validate using isViewChangePayloadValid
    - [x] all proofs senders a unique
    - [x] all VC terms match the given term
    - [x] all VC views match the given view

- [x] (Gil) - validate all signed messages
- [x] Remove ViewState
- [ ] remove unsubscribeFromMessages
- [ ] 
- [ ] (Gad) - Check state still holds after async await functions (ex: when returning from requestNewBlock - view has changed)
- [ ] (Gad) - Think about view-change counting, when to count myself.
- [ ] (Gad) - code review
- [ ] (Ido) documentation

## will be done in Go

- [ ] allow to config the sockets logger's target server ip
- [ ] add isACommitteeMember to PBFTTerm
- [ ] Change logging methodology - warning - added metadata
- [ ] Have a better (Readable) tests solution to await nextTick
- [ ] monitoring/debug
- [ ] Optimizations: IData - Signature only on hash(header).
- [ ] implement `verifyBlock`
- [ ] PBFT-BC onCommitted - adds header.pbftData.pbftProof
