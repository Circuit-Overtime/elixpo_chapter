import {type NextRequest, NextResponse } from "next/server";


interface CodeSuggestionProps { 
    fileContent: string;
    cursorLine: number;
    cursorColumn: number;
    suggestionType: string;
    fileName?: string;
}
interface CodeContext {
  language: string
  framework: string
  beforeContext: string
  currentLine: string
  afterContext: string
  cursorPosition: { line: number; column: number }
  isInFunction: boolean
  isInClass: boolean
  isAfterComment: boolean
  incompletePatterns: string[]
}



export async function POST(request: NextRequest) {
    try {
      const body:CodeSuggestionProps = await request.json();
      const 
      {
        cursorColumn,
        cursorLine,
        fileContent,
        suggestionType,
        fileName
      } = body;
    if (!fileContent || cursorLine < 0 || cursorColumn < 0 || !suggestionType) {
      return NextResponse.json({ error: "Invalid input parameters" }, { status: 400 })
    }
    const context = analyzeCodeContext(fileContent, cursorLine, cursorColumn,fileName)
    
    const prompt = buildPrompt(context,suggestionType);

    const AISuggestion = await generateSuggestion(prompt);

    return NextResponse.json({
        AISuggestion,
        context,
        metadata: {
        language: context.language,
        framework: context.framework,
        position: context.cursorPosition,
        generatedAt: new Date().toISOString(),
        }
    })

    } catch (error) {
        console.log("Context analysis error", error);
        return NextResponse.json({error: "Internal server error"})
    }
}

const analyzeCodeContext = (
    content: string,
    line: number,
    column: number,
    fileName?: string
):CodeContext => {
     const lines = content.split("\n")
  const currentLine = lines[line] || ""

  // Get surrounding context (10 lines before and after)
  const contextRadius = 10
  const startLine = Math.max(0, line - contextRadius)
  const endLine = Math.min(lines.length, line + contextRadius)

  const beforeContext = lines.slice(startLine, line).join("\n")
  const afterContext = lines.slice(line + 1, endLine).join("\n")

  // Detect language and framework
  const language = detectLanguage(content, fileName)
  const framework = detectFramework(content)

  // Analyze code patterns
  const isInFunction = detectInFunction(lines, line)
  const isInClass = detectInClass(lines, line)
  const isAfterComment = detectAfterComment(currentLine, column)
  const incompletePatterns = detectIncompletePatterns(currentLine, column)

  return {
    language,
    framework,
    beforeContext,
    currentLine,
    afterContext,
    cursorPosition: { line, column },
    isInFunction,
    isInClass,
    isAfterComment,
    incompletePatterns,
  }
}


function buildPrompt(context: CodeContext, suggestionType: string): string {
  return `You are an expert code completion assistant. Generate a ${suggestionType} suggestion.

Language: ${context.language}
Framework: ${context.framework}

Context:
${context.beforeContext}
${context.currentLine.substring(0, context.cursorPosition.column)}|CURSOR|${context.currentLine.substring(context.cursorPosition.column)}
${context.afterContext}

Analysis:
- In Function: ${context.isInFunction}
- In Class: ${context.isInClass}
- After Comment: ${context.isAfterComment}
- Incomplete Patterns: ${context.incompletePatterns.join(", ") || "None"}

Instructions:
1. Provide only the code that should be inserted at the cursor
2. Maintain proper indentation and style
3. Follow ${context.language} best practices
4. Make the suggestion contextually appropriate

Generate suggestion:`
}
async function generateSuggestion(prompt: string): Promise<string> {
  try {
    // Replace this with your actual AI service call
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "codellama:latest",
        prompt,
        stream: false,
        options: {
          temperature: 0.7,
          max_tokens: 300,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`AI service error: ${response.statusText}`)
    }

    const data = await response.json()
    let suggestion = data.response

    // Clean up the suggestion
    if (suggestion.includes("```")) {
      const codeMatch = suggestion.match(/```[\w]*\n?([\s\S]*?)```/)
      suggestion = codeMatch ? codeMatch[1].trim() : suggestion
    }

    // Remove cursor markers if present
    suggestion = suggestion.replace(/\|CURSOR\|/g, "").trim()

    return suggestion
  } catch (error) {
    console.error("AI generation error:", error)
    return "// AI suggestion unavailable"
  }
}


function detectLanguage(content: string, fileName?: string): string {
  if (fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase()
    const extMap: Record<string, string> = {
      ts: "TypeScript",
      tsx: "TypeScript",
      js: "JavaScript",
      jsx: "JavaScript",
      py: "Python",
      java: "Java",
      go: "Go",
      rs: "Rust",
      php: "PHP",
    }
    if (ext && extMap[ext]) return extMap[ext]
  }

  // Content-based detection
  if (content.includes("interface ") || content.includes(": string")) return "TypeScript"
  if (content.includes("def ") || content.includes("import ")) return "Python"
  if (content.includes("func ") || content.includes("package ")) return "Go"

  return "JavaScript"
}







function detectFramework(content: string): string {
  if (content.includes("import React") || content.includes("useState")) return "React"
  if (content.includes("import Vue") || content.includes("<template>")) return "Vue"
  if (content.includes("@angular/") || content.includes("@Component")) return "Angular"
  if (content.includes("next/") || content.includes("getServerSideProps")) return "Next.js"

  return "None"
}

function detectInFunction(lines: string[], currentLine: number): boolean {
  for (let i = currentLine - 1; i >= 0; i--) {
    const line = lines[i]
    if (line?.match(/^\s*(function|def|const\s+\w+\s*=|let\s+\w+\s*=)/)) return true
    if (line?.match(/^\s*}/)) break
  }
  return false
}

function detectInClass(lines: string[], currentLine: number): boolean {
  for (let i = currentLine - 1; i >= 0; i--) {
    const line = lines[i]
    if (line?.match(/^\s*(class|interface)\s+/)) return true
  }
  return false
}

function detectAfterComment(line: string, column: number): boolean {
  const beforeCursor = line.substring(0, column)
  return /\/\/.*$/.test(beforeCursor) || /#.*$/.test(beforeCursor)
}

function detectIncompletePatterns(line: string, column: number): string[] {
  const beforeCursor = line.substring(0, column)
  const patterns: string[] = []

  if (/^\s*(if|while|for)\s*\($/.test(beforeCursor.trim())) patterns.push("conditional")
  if (/^\s*(function|def)\s*$/.test(beforeCursor.trim())) patterns.push("function")
  if (/\{\s*$/.test(beforeCursor)) patterns.push("object")
  if (/\[\s*$/.test(beforeCursor)) patterns.push("array")
  if (/=\s*$/.test(beforeCursor)) patterns.push("assignment")
  if (/\.\s*$/.test(beforeCursor)) patterns.push("method-call")

  return patterns
}

function getLastNonEmptyLine(lines: string[], currentLine: number): string {
  for (let i = currentLine - 1; i >= 0; i--) {
    const line = lines[i]
    if (line.trim() !== "") return line
  }
  return ""
}