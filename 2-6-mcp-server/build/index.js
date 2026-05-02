import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
const STORIES_DIR = process.env.STORIES_DIR ||
    path.join(process.cwd(), "src/stories");
const server = new McpServer({
    name: "component-library",
    version: "1.0.0",
});
function getStoryFiles() {
    if (!fs.existsSync(STORIES_DIR)) {
        return [];
    }
    return fs
        .readdirSync(STORIES_DIR)
        .filter((f) => f.endsWith(".stories.tsx"));
}
// Tool 1: list all components
server.registerTool("list_components", {
    description: "List all available components in the component library. Returns component names and the stories directory path.",
    inputSchema: {},
}, async () => {
    const files = getStoryFiles();
    const components = files.map((f) => f.replace(".stories.tsx", ""));
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    components,
                    count: components.length,
                    storiesDir: STORIES_DIR,
                }, null, 2),
            },
        ],
    };
});
// Tool 2: get component info (props, variants, examples)
server.registerTool("get_component_info", {
    description: "Get detailed documentation for a specific component: props, variants, usage examples, and design constraints.",
    inputSchema: {
        componentName: z
            .string()
            .describe("Component name, e.g. Button, Card, Badge"),
    },
}, async ({ componentName }) => {
    const storyPath = path.join(STORIES_DIR, `${componentName}.stories.tsx`);
    if (!fs.existsSync(storyPath)) {
        const available = getStoryFiles().map((f) => f.replace(".stories.tsx", ""));
        return {
            content: [
                {
                    type: "text",
                    text: `Component "${componentName}" not found.\nAvailable: ${available.join(", ")}`,
                },
            ],
        };
    }
    const content = fs.readFileSync(storyPath, "utf-8");
    return {
        content: [{ type: "text", text: content }],
    };
});
// Tool 3: search components by keyword
server.registerTool("search_components", {
    description: "Search component names by keyword. Useful for checking if a component already exists before building a new one.",
    inputSchema: {
        keyword: z.string().describe("Search keyword, e.g. button, card, input"),
    },
}, async ({ keyword }) => {
    const files = getStoryFiles();
    const matches = files
        .filter((f) => f.toLowerCase().includes(keyword.toLowerCase()))
        .map((f) => f.replace(".stories.tsx", ""));
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({ keyword, matches, total: matches.length }, null, 2),
            },
        ],
    };
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Component Library MCP Server running on stdio");
    console.error(`Stories directory: ${STORIES_DIR}`);
}
main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
