# PBFT
> PBFT blockchain oriented algorithm.

## Architecture - components and interfaces

#### Consensus Algo
* Interfaces:
  * `SetTime(height, force)` - update state according to future height (force=true for rollback).
  * `Commit (block, pbft_proof)` - emit commit event. 
  * `AcknowledgeBlockConsensus (block headers + proof)` - verify valid pbft_proof (deduce members). 
  * `CheckPBFTProof (pbft_proof, block_hash, nodes_list)` - validates a pbft proof for a specific block hash.
  * Used by 'One Height PBFT':  
    * `CommitBlock (block, 2f+1 commits)` - triggered by 'One height PBFT', aggregates a pbft_proof, dispose one height, emit commit(block, pbft_proof) event.
    * Provided by 'ConsensusContext' (all blockchain functionality): 
    * `RequestNewBlock(height) : block` - called by the One height PBFT, returns a block proposal. Only if blockProvider.last_committed.height + 1 == height
    * `ValidateBlock(height, block) : valid` - called by the One height PBFT  Implicit block.height. Validate prev block hash consistency. , valdiates a block proposal PBFT consistency (headers, permissions, blockchain state). Call ConsensusContext.`ValidateBlock(height, block)`
    * `CalcBlockHash(block) : block_hash` - called by the One height PBFT, calculates the hash on a block based on the hashing scheme.

* Internal methods:
  * `GeneratePBFTProof (2f+1 commits, block_hash)` - generate a pbft proof for a specific block hash.


Config:
* Gossip - subscribe on Gossip and filter by height, passed to PBFT one height.
* Network - Membership management  `GetNodesList(height)` - Returns an ordered nodes list.
* BlockUtils.
* Storage.
* 



#### GossipFilter
* Interfaces:
  * `GossipMessageReceived` - triggered by the gossip service upon message received with ConensusAlgo topic (sorted by height).
  * `SetHandler (height, handler)` - push messages, with relevant height, to handler.


# HelixWrapper
> Helix implementation on top of blockchain PBFT.

#### Consensus Algo
* Interfaces:
  * `New ()` - could be triggered internally upon block n-1 commit.
  * `Commit (block, proof)` - emit commit event. 
  * `AcknowledgeCommittedBlock (block headers + proof)` - verify valid block proof (deduce members and pbft_proof). 
  * 
  * Used by 'PBFT':  
    * `CommitBlock (block, pbft_proof)` - triggered by 'PBFT', aggregates threshold signatures, emit commit(block, proof) event.
    * `RequestNewBlock() : block` - called by PBFT, returns a block proposal.
    * `ValidateBlock(block) : valid` - called by PBFT, valdiates a block proposal.
    * `CalcBlockHash(block) : block_hash` - called by PBFT, calculates the hash on a block based on the hashing scheme.

#### GossipFilter
* Interfaces:
  * `GossipMessageReceived` - triggered by the gossip service upon message received with ConensusAlgo topic (prevalidates threshold signature).
  * `SetHandler (height, handler)` - push messages, with relevant height, to handler.






#### GossipFilter
* Interfaces:
  * `GossipMessageReceived` - triggered by the gossip service upon message received with ConensusAlgo topic (sorted by height).
  * `SetHandler (height, handler)` - push messages, with relevant height, to handler.


#### PBFTTerm
* Interfaces:
  * `PerformConsensus(block_height, node_list)` - perfroms a single block height consensus. 
  * `Dispose()`  
  * PBFT Message processing:
    * `OnPrePrepareReceived (PrePrepare)`
    * `OnPrepareReceived (Prepare)`
    * `OnCommitReceived (Commit)`
    * `OnViewChangeReceived (ViewChange)`
    * `OnNewViewReceived (NewView)`

* Internal methods:
  * `ValidateBlock(block)` - validates block height - pointing to last_committed. Call PBFT.`ValidateBlock(block)`.  
  * `GetCurrentLeader (nodes_list, view)` - internal, calcualtes the leader for the view based on  `ConsensusAlgo.GetNodesList()`.
  * `OnPrepared`   (trigger at most once per view)
  * `OnCommitted`  (trigger at most once)
  * `Stop()` 



&nbsp;
## `OnInit`
> Perfromed upon the service init
* Read persistent data:
  * my_state.Block_height
  * my_state.View
  * Candidate_block
  * Candidate_block_hash
  * Prepared_proof



## Configuration
> Held by each node consensus algorithm, read from configuration file \ genesis block upon init
* Nodes_list - ids
* f_byzantine - max number byzantine nodes (default - 2/3 nodes_list_size + 1)
* Cryptographic keys



## Databases

#### Future Messages Cache
> Stores messages of future block_heights until block_height update.
* Accessed by (Block_height, View, Sender)
* Persistent
* Stores messages with valid signature, avoid storing duplciates, i.e. an honest sender may only send one valid message type per {Block_height, View}


#### PBFT Verifier
* `Interfaces: 
  



## Design notes
* Stores messages of future block_heights.
* Erases past block_height PBFT logs on commit.  





&nbsp;
## `Init` (flow)

* Initialize the configuration.
* Load persistent data.
* Subscribe to gossip messages in the relevant consensus topic by calling `Gossip.TopicSubscribe`.
* Start the consensus algorithm.



&nbsp;
## `Start(Height)` 



&nbsp;
## `AcknowledgeCommittedBlock` (method)


&nbsp;
## `Start` 










## Design notes
* PREPARE and COMMIT messages are broadcasted to all nodes.
* The sync flow is performed outside the scope of the OneHeight PBFT
* View Change message sent by a prepared node includes the candidate block
  * May add a request / response message as optimization
* New View includes all the view change proofs and a signed NV_PRE_PREPARE
  * May add an optimization to avoid n^2 signatures in new view
* A block can be committed (Commit_locally) even if not in Prepared state. (The block was received in PRE_PREPARE or NV_PRE_PREPARE).
* COMMIT messages of earlier views are accepted.
* Continuously trying to achieve consensus on blocks (incurs communication overhead in idle times).






  