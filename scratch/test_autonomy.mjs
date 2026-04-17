import { runAgenticTask } from '../lib/orchestrator.js';

// Setup Mock Environment variables if needed
// process.env.OPENROUTER_API_KEY = "dummy"

async function testAutonomy() {
  console.log("Starting Autonomy Test...");

  const taskDesc = `
  Please write a 'hello-world.txt' file in your local directory containing the text: "Hello World, I am autonomous!"
  You must use the write_file tool to complete this task. Do not just output the text.
  `;

  try {
    const result = await runAgenticTask({
      task: taskDesc,
      providerMode: "auto",
      objective: "speed"
    });

    console.log("=== RUN COMPLETE ===");
    console.log(`Latency: ${result.phases.reduce((acc, p) => acc + p.latencyMs, 0)}ms`);
    console.log("Final Answer:");
    console.log(result.finalAnswer);
    
    // Quick debug of phase loops
    for (const phase of result.phases) {
        console.log(`Phase [${phase.name}] used model: ${phase.model}`);
    }

  } catch (err) {
    console.error("Test failed with error:");
    console.error(err);
  }
}

testAutonomy();
