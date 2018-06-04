# PBFT-Typescript

*Work in progress, do not use in production.*

This library is a PBFT implementation of the PBFT algorithm (Practical Byzantine Fault Tolerance).

## To do

- [V] Remove node types from the tests
- [V] PBFT onLeaderChange should count itself
- [V] Generate new block via a blocks provider?
- [ ] implement new-view
- [ ] missing protection against byzantine attacks with wrong term/view
- [ ] add isMember, and call it from pbft
- [ ] timeout should be configurable, currently values are hardcoded in the tests and builder
- [ ] timed tests are flaky
- [ ] Nodes can pretend to be other nodes => sign all messages
- [ ] Unsubscribe gossip on dispose of PBFT
