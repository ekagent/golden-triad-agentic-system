# System Architecture - The Golden Triad

The core concept of the Agentic Ecosystem relies on isolating work into three distinct roles passed sequentially through an orchestration loop. 

## The Triad Model

1. **Architect**
   - **Role**: Takes the overarching user prompt/mission and designs a structured technical plan.
   - **Characteristics**: Focuses on "what" needs to be done. Has high context windows but does not execute logic.

2. **Builder**
   - **Role**: Ingests the Architect's plan and begins generating implementation details.
   - **Characteristics**: Given access to **Tool Calling** schemas so that it can write files or run verifications natively. 
   - **Iteration Limit**: Will loop against the environment up to 5 times (Thought-Action-Observation) to accomplish its task.

3. **Reviewer**
   - **Role**: Parses the output of the Architect and Builder. Evaluates correctness against the `objective` (either Golden/Speed/Power).
   - **Characteristics**: Identifies unmitigated risks, returns a final structured output comprising `finalAnswer`, `fixes`, and `risks` that the user interfaces with.

## Model Routing ("Golden Rule")
The system implements a complex routing layer in `lib/golden-rule.js` and `lib/orchestrator.js`. Based on dynamic telemetry and health metrics evaluated against **GLM**, **Memo**, and **OpenRouter**, the system intelligently selects the most performant model at runtime, optimizing for stability and intelligence.
