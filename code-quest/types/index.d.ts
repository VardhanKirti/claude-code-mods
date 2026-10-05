export type Reward = { xp: number; label: string };

export type Quest = {
  xp: number;
  objective: string | null;
  reads: number;
  edits: number;
  testsPassed: number;
  commits: number;
  questsDone: number;
  rewards: Reward[];
  achievements: string[];
};

declare module "claude-code" {
  interface PluginState {
    "code-quest": { quest: Quest };
  }
}
