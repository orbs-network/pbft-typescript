# PBFT-Typescript

*Work in progress, do not use in production.*

This library is a PBFT implementation of the PBFT algorithm (Practical Byzantine Fault Tolerance).

## To do

- [V] Remove node types from the tests
- [V] PBFT onLeaderChange should count itself
- [V] Generate new block via a blocks provider?
- [ ] implement new-view
- [ ] suggest block in new-view (inside PP)
- [ ] extract block util
- [ ] trigger once, prepared, elected, new-view, committed.
- [ ] missing protection against byzantine attacks with wrong term/view/message/senderId etc.
- [ ] Nodes can pretend to be other nodes => sign all messages
- [ ] Unsubscribe gossip on dispose of PBFT
- [ ] timeout should be configurable, currently values are hardcoded in the tests and builder
- [ ] timed tests are flaky
- [ ] add isMember, and call it from pbft
