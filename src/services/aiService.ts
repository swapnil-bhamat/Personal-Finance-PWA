import { GoogleGenerativeAI, Part, SchemaType } from "@google/generative-ai";
import { InitializationData } from "../types/db.types";
import { logError } from "./logger";

// Static initialization removed to support dynamic configuration

const getSystemInstruction = () => {
  return {
    role: "system",
    parts: [{ text: `You are a helpful personal finance assistant integrated into a PWA. 
    You have access to the user's financial data stored in a local database (IndexedDB).
    
    Your capabilities:
    1. **Analyze**: Answer questions about net worth, spending, assets, etc. based on the provided JSON context.
    2. **Visualize**: Use the 'generate_graph' tool when the user asks for charts/graphs.
    
    Database Structure (Tables):
    - configs: App configurations
    - accounts: Bank accounts, wallets
    - income: Income sources
    - cashFlow: Monthly cashflow items (expenses/income)
    - assetsHoldings: Assets like stocks, internal/external funds
    - liabilities: Loans
    - goals: Financial goals
    
    You CANNOT modify the database. If asked to add/update records, politely explain that you are in read-only mode.
    
    Current Date: ${new Date().toLocaleDateString()}
    ` }]
  };
};

const toolsConfig = [
    {
      functionDeclarations: [

        {
          name: "generate_graph",
          description: "Generate a graph/chart to visualize financial data.",
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              type: {
                type: SchemaType.STRING,
                format: "enum",
                description: "The type of chart to generate.",
                enum: ["bar", "pie", "line", "composed"],
              },
              data: {
                type: SchemaType.ARRAY,
                description: "The array of data objects to visualize.",
                items: {
                  type: SchemaType.OBJECT,
                  properties: {},
                },
              },
              title: {
                type: SchemaType.STRING,
                description: "The title of the chart.",
              },
              xAxisKey: {
                type: SchemaType.STRING,
                description: "The key in the data object to use for the X-axis (category).",
              },
              dataKeys: {
                type: SchemaType.ARRAY,
                description: "The keys in the data objects to use for the data series values.",
                items: {
                  type: SchemaType.STRING,
                },
              },
            },
            required: ["type", "data", "title", "dataKeys"],
          },
        },
      ],
    },
  ];

export interface ChatMessage {
  role: "user" | "model";
  parts: Part[];
}

export const sendMessageToAI = async (
  history: ChatMessage[],
  newMessage: string,
  dataContext: InitializationData,
  apiKey: string,
  modelName: string
): Promise<{ text: string; toolCalls?: any[] }> => {
  if (!apiKey) {
    return { text: "Error: API Key is missing. Please configure it in settings." };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: modelName || "gemini-2.0-flash-exp",
        systemInstruction: getSystemInstruction(),
        tools: toolsConfig as any
    });

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: "Here is my current financial data context: " + JSON.stringify(dataContext) }],
        },
        {
          role: "model",
          parts: [{ text: "Understood. I have loaded your financial data. How can I help you today?" }],
        },
        ...history
      ],
    });

    const result = await chat.sendMessage(newMessage);
    const response = await result.response;
    
    // Check for tool calls
    const toolCalls = response.functionCalls();
    const text = response.text();

    return {
      text,
      toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined
    };
  } catch (error) {
    logError("AI Processing Error", { error });
    return { text: "Sorry, I encountered an error while processing your request." };
  }
};
