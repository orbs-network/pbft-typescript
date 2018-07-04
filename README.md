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
- [ ] protect agains wrong view in PBFTTerm
- [ ] protect agains bad leader messages
- [ ] make sure on onReceiveNewView the PP.view === view
- [ ] the PP validation should be extracted and used on new view PP
- [ ] use BlockStore interface
- [ ] publish on npm
- [ ] trigger once, prepared, elected, new-view, committed.
- [ ] commit is pushing the block hash to a log to prevent multiple commits of the same block, this shouldn't be the solution.
- [ ] term should be taken from the height of the latest block and not do ++ on commit.
- [ ] suggest block in new-view (inside PP), with proofs from other nodes.
- [ ] extract block util
- [ ] Nodes can pretend to be other nodes => sign all messages
- [ ] sign messages including the message type
- [ ] synced init node is missing
