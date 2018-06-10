# PBFT-Typescript

*Work in progress, do not use in production.*

This library is a PBFT implementation of the PBFT algorithm (Practical Byzantine Fault Tolerance).

## To do

- [V] Remove node types from the tests
- [V] PBFT onLeaderChange should count itself
- [V] Generate new block via a blocks provider?
- [ ] the onElected will trigger new-view more than once
- [ ] on new-view the new leader is not counting itself (not logging the PP before sending the new-view)
- [ ] implement new-view
- [ ] we should have a timer for each view. new-view shouldn't restart a timer if it's already started.
- [ ] term should be taken from the height of the latest block and not do ++ on commit.
- [ ] commit is pushing the block hash to a log to prevent multiple commits of the same block, this shouldn't be the solution.
- [ ] suggest block in new-view (inside PP)
- [ ] extract block util
- [ ] trigger once, prepared, elected, new-view, committed.
- [ ] missing protection against byzantine attacks with wrong term/view/message/senderId etc.
- [ ] Nodes can pretend to be other nodes => sign all messages
- [ ] Unsubscribe gossip on dispose of PBFT
- [ ] timeout should be configurable, currently values are hardcoded in the tests and builder
- [ ] timed tests are flaky
- [ ] add isMember, and call it from pbft
