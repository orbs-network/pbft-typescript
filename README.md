# PBFT-Typescript

*Work in progress, do not use in production.*

This library is a PBFT implementation of the PBFT algorithm (Practical Byzantine Fault Tolerance).

## Algorithm

* Flow
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

#### NetworkMessagesFilter

Single instance per PBFT - holds messages from different block heights

* `NetworkCommunication` implementation of Gossip layer - discovery of member nodes; subscribe/unsubscribe to messages; send messages
* onCommittedCB

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

## To do

* [ ] (Gil) messages should include message type (string)
* [ ] (Gad) - Check state still holds after async await functions (ex: when returning from requestNewBlock - view has changed)
* [ ] (Gad) - Think about view-change counting, when to count myself.
* [ ] (Gad) - code review
* [ ] (Ido) documentation

## Future

* [ ] allow to config the sockets logger's target server ip
* [ ] add isACommitteeMember to PBFTTerm
* [ ] Change logging methodology - warning - added metadata
* [ ] Have a better (Readable) tests solution to await nextTick
* [ ] monitoring/debug
* [ ] Optimizations: IData - Signature only on hash(header).
* [ ] implement `verifyBlock`
* [ ] PBFT-BC onCommitted - adds header.pbftData.pbftProof
