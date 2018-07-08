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
- [ ] publish the public types on the root of the library (import { Config } from 'pbft-typescript')
- [ ] intellisense is not working for pbft-typescript imports
- [ ] add the git repo to the npm site
- [ ] term should be taken from the height of the latest block (Use the BlockStorage)
- [ ] clear the pbftStorage
- [ ] trigger once, prepared, elected, new-view, committed.
- [ ] suggest block in new-view (inside PP), with proofs from other nodes.
- [ ] Nodes can pretend to be other nodes => sign all messages
- [ ] sign messages including the message type
- [ ] documentation
