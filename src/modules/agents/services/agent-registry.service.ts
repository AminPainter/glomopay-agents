import { Agent } from 'ai';

// The SDK `Agent` is generic over its tool set; the params are contravariant, so a
// tool-typed agent is not assignable to the default empty-tools `Agent`. Widen the
// generics so any agent — `ToolLoopAgent`, future `HarnessAgent` — fits the map.
export type RegisteredAgent = Agent<never, any>;

export class AgentRegistry {
  constructor(private readonly agents: Map<string, RegisteredAgent>) {}

  get(key: string): RegisteredAgent {
    const agent = this.agents.get(key);
    if (!agent) throw new Error(`No agent registered for key "${key}"`);
    return agent;
  }

  keys(): string[] {
    return [...this.agents.keys()];
  }
}
