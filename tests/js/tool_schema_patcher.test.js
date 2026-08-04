#!/usr/bin/env node

const assert = require("node:assert/strict");
const path = require("node:path");

const adapterPath = path.resolve(
    __dirname,
    "../../.github/ccr-adapters/tool-schema-patcher.js",
);
const ToolSchemaPatcher = require(adapterPath);
const patcher = new ToolSchemaPatcher();

const request = {
    body: {
        tools: [
            {
                type: "function",
                function: {
                    name: "Read",
                    parameters: {
                        type: "object",
                        properties: {
                            file_path: { type: "string" },
                            pages: { type: "string" },
                        },
                        required: ["file_path", "pages"],
                    },
                },
            },
            {
                type: "function",
                function: {
                    name: "OtherTool",
                    parameters: {
                        type: "object",
                        properties: { pages: { type: "string" } },
                    },
                },
            },
        ],
    },
};

patcher.transformRequestOut(request).then((patched) => {
    const read = patched.body.tools[0].function.parameters;
    const other = patched.body.tools[1].function.parameters;
    assert.equal(read.properties.pages, undefined);
    assert.deepEqual(read.required, ["file_path"]);
    assert.deepEqual(other.properties.pages, { type: "string" });
    console.log("tool-schema-patcher: ok");
});
