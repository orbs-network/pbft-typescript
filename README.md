# PBFT-Typescript

This is a work in progress, do not use in production.

## To do

- [ ] Remove node types from the tests
- [ ] implement new-view
- [ ] How do we generate a new block?
- [ ] missing protection against byzantine attacks with wrong term/view
- [ ] add isMember, and call it from pbft
- [ ] timeout should be configurable, currently values are hardcoded in the tests and builder
- [ ] timed tests are flaky
- [ ] Nodes can pretend to be other nodes => sign all messages
- [ ] Unsubscribe gossip on dispose of PBFT
- [ ] PBFT onLeaderChange should count itself
