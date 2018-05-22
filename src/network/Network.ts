export interface Network {
    getNodeIdBySeed(seed: number): string;
    getNodesCount(): number;
}