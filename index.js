import { ChatGroq } from "@langchain/groq";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import readline from "node:readline/promises";


// initiallize the LLM
const llm = new ChatGroq({
   model: "openai/gpt-oss-120b",
   temperature: 0,
   maxRetries: 2,
   // other params..
})

// 1. call the model
async function callModel(state) {
   console.log("calling LLM...");
   const response = await llm.invoke(state.messages);
   return { messages: [response] };
}

// 2. Build the graph
const workflow = new StateGraph(MessagesAnnotation)
   .addNode("agent", callModel)
   .addEdge("__start__", "agent").addEdge("agent", "__end__");


// 3. compile and invoke the graph
const app = workflow.compile();



async function main() {
   const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
   });
   while (true) {
      const userInput = await rl.question("You: ");
      if (userInput === "/bye") {
         break;
      }
      const finalState = await app.invoke({
         messages: [{ role: 'user', content: userInput }]
      })
      const lastMessage = finalState.messages[finalState.messages.length - 1];
      console.log("LLM: ", lastMessage.content);
   }

   rl.close();
}

main();