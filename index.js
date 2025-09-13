import { ChatGroq } from "@langchain/groq";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import readline from "node:readline/promises";
import { TavilySearch } from "@langchain/tavily";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";

import dotenv from "dotenv";
dotenv.config();


const memory = new MemorySaver();

const tool = new TavilySearch({
   maxResults: 3,
   topic: "general",
   // includeAnswer: false,
   // includeRawContent: false,
   // includeImages: false,
   // includeImageDescriptions: false,
   searchDepth: "basic",
   // timeRange: "day",
   // includeDomains: [],
   // excludeDomains: [],
});



const tools = [tool];
const toolNode = new ToolNode(tools);

// initiallize the LLM
const llm = new ChatGroq({
   model: "openai/gpt-oss-120b",
   temperature: 0,
   maxRetries: 2,
   // other params..
}).bindTools(tools);

// 1. call the model
async function callModel(state) {
   console.log("calling LLM...");
   const response = await llm.invoke(state.messages);
   return { messages: [response] };
};

// 2. Build the graph
const workflow = new StateGraph(MessagesAnnotation)
   .addNode("agent", callModel)
   .addNode("tool", toolNode)
   .addEdge("__start__", "agent")
   .addEdge("tool", "agent")
   .addEdge("agent", "__end__")
   .addConditionalEdges("agent", shouldContinue);


// 3. compile and invoke the graph
const app = workflow.compile({ checkpointer: memory });

function shouldContinue(state) {
   //put your condition here
   // wherther to call tools or not
   const lastMessage = state.messages[state.messages.length - 1];

   if (lastMessage.tool_calls.length > 0) {
      return "tool";
   }

   return "__end__";
};


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
      },
         {
            configurable: { thread_id: "1" }
         }
      )
      const lastMessage = finalState.messages[finalState.messages.length - 1];
      console.log("LLM: ", lastMessage.content);
   }

   rl.close();
};

main();