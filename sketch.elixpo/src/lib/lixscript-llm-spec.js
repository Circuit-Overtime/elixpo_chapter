
export const LIXSCRIPT_LLM_SPEC = `
[INSTRUCTIONS — MUST FOLLOW]
Output ONLY LixScript Syntax. No markdown, no explanation.
Space apart shapes generously, use relative positioning, connect all shapes. Use $color vars. No dark colors.
Nothing should be crumpled or overlapping. Use curves for non-straight arrows. Keep IDs consistent for edits. Return COMPLETE code.

Syntax: rect/circle <id> at <x>, <y> size <w>x<h> {props} | arrow/line <id> from <src> to <tgt> {props} | text <id> at <x>, <y> {content:"t"} | $var = val | //comment

PROPS: stroke fill fillStyle(none|solid|hachure|cross-hatch|dots) roughness(0-3) style(solid|dashed|dotted) label labelColor labelFontSize rotation | Arrow: curve(straight|curved|elbow) curveAmount head headLength
SIDES: .top .bottom .left .right .center | REFS: .x .y .right .bottom .centerX .centerY .width .height

LAYOUT (CRITICAL — shapes MUST NOT overlap):
- Rect min 200x65, circle min 110x110. Scale up ~20px per extra word in label.
- Vertical gap: 150px between shape edges. Horizontal gap: 250px between shape edges.
- Use relative pos: "rect b at a.x, a.bottom + 150 size 200x65"
- Start first shape at (200, 60). Curve backward/diagonal arrows. Dash optional/error flows.
- Bright strokes only (#4A90D9 blue, #2ECC71 green, #E74C3C red, #F39C12 amber, #9B59B6 purple, #1ABC9C teal, #e0e0e0 gray). No dark colors.

EXAMPLE:
$b = #4A90D9
$g = #2ECC71
$r = #E74C3C
$w = #e0e0e0
rect login at 200, 60 size 200x65 {
  stroke: $b
  label: "Login Page"
}
rect validate at login.x, login.bottom + 150 size 260x70 {
  stroke: $b
  label: "Validate Credentials"
}
circle decision at validate.x, validate.bottom + 150 size 110x110 {
  stroke: $r
  label: "Valid?"
}
rect dash at decision.x, decision.bottom + 150 size 200x65 {
  stroke: $g
  label: "Dashboard"
}
rect err at decision.right + 250, decision.y size 200x65 {
  stroke: $r
  label: "Show Error"
}
arrow a1 from login.bottom to validate.top {
  stroke: $w
  label: "Submit"
}
arrow a2 from validate.bottom to decision.top {
  stroke: $w
}
arrow a3 from decision.bottom to dash.top {
  stroke: $g
  label: "Yes"
}
arrow a4 from decision.right to err.left {
  stroke: $r
  curve: curved
  label: "No"
}
arrow a5 from err.top to login.right {
  stroke: $r
  curve: curved
  style: dashed
  label: "Retry"
}`

export const LIXSCRIPT_USER_PROMPT = (prompt) =>
  `Create LixScript for: ${prompt}
Use relative positioning, $color vars, 150px vertical/250px horizontal gaps. Min rect 200x65, circle 110x110. Connect all shapes.`

export const LIXSCRIPT_EDIT_PROMPT = (prompt, previousCode) =>
  `Edit this LixScript: ${prompt}

${previousCode}

Return COMPLETE updated code. Keep IDs and spacing.`

export const LIXSCRIPT_MERMAID_PROMPT = (mermaidCode) =>
  `Convert Mermaid→LixScript. [text]→rect, (text)→circle, {text}→circle. 150px V-gaps, 250px H-gaps. Min rect 200x65, circle 110x110. Relative pos. Curve non-straight arrows.

${mermaidCode}`
