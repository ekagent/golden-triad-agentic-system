# Autonomy & Function Calling 

As of the **AUTON-1** and **AUTON-2** milestones, the Golden Triad system features a complete interactive action loop enabling the `Builder` and `Reviewer` agents to interact natively with their environment.

## The Execution Loop
Instead of blocking blindly for a text completion, `lib/orchestrator.js` implements `runLaneIterations`. The runtime:
1. Feeds the entire conversation context to the LLM (`generateFromLane` in `lib/provider-client.js`).
2. Listens for **Tool Calls** utilizing the OpenAI/OpenRouter generic function calling specification.
3. Automatically halts the agent, extracts the requested tool calls, and evaluates them securely in Node.js via `executeToolCall()`.
4. Wraps the results in a \`role: "tool"\` message and restarts the LLM generation loop organically until the LLM returns text answering the objective.
5. Employs a strict `MAX_TOOL_LOOPS = 5` circuit breaker to prevent infinite loops and runway budget drains.

## The Filesystem Sandbox Layer
The primary execution environment is mapped in `lib/tools.js`. 
- To ensure absolute safety, the underlying filesystem tools inherently block attempts via `sanitizePath` to access directories outside of a local `/workdir`.
- Supported autonomous operations currently include `read_file`, `write_file`, and `list_dir`.
