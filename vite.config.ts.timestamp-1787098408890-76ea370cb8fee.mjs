var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/utils/scriptDocs.ts
function validateDocumentation() {
  const allTypes = [
    "DIALOGUE",
    "ENTER",
    "EXIT",
    "MOVE",
    "POSE",
    "BGM",
    "AMBIENCE",
    "SFX",
    "EFFECT",
    "CLEAR_EFFECT",
    "WAIT",
    "SCENE",
    "CHOICE",
    "SET",
    "IF",
    "ENDIF",
    "TICK",
    "BIND",
    "UNBIND",
    "SLIDER",
    "GAUGE",
    "HIDE_SLIDER",
    "HIDE_GAUGE",
    "NARRATON",
    "BUTTON",
    "HIDE_BUTTON",
    "COMMENT",
    "UNKNOWN"
  ];
  const documentedTypes = new Set(COMMAND_DOCS.map((doc) => doc.type));
  const missing = allTypes.filter((type) => !documentedTypes.has(type));
  const documented = allTypes.filter((type) => documentedTypes.has(type));
  return { missing, documented };
}
var COMMAND_DOCS, CATEGORY_INFO;
var init_scriptDocs = __esm({
  "src/utils/scriptDocs.ts"() {
    COMMAND_DOCS = [
      // ============ DIALOGUE COMMANDS ============
      {
        type: "DIALOGUE",
        category: "dialogue",
        syntax: 'ACTOR_NAME: "dialogue text"',
        description: "Displays dialogue spoken by an actor. The actor name must match a defined actor.",
        parameters: [
          { name: "actorName", type: "string", description: "The name of the speaking actor (case-sensitive, starts with uppercase)" },
          { name: "text", type: "string", description: "The dialogue text to display (in quotes)" }
        ],
        example: `Detective: "I've seen things you wouldn't believe."
Narrator: "The rain continued to fall."
Alice (thinking): "What should I do next?"`,
        implemented: true
      },
      // ============ ACTOR COMMANDS ============
      {
        type: "ENTER",
        category: "actor",
        syntax: "[ENTER actor_id at x,y]",
        description: "Makes an actor appear on stage at the specified position (percentage of stage dimensions).",
        parameters: [
          { name: "actor_id", type: "string", description: "The unique identifier of the actor" },
          { name: "x", type: "number", description: "Horizontal position (0-100, percentage from left)" },
          { name: "y", type: "number", description: "Vertical position (0-100, percentage from top)" }
        ],
        example: "[ENTER detective at 25,50]\n[ENTER witness at 75,50]",
        implemented: true
      },
      {
        type: "EXIT",
        category: "actor",
        syntax: "[EXIT actor_id]",
        description: "Removes an actor from the stage.",
        parameters: [
          { name: "actor_id", type: "string", description: "The unique identifier of the actor to remove" }
        ],
        example: "[EXIT detective]",
        implemented: true
      },
      {
        type: "MOVE",
        category: "actor",
        syntax: "[MOVE actor_id to x,y over duration]",
        description: "Animates an actor moving to a new position over the specified duration.",
        parameters: [
          { name: "actor_id", type: "string", description: "The unique identifier of the actor" },
          { name: "x", type: "number", description: "Target horizontal position (0-100)" },
          { name: "y", type: "number", description: "Target vertical position (0-100)" },
          { name: "duration", type: "string", description: 'Animation duration (e.g., "2s", "500ms")', optional: true }
        ],
        example: "[MOVE detective to 50,50 over 1s]\n[MOVE witness to 25,50]",
        implemented: true
      },
      {
        type: "POSE",
        category: "actor",
        syntax: "[POSE actor_id pose=PoseName expression=ExpressionName]",
        description: "Changes an actor's pose and/or expression.",
        parameters: [
          { name: "actor_id", type: "string", description: "The unique identifier of the actor" },
          { name: "pose", type: "string", description: "The pose name to switch to", optional: true },
          { name: "expression", type: "string", description: "The expression name to display", optional: true }
        ],
        example: "[POSE detective pose=Thinking expression=Worried]\n[POSE witness expression=Happy]",
        implemented: true
      },
      // ============ AUDIO COMMANDS ============
      {
        type: "BGM",
        category: "audio",
        syntax: '[BGM: "track_name" loop vol=XX%]',
        description: "Plays background music. Can loop and set volume.",
        parameters: [
          { name: "track_name", type: "string", description: "Name or ID of the music track" },
          { name: "loop", type: "flag", description: 'Add "loop" to repeat the track', optional: true },
          { name: "vol", type: "percentage", description: "Volume level (0-100%)", optional: true }
        ],
        example: '[BGM: "noir_jazz" loop vol=70%]\n[BGM: "tension" vol=50%]',
        implemented: true
      },
      {
        type: "AMBIENCE",
        category: "audio",
        syntax: '[AMBIENCE: "track_name" loop vol=XX%]',
        description: "Plays ambient background sounds (rain, crowd noise, etc.).",
        parameters: [
          { name: "track_name", type: "string", description: "Name or ID of the ambient track" },
          { name: "loop", type: "flag", description: 'Add "loop" to repeat the track', optional: true },
          { name: "vol", type: "percentage", description: "Volume level (0-100%)", optional: true }
        ],
        example: '[AMBIENCE: "city_rain" loop vol=40%]',
        implemented: true
      },
      {
        type: "SFX",
        category: "audio",
        syntax: '[SFX: "effect_name" vol=XX%]',
        description: "Plays a one-shot sound effect.",
        parameters: [
          { name: "effect_name", type: "string", description: "Name or ID of the sound effect" },
          { name: "vol", type: "percentage", description: "Volume level (0-100%)", optional: true }
        ],
        example: '[SFX: "door_slam"]\n[SFX: "thunder" vol=80%]',
        implemented: true
      },
      // ============ EFFECT COMMANDS ============
      {
        type: "EFFECT",
        category: "effect",
        syntax: "[EFFECT sfx_id on target_id]",
        description: "Applies a visual effect (shader, filter, animation) to an actor or element.",
        parameters: [
          { name: "sfx_id", type: "string", description: "The ID of the SFX/effect to apply" },
          { name: "target_id", type: "string", description: "The ID of the actor or element to affect" }
        ],
        example: "[EFFECT glow on detective]\n[EFFECT shake on stage]",
        implemented: true
      },
      {
        type: "CLEAR_EFFECT",
        category: "effect",
        syntax: "[CLEAR_EFFECT sfx_id from target_id]",
        description: "Removes a previously applied visual effect from an actor or element.",
        parameters: [
          { name: "sfx_id", type: "string", description: "The ID of the SFX/effect to remove" },
          { name: "target_id", type: "string", description: "The ID of the actor or element" }
        ],
        example: "[CLEAR_EFFECT glow from detective]",
        implemented: true
      },
      {
        type: "BIND",
        category: "effect",
        syntax: "[BIND element_id.property to expression]",
        description: "Live-binds a stage element property to an expression over world state variables. The binding re-evaluates whenever variables change (SET, TICK, sliders), driving the element continuously. Bindable properties: x, y, scale, rotation, opacity, zIndex. Bindings clear on scene change. Bad expressions evaluate to 0 with a console warning.",
        parameters: [
          { name: "element_id", type: "string", description: "The ID of the stage element to drive" },
          { name: "property", type: "string", description: "One of: x, y, scale, rotation, opacity, zIndex" },
          { name: "expression", type: "string", description: "Arithmetic expression (same grammar as SET)" }
        ],
        example: `[BIND siphon_arm.rotation to rent * 0.9]
[BIND reservoir.scale to 0.5 + hoard / 200]
[BIND margin_floor.y to 80 - marginHeight]
[BIND prestige_shell.opacity to prestige / 100]`,
        implemented: true
      },
      {
        type: "UNBIND",
        category: "effect",
        syntax: "[UNBIND element_id.property]",
        description: "Releases a property binding created with BIND. The element keeps its last driven value.",
        parameters: [
          { name: "element_id", type: "string", description: "The ID of the stage element" },
          { name: "property", type: "string", description: "The bound property to release" }
        ],
        example: "[UNBIND siphon_arm.rotation]",
        implemented: true
      },
      // ============ BUTTON COMMANDS ============
      {
        type: "BUTTON",
        category: "button",
        syntax: "[BUTTON button_id]",
        description: "Displays an interactive button on the stage. Buttons can navigate to scenes, play sounds, or open URLs.",
        parameters: [
          { name: "button_id", type: "string", description: "The unique identifier of the button to show" }
        ],
        example: "[BUTTON examine_desk]\n[BUTTON open_door]",
        implemented: true
      },
      {
        type: "HIDE_BUTTON",
        category: "button",
        syntax: "[HIDE_BUTTON button_id]",
        description: "Hides and deactivates a previously shown button.",
        parameters: [
          { name: "button_id", type: "string", description: "The unique identifier of the button to hide" }
        ],
        example: "[HIDE_BUTTON examine_desk]",
        implemented: true
      },
      // ============ INSTRUMENT COMMANDS ============
      {
        type: "SLIDER",
        category: "instrument",
        syntax: '[SLIDER variable at x,y min=0 max=100 step=1 label="TEXT"]',
        description: "Shows an interactive slider that writes its worldState variable continuously as the player drags. Position is a percentage of the stage. min/max default to 0/100, step to 1; label defaults to the variable name. Dragging re-evaluates BINDs immediately, so sliders drive the stage live.",
        parameters: [
          { name: "variable", type: "string", description: "The worldState variable the slider writes" },
          { name: "x", type: "number", description: "Horizontal position (0-100, percentage from left)" },
          { name: "y", type: "number", description: "Vertical position (0-100, percentage from top)" },
          { name: "min", type: "number", description: "Minimum value (default 0)", optional: true },
          { name: "max", type: "number", description: "Maximum value (default 100)", optional: true },
          { name: "step", type: "number", description: "Drag increment (default 1)", optional: true },
          { name: "label", type: "string", description: "Panel label (default: variable name)", optional: true }
        ],
        example: '[SLIDER greed at 85,20 min=0 max=100 label="GREED"]\n[SLIDER rentShare at 85,35 min=0 max=1 step=0.05 label="RENT SHARE"]',
        implemented: true
      },
      {
        type: "GAUGE",
        category: "instrument",
        syntax: '[GAUGE variable at x,y min=0 max=100 label="TEXT"]',
        description: "Shows a read-only dial displaying one worldState variable, updating live as the variable changes (SET, TICK, sliders).",
        parameters: [
          { name: "variable", type: "string", description: "The worldState variable the gauge displays" },
          { name: "x", type: "number", description: "Horizontal position (0-100, percentage from left)" },
          { name: "y", type: "number", description: "Vertical position (0-100, percentage from top)" },
          { name: "min", type: "number", description: "Dial minimum (default 0)", optional: true },
          { name: "max", type: "number", description: "Dial maximum (default 100)", optional: true },
          { name: "label", type: "string", description: "Panel label (default: variable name)", optional: true }
        ],
        example: '[GAUGE wages at 15,80 min=0 max=100 label="WAGES"]',
        implemented: true
      },
      {
        type: "HIDE_SLIDER",
        category: "instrument",
        syntax: "[HIDE_SLIDER variable]",
        description: "Hides the slider bound to the given variable.",
        parameters: [
          { name: "variable", type: "string", description: "The variable whose slider to hide" }
        ],
        example: "[HIDE_SLIDER greed]",
        implemented: true
      },
      {
        type: "HIDE_GAUGE",
        category: "instrument",
        syntax: "[HIDE_GAUGE variable]",
        description: "Hides the gauge bound to the given variable.",
        parameters: [
          { name: "variable", type: "string", description: "The variable whose gauge to hide" }
        ],
        example: "[HIDE_GAUGE wages]",
        implemented: true
      },
      // ============ CHOICE COMMANDS ============
      {
        type: "CHOICE",
        category: "choice",
        syntax: '[CHOICE]\n- "Option text" -> target_scene\n[/CHOICE]',
        description: "Presents the player with branching dialogue options. Each option navigates to a different scene.",
        parameters: [
          { name: "options", type: "array", description: "List of choice options with text and target scenes" }
        ],
        example: `[CHOICE]
- "Investigate the desk" -> desk_scene
- "Talk to the witness" -> witness_scene
- "Leave the room" -> hallway
[/CHOICE]`,
        implemented: true
      },
      // ============ FLOW CONTROL ============
      {
        type: "SCENE",
        category: "scene",
        syntax: "[SCENE scene_id]",
        description: "Transitions to a different scene immediately.",
        parameters: [
          { name: "scene_id", type: "string", description: "The unique identifier of the target scene" }
        ],
        example: "[SCENE forest_clearing]\n[SCENE chapter2_intro]",
        implemented: true
      },
      {
        type: "WAIT",
        category: "flow",
        syntax: "[WAIT duration]",
        description: "Pauses script execution for the specified duration.",
        parameters: [
          { name: "duration", type: "string", description: 'Wait time (e.g., "2s", "500ms", or just "2" for seconds)' }
        ],
        example: "[WAIT 2s]\n[WAIT 500ms]",
        implemented: true
      },
      {
        type: "SET",
        category: "flow",
        syntax: "[SET variable = value_or_expression]",
        description: "Sets a world state variable that persists across scenes. The right side can be a literal (string, number, boolean) or an arithmetic expression over other variables. Expressions support + - * / ( ), numeric literals, variable names, and the functions clamp(x,min,max), min(...), max(...), abs(x), floor(x), rand(). A bare variable name copies that variable's value. Bad expressions and unknown variables resolve to 0 with a console warning \u2014 scripts never crash.",
        parameters: [
          { name: "variable", type: "string", description: "The variable name (alphanumeric, no spaces)" },
          { name: "value", type: "any", description: "A literal (string, number, boolean) or an arithmetic expression" }
        ],
        example: `[SET hasKey = true]
[SET visitCount = 3]
[SET playerName = "Alex"]
[SET product = laborForce * productivity]
[SET wages = max(product - rent, survivalFloor)]
[SET rent = clamp(product * rentShare, 0, product)]`,
        implemented: true
      },
      {
        type: "IF",
        category: "flow",
        syntax: "[IF condition]\n...commands...\n[ENDIF]",
        description: "Conditionally executes commands based on world state. The simple form compares one variable against a literal. Either side may also be an arithmetic expression (same grammar as SET), in which case both sides evaluate numerically. Booleans count as 1/0 in expressions.",
        parameters: [
          { name: "lhs", type: "string", description: "The variable to check, or an arithmetic expression" },
          { name: "operator", type: "string", description: "Comparison operator: ==, !=, >, <, >=, <=" },
          { name: "rhs", type: "any", description: "A literal, variable, or arithmetic expression to compare against" }
        ],
        example: `[IF hasKey == true]
Detective: "I can unlock this door now."
[ENDIF]

[IF wages < survivalFloor + 10]
Narrator: "The humans are starving."
[ENDIF]

[IF speculation * greed > 5000]
[EFFECT shake on stage]
[ENDIF]`,
        implemented: true
      },
      {
        type: "ENDIF",
        category: "flow",
        syntax: "[ENDIF]",
        description: "Marks the end of an IF conditional block.",
        parameters: [],
        example: "[ENDIF]",
        implemented: true
      },
      {
        type: "TICK",
        category: "flow",
        syntax: "[TICK interval]\n...commands...\n[/TICK]",
        description: "A repeating block: the body runs every interval while the scene is active, concurrent with (never blocking) normal script and dialogue flow. Use it as a simulation heartbeat \u2014 typically SETs and IFs updating world state. One TICK block per scene; extra blocks are ignored with a warning. Blocking commands (DIALOGUE, CHOICE, WAIT, nested TICK) are skipped inside a tick body with a warning. The tick keeps running after the scene script completes and stops on scene transition.",
        parameters: [
          { name: "interval", type: "string", description: 'Repeat interval (e.g., "500ms", "2s")' }
        ],
        example: `[TICK 500ms]
[SET productivity = productivity + 0.1]
[SET product = laborForce * productivity * (marginHeight / 100)]
[IF speculation > 70]
[EFFECT shake on stage]
[ENDIF]
[/TICK]`,
        implemented: true
      },
      {
        type: "NARRATON",
        category: "flow",
        syntax: "[NARRATON pool=pool_name]",
        description: "Yields flow control to the Narraton selector (the 1986 King of Chicago storyteller). It gathers every scene whose Narraton metadata names this pool, filters by hard requirements, play history (non-repeatable scenes play once), and subplot rotation (one scene per subplot, in order), then transitions to the survivor whose keys least-squares match the current world state: score = sum of ((current - target) / scale)^2 per key, divided by the scene's weight; lowest wins, exact ties break randomly. Scene metadata is set in the scene editor. Every selection decision (candidate pool, gates, per-key deltas, scores, winner) is logged to the console. If no scene is eligible, the script continues past the command with a warning.",
        parameters: [
          { name: "pool", type: "string", description: "The selection pool to draw from (default: main)", optional: true }
        ],
        example: `# Let the storyteller pick what happens next
[NARRATON pool=main]

# Era-specific pool
[NARRATON pool=era2_extraction]`,
        implemented: true
      },
      // ============ SPECIAL ============
      {
        type: "COMMENT",
        category: "flow",
        syntax: "# comment text  OR  // comment text",
        description: "A comment line that is ignored during execution. Useful for notes and documentation.",
        parameters: [
          { name: "text", type: "string", description: "Any comment text" }
        ],
        example: `# This is a comment
// This is also a comment`,
        implemented: true
      },
      {
        type: "UNKNOWN",
        category: "flow",
        syntax: "(any unrecognized text)",
        description: "Represents any line that could not be parsed. Skipped during execution.",
        parameters: [],
        example: "some unrecognized command",
        implemented: true
      }
    ];
    CATEGORY_INFO = {
      scene: {
        title: "Scene Commands",
        description: "Commands for transitioning between scenes and managing backgrounds."
      },
      actor: {
        title: "Actor Commands",
        description: "Commands for controlling actor visibility, position, and appearance on stage."
      },
      dialogue: {
        title: "Dialogue Commands",
        description: "Commands for displaying character dialogue and narration."
      },
      audio: {
        title: "Audio Commands",
        description: "Commands for playing music, ambient sounds, and sound effects."
      },
      button: {
        title: "Button Commands",
        description: "Commands for showing and hiding interactive buttons."
      },
      choice: {
        title: "Choice Commands",
        description: "Commands for presenting branching narrative choices to the player."
      },
      flow: {
        title: "Flow Control",
        description: "Commands for controlling script execution, variables, and conditionals."
      },
      effect: {
        title: "Effect Commands",
        description: "Commands for applying and removing visual effects on actors and elements."
      },
      instrument: {
        title: "Instrument Commands",
        description: "Interactive sliders and read-only gauges wired to world state variables \u2014 the instrument panel."
      }
    };
  }
});

// src/utils/generateDramDocs.ts
var generateDramDocs_exports = {};
__export(generateDramDocs_exports, {
  generateMarkdown: () => generateMarkdown
});
function generateMarkdown() {
  const lines = [];
  lines.push("# DRAM Script Language Reference");
  lines.push("");
  lines.push("**Version:** 1.0");
  lines.push("");
  lines.push("DRAM Script is the scripting language used by Dramaton to control narrative flow, scene transitions, character dialogue, and interactive elements in visual novel-style games.");
  lines.push("");
  lines.push("> **Note:** This document is auto-generated from `src/utils/scriptDocs.ts`. Do not edit directly.");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Table of Contents");
  lines.push("");
  lines.push("1. [Overview](#overview)");
  lines.push("2. [Basic Syntax](#basic-syntax)");
  lines.push("3. [Commands](#commands)");
  for (const category of CATEGORY_ORDER) {
    const info = CATEGORY_INFO[category];
    const anchor = info.title.toLowerCase().replace(/\s+/g, "-");
    lines.push(`   - [${info.title}](#${anchor})`);
  }
  lines.push("4. [Examples](#examples)");
  lines.push("5. [Best Practices](#best-practices)");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Overview");
  lines.push("");
  lines.push("DRAM Script files are plain text scripts that define the sequence of events in a Dramaton game. Each line represents a single command that the engine executes in order during playback.");
  lines.push("");
  lines.push("Scripts are attached to **Scenes** and executed when that scene is active. The script runner processes commands sequentially, with some commands (like CHOICE) pausing for user input.");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Basic Syntax");
  lines.push("");
  lines.push("- One command per line");
  lines.push("- Bracketed commands use `[COMMAND ...]` format");
  lines.push('- Dialogue uses `ACTOR_NAME: "text"` format');
  lines.push("- Comments start with `#` or `//`");
  lines.push("- Blank lines are ignored");
  lines.push("- Arguments can include strings (in quotes), numbers, and flags");
  lines.push("");
  lines.push("```");
  lines.push("[COMMAND argument1 argument2]");
  lines.push('ACTOR_NAME: "dialogue text"');
  lines.push("# This is a comment");
  lines.push("```");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Commands");
  lines.push("");
  for (const category of CATEGORY_ORDER) {
    const categoryDocs = COMMAND_DOCS.filter((doc) => doc.category === category);
    if (categoryDocs.length === 0) continue;
    const info = CATEGORY_INFO[category];
    lines.push(`### ${info.title}`);
    lines.push("");
    lines.push(info.description);
    lines.push("");
    for (const doc of categoryDocs) {
      if (doc.type === "UNKNOWN") continue;
      lines.push(`#### \`${doc.type}\``);
      lines.push("");
      lines.push(doc.description);
      lines.push("");
      lines.push("**Syntax:**");
      lines.push("```");
      lines.push(doc.syntax);
      lines.push("```");
      lines.push("");
      if (doc.parameters && doc.parameters.length > 0) {
        lines.push("**Parameters:**");
        lines.push("| Name | Type | Description |");
        lines.push("|------|------|-------------|");
        for (const param of doc.parameters) {
          const optional = param.optional ? " *(optional)*" : "";
          lines.push(`| \`${param.name}\` | ${param.type} | ${param.description}${optional} |`);
        }
        lines.push("");
      }
      lines.push("**Example:**");
      lines.push("```");
      lines.push(doc.example);
      lines.push("```");
      lines.push("");
      if (!doc.implemented) {
        lines.push("> \u26A0\uFE0F **Planned Feature** - Not yet implemented");
        lines.push("");
      }
    }
    lines.push("---");
    lines.push("");
  }
  lines.push("## Examples");
  lines.push("");
  lines.push("### Simple Dialogue Scene");
  lines.push("");
  lines.push("```");
  lines.push("[ENTER detective at 50,50]");
  lines.push('Detective: "Another late night at the precinct."');
  lines.push("[WAIT 1s]");
  lines.push(`Detective: "The case files aren't going to solve themselves."`);
  lines.push('[SFX: "phone_ring"]');
  lines.push('Detective: "Now what?"');
  lines.push("```");
  lines.push("");
  lines.push("### Scene with Choices");
  lines.push("");
  lines.push("```");
  lines.push("[ENTER guide at 50,50]");
  lines.push('Guide: "Which path will you take?"');
  lines.push("[CHOICE]");
  lines.push('- "The mountain pass" -> mountain');
  lines.push('- "The forest trail" -> forest');
  lines.push('- "Return to town" -> town');
  lines.push("[/CHOICE]");
  lines.push("```");
  lines.push("");
  lines.push("### Interactive Scene with Buttons");
  lines.push("");
  lines.push("```");
  lines.push("[BUTTON examine_desk]");
  lines.push("[BUTTON check_window]");
  lines.push("[BUTTON read_letter]");
  lines.push('Narrator: "The office is quiet. What catches your attention?"');
  lines.push("```");
  lines.push("");
  lines.push("### Conditional Logic");
  lines.push("");
  lines.push("```");
  lines.push("[IF hasKey == true]");
  lines.push('Player: "I can use this key on the locked door."');
  lines.push("[SCENE locked_room]");
  lines.push("[ENDIF]");
  lines.push("");
  lines.push("[IF visitCount > 1]");
  lines.push('Shopkeeper: "Back again? I remember you."');
  lines.push("[ENDIF]");
  lines.push("```");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Best Practices");
  lines.push("");
  lines.push("1. **Use descriptive IDs**: `forest_night` is better than `scene_7`");
  lines.push("2. **Keep dialogue concise**: Break long speeches into multiple lines");
  lines.push("3. **Test frequently**: Use Theater mode to preview your scripts");
  lines.push("4. **Comment your logic**: Add notes for complex branching with `#` comments");
  lines.push("5. **Organize by act**: Group related scenes together");
  lines.push("6. **Use consistent naming**: Stick to snake_case for IDs");
  lines.push("");
  lines.push("---");
  lines.push("");
  const { missing, documented } = validateDocumentation();
  lines.push("## Implementation Status");
  lines.push("");
  lines.push(`\u2705 **${documented.length} commands documented**`);
  if (missing.length > 0) {
    lines.push(`\u26A0\uFE0F **${missing.length} commands missing documentation**: ${missing.join(", ")}`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("*This document is auto-generated from the Dramaton source code.*");
  return lines.join("\n");
}
var CATEGORY_ORDER;
var init_generateDramDocs = __esm({
  async "src/utils/generateDramDocs.ts"() {
    init_scriptDocs();
    CATEGORY_ORDER = [
      "scene",
      "actor",
      "dialogue",
      "audio",
      "effect",
      "button",
      "instrument",
      "choice",
      "flow"
    ];
    if (typeof process !== "undefined" && process.argv[1]?.includes("generateDramDocs")) {
      const { writeFileSync: writeFileSync2 } = await import("node:fs");
      const { resolve: resolve2 } = await import("node:path");
      const outPath = resolve2(process.cwd(), "docs", "DRAM_SCRIPT.md");
      writeFileSync2(outPath, generateMarkdown() + "\n", "utf8");
      console.log(`Wrote ${outPath}`);
    }
  }
});

// vite.config.ts
import { defineConfig } from "file:///C:/Users/dougs/Dropbox/____2025%20Projects/_USA%20VS%20MAGA/App%20Source/Dramaton%202.0%20Git/dramaton-studio-62/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/dougs/Dropbox/____2025%20Projects/_USA%20VS%20MAGA/App%20Source/Dramaton%202.0%20Git/dramaton-studio-62/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///C:/Users/dougs/Dropbox/____2025%20Projects/_USA%20VS%20MAGA/App%20Source/Dramaton%202.0%20Git/dramaton-studio-62/node_modules/lovable-tagger/dist/index.js";

// vite-plugin-dram-docs.ts
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";
function dramDocsPlugin() {
  return {
    name: "dram-docs-generator",
    // Run at the very start of both dev and build
    buildStart: async () => {
      try {
        const { generateMarkdown: generateMarkdown2 } = await init_generateDramDocs().then(() => generateDramDocs_exports);
        const markdown = generateMarkdown2();
        const docsDir = resolve(process.cwd(), "docs");
        if (!existsSync(docsDir)) {
          mkdirSync(docsDir, { recursive: true });
        }
        const outputPath = resolve(docsDir, "DRAM_SCRIPT.md");
        writeFileSync(outputPath, markdown, "utf-8");
        const commandCount = (markdown.match(/#### `/g) || []).length;
        console.log(`
\u{1F4DD} DRAM Script docs updated (${commandCount} commands)
`);
      } catch (error) {
        console.error("\u26A0\uFE0F Failed to generate DRAM docs:", error);
      }
    }
  };
}

// vite.config.ts
var __vite_injected_original_dirname = "C:\\Users\\dougs\\Dropbox\\____2025 Projects\\_USA VS MAGA\\App Source\\Dramaton 2.0 Git\\dramaton-studio-62";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false
    }
  },
  plugins: [
    react(),
    dramDocsPlugin(),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL3V0aWxzL3NjcmlwdERvY3MudHMiLCAic3JjL3V0aWxzL2dlbmVyYXRlRHJhbURvY3MudHMiLCAidml0ZS5jb25maWcudHMiLCAidml0ZS1wbHVnaW4tZHJhbS1kb2NzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcZG91Z3NcXFxcRHJvcGJveFxcXFxfX19fMjAyNSBQcm9qZWN0c1xcXFxfVVNBIFZTIE1BR0FcXFxcQXBwIFNvdXJjZVxcXFxEcmFtYXRvbiAyLjAgR2l0XFxcXGRyYW1hdG9uLXN0dWRpby02MlxcXFxzcmNcXFxcdXRpbHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGRvdWdzXFxcXERyb3Bib3hcXFxcX19fXzIwMjUgUHJvamVjdHNcXFxcX1VTQSBWUyBNQUdBXFxcXEFwcCBTb3VyY2VcXFxcRHJhbWF0b24gMi4wIEdpdFxcXFxkcmFtYXRvbi1zdHVkaW8tNjJcXFxcc3JjXFxcXHV0aWxzXFxcXHNjcmlwdERvY3MudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2RvdWdzL0Ryb3Bib3gvX19fXzIwMjUlMjBQcm9qZWN0cy9fVVNBJTIwVlMlMjBNQUdBL0FwcCUyMFNvdXJjZS9EcmFtYXRvbiUyMDIuMCUyMEdpdC9kcmFtYXRvbi1zdHVkaW8tNjIvc3JjL3V0aWxzL3NjcmlwdERvY3MudHNcIjsvLyBEUkFNIFNjcmlwdCBEb2N1bWVudGF0aW9uIFJlZ2lzdHJ5XHJcbi8vIFRoaXMgZmlsZSBzZXJ2ZXMgYXMgdGhlIHNvdXJjZSBvZiB0cnV0aCBmb3IgYWxsIERSQU0gc2NyaXB0IGNvbW1hbmRzXHJcbi8vIFJ1biBgbnBtIHJ1biBkb2NzOmRyYW1gIHRvIHJlZ2VuZXJhdGUgZG9jcy9EUkFNX1NDUklQVC5tZFxyXG5cclxuaW1wb3J0IHR5cGUgeyBTY3JpcHRDb21tYW5kVHlwZSB9IGZyb20gJy4vc2NyaXB0UGFyc2VyJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWFuZFBhcmFtZXRlciB7XHJcbiAgbmFtZTogc3RyaW5nO1xyXG4gIHR5cGU6IHN0cmluZztcclxuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xyXG4gIG9wdGlvbmFsPzogYm9vbGVhbjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kRG9jIHtcclxuICB0eXBlOiBTY3JpcHRDb21tYW5kVHlwZTtcclxuICBjYXRlZ29yeTogJ3NjZW5lJyB8ICdhY3RvcicgfCAnZGlhbG9ndWUnIHwgJ2F1ZGlvJyB8ICdidXR0b24nIHwgJ2Nob2ljZScgfCAnZmxvdycgfCAnZWZmZWN0JyB8ICdpbnN0cnVtZW50JztcclxuICBzeW50YXg6IHN0cmluZztcclxuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xyXG4gIHBhcmFtZXRlcnM/OiBDb21tYW5kUGFyYW1ldGVyW107XHJcbiAgZXhhbXBsZTogc3RyaW5nO1xyXG4gIGltcGxlbWVudGVkOiBib29sZWFuO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgQ09NTUFORF9ET0NTOiBDb21tYW5kRG9jW10gPSBbXHJcbiAgLy8gPT09PT09PT09PT09IERJQUxPR1VFIENPTU1BTkRTID09PT09PT09PT09PVxyXG4gIHtcclxuICAgIHR5cGU6ICdESUFMT0dVRScsXHJcbiAgICBjYXRlZ29yeTogJ2RpYWxvZ3VlJyxcclxuICAgIHN5bnRheDogJ0FDVE9SX05BTUU6IFwiZGlhbG9ndWUgdGV4dFwiJyxcclxuICAgIGRlc2NyaXB0aW9uOiAnRGlzcGxheXMgZGlhbG9ndWUgc3Bva2VuIGJ5IGFuIGFjdG9yLiBUaGUgYWN0b3IgbmFtZSBtdXN0IG1hdGNoIGEgZGVmaW5lZCBhY3Rvci4nLFxyXG4gICAgcGFyYW1ldGVyczogW1xyXG4gICAgICB7IG5hbWU6ICdhY3Rvck5hbWUnLCB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdUaGUgbmFtZSBvZiB0aGUgc3BlYWtpbmcgYWN0b3IgKGNhc2Utc2Vuc2l0aXZlLCBzdGFydHMgd2l0aCB1cHBlcmNhc2UpJyB9LFxyXG4gICAgICB7IG5hbWU6ICd0ZXh0JywgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVGhlIGRpYWxvZ3VlIHRleHQgdG8gZGlzcGxheSAoaW4gcXVvdGVzKScgfSxcclxuICAgIF0sXHJcbiAgICBleGFtcGxlOiBgRGV0ZWN0aXZlOiBcIkkndmUgc2VlbiB0aGluZ3MgeW91IHdvdWxkbid0IGJlbGlldmUuXCJcclxuTmFycmF0b3I6IFwiVGhlIHJhaW4gY29udGludWVkIHRvIGZhbGwuXCJcclxuQWxpY2UgKHRoaW5raW5nKTogXCJXaGF0IHNob3VsZCBJIGRvIG5leHQ/XCJgLFxyXG4gICAgaW1wbGVtZW50ZWQ6IHRydWUsXHJcbiAgfSxcclxuXHJcbiAgLy8gPT09PT09PT09PT09IEFDVE9SIENPTU1BTkRTID09PT09PT09PT09PVxyXG4gIHtcclxuICAgIHR5cGU6ICdFTlRFUicsXHJcbiAgICBjYXRlZ29yeTogJ2FjdG9yJyxcclxuICAgIHN5bnRheDogJ1tFTlRFUiBhY3Rvcl9pZCBhdCB4LHldJyxcclxuICAgIGRlc2NyaXB0aW9uOiAnTWFrZXMgYW4gYWN0b3IgYXBwZWFyIG9uIHN0YWdlIGF0IHRoZSBzcGVjaWZpZWQgcG9zaXRpb24gKHBlcmNlbnRhZ2Ugb2Ygc3RhZ2UgZGltZW5zaW9ucykuJyxcclxuICAgIHBhcmFtZXRlcnM6IFtcclxuICAgICAgeyBuYW1lOiAnYWN0b3JfaWQnLCB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdUaGUgdW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGFjdG9yJyB9LFxyXG4gICAgICB7IG5hbWU6ICd4JywgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnSG9yaXpvbnRhbCBwb3NpdGlvbiAoMC0xMDAsIHBlcmNlbnRhZ2UgZnJvbSBsZWZ0KScgfSxcclxuICAgICAgeyBuYW1lOiAneScsIHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ1ZlcnRpY2FsIHBvc2l0aW9uICgwLTEwMCwgcGVyY2VudGFnZSBmcm9tIHRvcCknIH0sXHJcbiAgICBdLFxyXG4gICAgZXhhbXBsZTogJ1tFTlRFUiBkZXRlY3RpdmUgYXQgMjUsNTBdXFxuW0VOVEVSIHdpdG5lc3MgYXQgNzUsNTBdJyxcclxuICAgIGltcGxlbWVudGVkOiB0cnVlLFxyXG4gIH0sXHJcbiAge1xyXG4gICAgdHlwZTogJ0VYSVQnLFxyXG4gICAgY2F0ZWdvcnk6ICdhY3RvcicsXHJcbiAgICBzeW50YXg6ICdbRVhJVCBhY3Rvcl9pZF0nLFxyXG4gICAgZGVzY3JpcHRpb246ICdSZW1vdmVzIGFuIGFjdG9yIGZyb20gdGhlIHN0YWdlLicsXHJcbiAgICBwYXJhbWV0ZXJzOiBbXHJcbiAgICAgIHsgbmFtZTogJ2FjdG9yX2lkJywgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVGhlIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBhY3RvciB0byByZW1vdmUnIH0sXHJcbiAgICBdLFxyXG4gICAgZXhhbXBsZTogJ1tFWElUIGRldGVjdGl2ZV0nLFxyXG4gICAgaW1wbGVtZW50ZWQ6IHRydWUsXHJcbiAgfSxcclxuICB7XHJcbiAgICB0eXBlOiAnTU9WRScsXHJcbiAgICBjYXRlZ29yeTogJ2FjdG9yJyxcclxuICAgIHN5bnRheDogJ1tNT1ZFIGFjdG9yX2lkIHRvIHgseSBvdmVyIGR1cmF0aW9uXScsXHJcbiAgICBkZXNjcmlwdGlvbjogJ0FuaW1hdGVzIGFuIGFjdG9yIG1vdmluZyB0byBhIG5ldyBwb3NpdGlvbiBvdmVyIHRoZSBzcGVjaWZpZWQgZHVyYXRpb24uJyxcclxuICAgIHBhcmFtZXRlcnM6IFtcclxuICAgICAgeyBuYW1lOiAnYWN0b3JfaWQnLCB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdUaGUgdW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGFjdG9yJyB9LFxyXG4gICAgICB7IG5hbWU6ICd4JywgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnVGFyZ2V0IGhvcml6b250YWwgcG9zaXRpb24gKDAtMTAwKScgfSxcclxuICAgICAgeyBuYW1lOiAneScsIHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ1RhcmdldCB2ZXJ0aWNhbCBwb3NpdGlvbiAoMC0xMDApJyB9LFxyXG4gICAgICB7IG5hbWU6ICdkdXJhdGlvbicsIHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0FuaW1hdGlvbiBkdXJhdGlvbiAoZS5nLiwgXCIyc1wiLCBcIjUwMG1zXCIpJywgb3B0aW9uYWw6IHRydWUgfSxcclxuICAgIF0sXHJcbiAgICBleGFtcGxlOiAnW01PVkUgZGV0ZWN0aXZlIHRvIDUwLDUwIG92ZXIgMXNdXFxuW01PVkUgd2l0bmVzcyB0byAyNSw1MF0nLFxyXG4gICAgaW1wbGVtZW50ZWQ6IHRydWUsXHJcbiAgfSxcclxuICB7XHJcbiAgICB0eXBlOiAnUE9TRScsXHJcbiAgICBjYXRlZ29yeTogJ2FjdG9yJyxcclxuICAgIHN5bnRheDogJ1tQT1NFIGFjdG9yX2lkIHBvc2U9UG9zZU5hbWUgZXhwcmVzc2lvbj1FeHByZXNzaW9uTmFtZV0nLFxyXG4gICAgZGVzY3JpcHRpb246ICdDaGFuZ2VzIGFuIGFjdG9yXFwncyBwb3NlIGFuZC9vciBleHByZXNzaW9uLicsXHJcbiAgICBwYXJhbWV0ZXJzOiBbXHJcbiAgICAgIHsgbmFtZTogJ2FjdG9yX2lkJywgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVGhlIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBhY3RvcicgfSxcclxuICAgICAgeyBuYW1lOiAncG9zZScsIHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1RoZSBwb3NlIG5hbWUgdG8gc3dpdGNoIHRvJywgb3B0aW9uYWw6IHRydWUgfSxcclxuICAgICAgeyBuYW1lOiAnZXhwcmVzc2lvbicsIHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1RoZSBleHByZXNzaW9uIG5hbWUgdG8gZGlzcGxheScsIG9wdGlvbmFsOiB0cnVlIH0sXHJcbiAgICBdLFxyXG4gICAgZXhhbXBsZTogJ1tQT1NFIGRldGVjdGl2ZSBwb3NlPVRoaW5raW5nIGV4cHJlc3Npb249V29ycmllZF1cXG5bUE9TRSB3aXRuZXNzIGV4cHJlc3Npb249SGFwcHldJyxcclxuICAgIGltcGxlbWVudGVkOiB0cnVlLFxyXG4gIH0sXHJcblxyXG4gIC8vID09PT09PT09PT09PSBBVURJTyBDT01NQU5EUyA9PT09PT09PT09PT1cclxuICB7XHJcbiAgICB0eXBlOiAnQkdNJyxcclxuICAgIGNhdGVnb3J5OiAnYXVkaW8nLFxyXG4gICAgc3ludGF4OiAnW0JHTTogXCJ0cmFja19uYW1lXCIgbG9vcCB2b2w9WFglXScsXHJcbiAgICBkZXNjcmlwdGlvbjogJ1BsYXlzIGJhY2tncm91bmQgbXVzaWMuIENhbiBsb29wIGFuZCBzZXQgdm9sdW1lLicsXHJcbiAgICBwYXJhbWV0ZXJzOiBbXHJcbiAgICAgIHsgbmFtZTogJ3RyYWNrX25hbWUnLCB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdOYW1lIG9yIElEIG9mIHRoZSBtdXNpYyB0cmFjaycgfSxcclxuICAgICAgeyBuYW1lOiAnbG9vcCcsIHR5cGU6ICdmbGFnJywgZGVzY3JpcHRpb246ICdBZGQgXCJsb29wXCIgdG8gcmVwZWF0IHRoZSB0cmFjaycsIG9wdGlvbmFsOiB0cnVlIH0sXHJcbiAgICAgIHsgbmFtZTogJ3ZvbCcsIHR5cGU6ICdwZXJjZW50YWdlJywgZGVzY3JpcHRpb246ICdWb2x1bWUgbGV2ZWwgKDAtMTAwJSknLCBvcHRpb25hbDogdHJ1ZSB9LFxyXG4gICAgXSxcclxuICAgIGV4YW1wbGU6ICdbQkdNOiBcIm5vaXJfamF6elwiIGxvb3Agdm9sPTcwJV1cXG5bQkdNOiBcInRlbnNpb25cIiB2b2w9NTAlXScsXHJcbiAgICBpbXBsZW1lbnRlZDogdHJ1ZSxcclxuICB9LFxyXG4gIHtcclxuICAgIHR5cGU6ICdBTUJJRU5DRScsXHJcbiAgICBjYXRlZ29yeTogJ2F1ZGlvJyxcclxuICAgIHN5bnRheDogJ1tBTUJJRU5DRTogXCJ0cmFja19uYW1lXCIgbG9vcCB2b2w9WFglXScsXHJcbiAgICBkZXNjcmlwdGlvbjogJ1BsYXlzIGFtYmllbnQgYmFja2dyb3VuZCBzb3VuZHMgKHJhaW4sIGNyb3dkIG5vaXNlLCBldGMuKS4nLFxyXG4gICAgcGFyYW1ldGVyczogW1xyXG4gICAgICB7IG5hbWU6ICd0cmFja19uYW1lJywgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTmFtZSBvciBJRCBvZiB0aGUgYW1iaWVudCB0cmFjaycgfSxcclxuICAgICAgeyBuYW1lOiAnbG9vcCcsIHR5cGU6ICdmbGFnJywgZGVzY3JpcHRpb246ICdBZGQgXCJsb29wXCIgdG8gcmVwZWF0IHRoZSB0cmFjaycsIG9wdGlvbmFsOiB0cnVlIH0sXHJcbiAgICAgIHsgbmFtZTogJ3ZvbCcsIHR5cGU6ICdwZXJjZW50YWdlJywgZGVzY3JpcHRpb246ICdWb2x1bWUgbGV2ZWwgKDAtMTAwJSknLCBvcHRpb25hbDogdHJ1ZSB9LFxyXG4gICAgXSxcclxuICAgIGV4YW1wbGU6ICdbQU1CSUVOQ0U6IFwiY2l0eV9yYWluXCIgbG9vcCB2b2w9NDAlXScsXHJcbiAgICBpbXBsZW1lbnRlZDogdHJ1ZSxcclxuICB9LFxyXG4gIHtcclxuICAgIHR5cGU6ICdTRlgnLFxyXG4gICAgY2F0ZWdvcnk6ICdhdWRpbycsXHJcbiAgICBzeW50YXg6ICdbU0ZYOiBcImVmZmVjdF9uYW1lXCIgdm9sPVhYJV0nLFxyXG4gICAgZGVzY3JpcHRpb246ICdQbGF5cyBhIG9uZS1zaG90IHNvdW5kIGVmZmVjdC4nLFxyXG4gICAgcGFyYW1ldGVyczogW1xyXG4gICAgICB7IG5hbWU6ICdlZmZlY3RfbmFtZScsIHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ05hbWUgb3IgSUQgb2YgdGhlIHNvdW5kIGVmZmVjdCcgfSxcclxuICAgICAgeyBuYW1lOiAndm9sJywgdHlwZTogJ3BlcmNlbnRhZ2UnLCBkZXNjcmlwdGlvbjogJ1ZvbHVtZSBsZXZlbCAoMC0xMDAlKScsIG9wdGlvbmFsOiB0cnVlIH0sXHJcbiAgICBdLFxyXG4gICAgZXhhbXBsZTogJ1tTRlg6IFwiZG9vcl9zbGFtXCJdXFxuW1NGWDogXCJ0aHVuZGVyXCIgdm9sPTgwJV0nLFxyXG4gICAgaW1wbGVtZW50ZWQ6IHRydWUsXHJcbiAgfSxcclxuXHJcbiAgLy8gPT09PT09PT09PT09IEVGRkVDVCBDT01NQU5EUyA9PT09PT09PT09PT1cclxuICB7XHJcbiAgICB0eXBlOiAnRUZGRUNUJyxcclxuICAgIGNhdGVnb3J5OiAnZWZmZWN0JyxcclxuICAgIHN5bnRheDogJ1tFRkZFQ1Qgc2Z4X2lkIG9uIHRhcmdldF9pZF0nLFxyXG4gICAgZGVzY3JpcHRpb246ICdBcHBsaWVzIGEgdmlzdWFsIGVmZmVjdCAoc2hhZGVyLCBmaWx0ZXIsIGFuaW1hdGlvbikgdG8gYW4gYWN0b3Igb3IgZWxlbWVudC4nLFxyXG4gICAgcGFyYW1ldGVyczogW1xyXG4gICAgICB7IG5hbWU6ICdzZnhfaWQnLCB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdUaGUgSUQgb2YgdGhlIFNGWC9lZmZlY3QgdG8gYXBwbHknIH0sXHJcbiAgICAgIHsgbmFtZTogJ3RhcmdldF9pZCcsIHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1RoZSBJRCBvZiB0aGUgYWN0b3Igb3IgZWxlbWVudCB0byBhZmZlY3QnIH0sXHJcbiAgICBdLFxyXG4gICAgZXhhbXBsZTogJ1tFRkZFQ1QgZ2xvdyBvbiBkZXRlY3RpdmVdXFxuW0VGRkVDVCBzaGFrZSBvbiBzdGFnZV0nLFxyXG4gICAgaW1wbGVtZW50ZWQ6IHRydWUsXHJcbiAgfSxcclxuICB7XHJcbiAgICB0eXBlOiAnQ0xFQVJfRUZGRUNUJyxcclxuICAgIGNhdGVnb3J5OiAnZWZmZWN0JyxcclxuICAgIHN5bnRheDogJ1tDTEVBUl9FRkZFQ1Qgc2Z4X2lkIGZyb20gdGFyZ2V0X2lkXScsXHJcbiAgICBkZXNjcmlwdGlvbjogJ1JlbW92ZXMgYSBwcmV2aW91c2x5IGFwcGxpZWQgdmlzdWFsIGVmZmVjdCBmcm9tIGFuIGFjdG9yIG9yIGVsZW1lbnQuJyxcclxuICAgIHBhcmFtZXRlcnM6IFtcclxuICAgICAgeyBuYW1lOiAnc2Z4X2lkJywgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVGhlIElEIG9mIHRoZSBTRlgvZWZmZWN0IHRvIHJlbW92ZScgfSxcclxuICAgICAgeyBuYW1lOiAndGFyZ2V0X2lkJywgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVGhlIElEIG9mIHRoZSBhY3RvciBvciBlbGVtZW50JyB9LFxyXG4gICAgXSxcclxuICAgIGV4YW1wbGU6ICdbQ0xFQVJfRUZGRUNUIGdsb3cgZnJvbSBkZXRlY3RpdmVdJyxcclxuICAgIGltcGxlbWVudGVkOiB0cnVlLFxyXG4gIH0sXHJcblxyXG4gIHtcclxuICAgIHR5cGU6ICdCSU5EJyxcclxuICAgIGNhdGVnb3J5OiAnZWZmZWN0JyxcclxuICAgIHN5bnRheDogJ1tCSU5EIGVsZW1lbnRfaWQucHJvcGVydHkgdG8gZXhwcmVzc2lvbl0nLFxyXG4gICAgZGVzY3JpcHRpb246ICdMaXZlLWJpbmRzIGEgc3RhZ2UgZWxlbWVudCBwcm9wZXJ0eSB0byBhbiBleHByZXNzaW9uIG92ZXIgd29ybGQgc3RhdGUgdmFyaWFibGVzLiBUaGUgYmluZGluZyByZS1ldmFsdWF0ZXMgd2hlbmV2ZXIgdmFyaWFibGVzIGNoYW5nZSAoU0VULCBUSUNLLCBzbGlkZXJzKSwgZHJpdmluZyB0aGUgZWxlbWVudCBjb250aW51b3VzbHkuIEJpbmRhYmxlIHByb3BlcnRpZXM6IHgsIHksIHNjYWxlLCByb3RhdGlvbiwgb3BhY2l0eSwgekluZGV4LiBCaW5kaW5ncyBjbGVhciBvbiBzY2VuZSBjaGFuZ2UuIEJhZCBleHByZXNzaW9ucyBldmFsdWF0ZSB0byAwIHdpdGggYSBjb25zb2xlIHdhcm5pbmcuJyxcclxuICAgIHBhcmFtZXRlcnM6IFtcclxuICAgICAgeyBuYW1lOiAnZWxlbWVudF9pZCcsIHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1RoZSBJRCBvZiB0aGUgc3RhZ2UgZWxlbWVudCB0byBkcml2ZScgfSxcclxuICAgICAgeyBuYW1lOiAncHJvcGVydHknLCB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdPbmUgb2Y6IHgsIHksIHNjYWxlLCByb3RhdGlvbiwgb3BhY2l0eSwgekluZGV4JyB9LFxyXG4gICAgICB7IG5hbWU6ICdleHByZXNzaW9uJywgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQXJpdGhtZXRpYyBleHByZXNzaW9uIChzYW1lIGdyYW1tYXIgYXMgU0VUKScgfSxcclxuICAgIF0sXHJcbiAgICBleGFtcGxlOiBgW0JJTkQgc2lwaG9uX2FybS5yb3RhdGlvbiB0byByZW50ICogMC45XVxyXG5bQklORCByZXNlcnZvaXIuc2NhbGUgdG8gMC41ICsgaG9hcmQgLyAyMDBdXHJcbltCSU5EIG1hcmdpbl9mbG9vci55IHRvIDgwIC0gbWFyZ2luSGVpZ2h0XVxyXG5bQklORCBwcmVzdGlnZV9zaGVsbC5vcGFjaXR5IHRvIHByZXN0aWdlIC8gMTAwXWAsXHJcbiAgICBpbXBsZW1lbnRlZDogdHJ1ZSxcclxuICB9LFxyXG4gIHtcclxuICAgIHR5cGU6ICdVTkJJTkQnLFxyXG4gICAgY2F0ZWdvcnk6ICdlZmZlY3QnLFxyXG4gICAgc3ludGF4OiAnW1VOQklORCBlbGVtZW50X2lkLnByb3BlcnR5XScsXHJcbiAgICBkZXNjcmlwdGlvbjogJ1JlbGVhc2VzIGEgcHJvcGVydHkgYmluZGluZyBjcmVhdGVkIHdpdGggQklORC4gVGhlIGVsZW1lbnQga2VlcHMgaXRzIGxhc3QgZHJpdmVuIHZhbHVlLicsXHJcbiAgICBwYXJhbWV0ZXJzOiBbXHJcbiAgICAgIHsgbmFtZTogJ2VsZW1lbnRfaWQnLCB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdUaGUgSUQgb2YgdGhlIHN0YWdlIGVsZW1lbnQnIH0sXHJcbiAgICAgIHsgbmFtZTogJ3Byb3BlcnR5JywgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVGhlIGJvdW5kIHByb3BlcnR5IHRvIHJlbGVhc2UnIH0sXHJcbiAgICBdLFxyXG4gICAgZXhhbXBsZTogJ1tVTkJJTkQgc2lwaG9uX2FybS5yb3RhdGlvbl0nLFxyXG4gICAgaW1wbGVtZW50ZWQ6IHRydWUsXHJcbiAgfSxcclxuXHJcbiAgLy8gPT09PT09PT09PT09IEJVVFRPTiBDT01NQU5EUyA9PT09PT09PT09PT1cclxuICB7XHJcbiAgICB0eXBlOiAnQlVUVE9OJyxcclxuICAgIGNhdGVnb3J5OiAnYnV0dG9uJyxcclxuICAgIHN5bnRheDogJ1tCVVRUT04gYnV0dG9uX2lkXScsXHJcbiAgICBkZXNjcmlwdGlvbjogJ0Rpc3BsYXlzIGFuIGludGVyYWN0aXZlIGJ1dHRvbiBvbiB0aGUgc3RhZ2UuIEJ1dHRvbnMgY2FuIG5hdmlnYXRlIHRvIHNjZW5lcywgcGxheSBzb3VuZHMsIG9yIG9wZW4gVVJMcy4nLFxyXG4gICAgcGFyYW1ldGVyczogW1xyXG4gICAgICB7IG5hbWU6ICdidXR0b25faWQnLCB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdUaGUgdW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGJ1dHRvbiB0byBzaG93JyB9LFxyXG4gICAgXSxcclxuICAgIGV4YW1wbGU6ICdbQlVUVE9OIGV4YW1pbmVfZGVza11cXG5bQlVUVE9OIG9wZW5fZG9vcl0nLFxyXG4gICAgaW1wbGVtZW50ZWQ6IHRydWUsXHJcbiAgfSxcclxuICB7XHJcbiAgICB0eXBlOiAnSElERV9CVVRUT04nLFxyXG4gICAgY2F0ZWdvcnk6ICdidXR0b24nLFxyXG4gICAgc3ludGF4OiAnW0hJREVfQlVUVE9OIGJ1dHRvbl9pZF0nLFxyXG4gICAgZGVzY3JpcHRpb246ICdIaWRlcyBhbmQgZGVhY3RpdmF0ZXMgYSBwcmV2aW91c2x5IHNob3duIGJ1dHRvbi4nLFxyXG4gICAgcGFyYW1ldGVyczogW1xyXG4gICAgICB7IG5hbWU6ICdidXR0b25faWQnLCB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdUaGUgdW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGJ1dHRvbiB0byBoaWRlJyB9LFxyXG4gICAgXSxcclxuICAgIGV4YW1wbGU6ICdbSElERV9CVVRUT04gZXhhbWluZV9kZXNrXScsXHJcbiAgICBpbXBsZW1lbnRlZDogdHJ1ZSxcclxuICB9LFxyXG5cclxuICAvLyA9PT09PT09PT09PT0gSU5TVFJVTUVOVCBDT01NQU5EUyA9PT09PT09PT09PT1cclxuICB7XHJcbiAgICB0eXBlOiAnU0xJREVSJyxcclxuICAgIGNhdGVnb3J5OiAnaW5zdHJ1bWVudCcsXHJcbiAgICBzeW50YXg6ICdbU0xJREVSIHZhcmlhYmxlIGF0IHgseSBtaW49MCBtYXg9MTAwIHN0ZXA9MSBsYWJlbD1cIlRFWFRcIl0nLFxyXG4gICAgZGVzY3JpcHRpb246ICdTaG93cyBhbiBpbnRlcmFjdGl2ZSBzbGlkZXIgdGhhdCB3cml0ZXMgaXRzIHdvcmxkU3RhdGUgdmFyaWFibGUgY29udGludW91c2x5IGFzIHRoZSBwbGF5ZXIgZHJhZ3MuIFBvc2l0aW9uIGlzIGEgcGVyY2VudGFnZSBvZiB0aGUgc3RhZ2UuIG1pbi9tYXggZGVmYXVsdCB0byAwLzEwMCwgc3RlcCB0byAxOyBsYWJlbCBkZWZhdWx0cyB0byB0aGUgdmFyaWFibGUgbmFtZS4gRHJhZ2dpbmcgcmUtZXZhbHVhdGVzIEJJTkRzIGltbWVkaWF0ZWx5LCBzbyBzbGlkZXJzIGRyaXZlIHRoZSBzdGFnZSBsaXZlLicsXHJcbiAgICBwYXJhbWV0ZXJzOiBbXHJcbiAgICAgIHsgbmFtZTogJ3ZhcmlhYmxlJywgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVGhlIHdvcmxkU3RhdGUgdmFyaWFibGUgdGhlIHNsaWRlciB3cml0ZXMnIH0sXHJcbiAgICAgIHsgbmFtZTogJ3gnLCB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdIb3Jpem9udGFsIHBvc2l0aW9uICgwLTEwMCwgcGVyY2VudGFnZSBmcm9tIGxlZnQpJyB9LFxyXG4gICAgICB7IG5hbWU6ICd5JywgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnVmVydGljYWwgcG9zaXRpb24gKDAtMTAwLCBwZXJjZW50YWdlIGZyb20gdG9wKScgfSxcclxuICAgICAgeyBuYW1lOiAnbWluJywgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnTWluaW11bSB2YWx1ZSAoZGVmYXVsdCAwKScsIG9wdGlvbmFsOiB0cnVlIH0sXHJcbiAgICAgIHsgbmFtZTogJ21heCcsIHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ01heGltdW0gdmFsdWUgKGRlZmF1bHQgMTAwKScsIG9wdGlvbmFsOiB0cnVlIH0sXHJcbiAgICAgIHsgbmFtZTogJ3N0ZXAnLCB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdEcmFnIGluY3JlbWVudCAoZGVmYXVsdCAxKScsIG9wdGlvbmFsOiB0cnVlIH0sXHJcbiAgICAgIHsgbmFtZTogJ2xhYmVsJywgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUGFuZWwgbGFiZWwgKGRlZmF1bHQ6IHZhcmlhYmxlIG5hbWUpJywgb3B0aW9uYWw6IHRydWUgfSxcclxuICAgIF0sXHJcbiAgICBleGFtcGxlOiAnW1NMSURFUiBncmVlZCBhdCA4NSwyMCBtaW49MCBtYXg9MTAwIGxhYmVsPVwiR1JFRURcIl1cXG5bU0xJREVSIHJlbnRTaGFyZSBhdCA4NSwzNSBtaW49MCBtYXg9MSBzdGVwPTAuMDUgbGFiZWw9XCJSRU5UIFNIQVJFXCJdJyxcclxuICAgIGltcGxlbWVudGVkOiB0cnVlLFxyXG4gIH0sXHJcbiAge1xyXG4gICAgdHlwZTogJ0dBVUdFJyxcclxuICAgIGNhdGVnb3J5OiAnaW5zdHJ1bWVudCcsXHJcbiAgICBzeW50YXg6ICdbR0FVR0UgdmFyaWFibGUgYXQgeCx5IG1pbj0wIG1heD0xMDAgbGFiZWw9XCJURVhUXCJdJyxcclxuICAgIGRlc2NyaXB0aW9uOiAnU2hvd3MgYSByZWFkLW9ubHkgZGlhbCBkaXNwbGF5aW5nIG9uZSB3b3JsZFN0YXRlIHZhcmlhYmxlLCB1cGRhdGluZyBsaXZlIGFzIHRoZSB2YXJpYWJsZSBjaGFuZ2VzIChTRVQsIFRJQ0ssIHNsaWRlcnMpLicsXHJcbiAgICBwYXJhbWV0ZXJzOiBbXHJcbiAgICAgIHsgbmFtZTogJ3ZhcmlhYmxlJywgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVGhlIHdvcmxkU3RhdGUgdmFyaWFibGUgdGhlIGdhdWdlIGRpc3BsYXlzJyB9LFxyXG4gICAgICB7IG5hbWU6ICd4JywgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnSG9yaXpvbnRhbCBwb3NpdGlvbiAoMC0xMDAsIHBlcmNlbnRhZ2UgZnJvbSBsZWZ0KScgfSxcclxuICAgICAgeyBuYW1lOiAneScsIHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ1ZlcnRpY2FsIHBvc2l0aW9uICgwLTEwMCwgcGVyY2VudGFnZSBmcm9tIHRvcCknIH0sXHJcbiAgICAgIHsgbmFtZTogJ21pbicsIHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ0RpYWwgbWluaW11bSAoZGVmYXVsdCAwKScsIG9wdGlvbmFsOiB0cnVlIH0sXHJcbiAgICAgIHsgbmFtZTogJ21heCcsIHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ0RpYWwgbWF4aW11bSAoZGVmYXVsdCAxMDApJywgb3B0aW9uYWw6IHRydWUgfSxcclxuICAgICAgeyBuYW1lOiAnbGFiZWwnLCB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdQYW5lbCBsYWJlbCAoZGVmYXVsdDogdmFyaWFibGUgbmFtZSknLCBvcHRpb25hbDogdHJ1ZSB9LFxyXG4gICAgXSxcclxuICAgIGV4YW1wbGU6ICdbR0FVR0Ugd2FnZXMgYXQgMTUsODAgbWluPTAgbWF4PTEwMCBsYWJlbD1cIldBR0VTXCJdJyxcclxuICAgIGltcGxlbWVudGVkOiB0cnVlLFxyXG4gIH0sXHJcbiAge1xyXG4gICAgdHlwZTogJ0hJREVfU0xJREVSJyxcclxuICAgIGNhdGVnb3J5OiAnaW5zdHJ1bWVudCcsXHJcbiAgICBzeW50YXg6ICdbSElERV9TTElERVIgdmFyaWFibGVdJyxcclxuICAgIGRlc2NyaXB0aW9uOiAnSGlkZXMgdGhlIHNsaWRlciBib3VuZCB0byB0aGUgZ2l2ZW4gdmFyaWFibGUuJyxcclxuICAgIHBhcmFtZXRlcnM6IFtcclxuICAgICAgeyBuYW1lOiAndmFyaWFibGUnLCB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdUaGUgdmFyaWFibGUgd2hvc2Ugc2xpZGVyIHRvIGhpZGUnIH0sXHJcbiAgICBdLFxyXG4gICAgZXhhbXBsZTogJ1tISURFX1NMSURFUiBncmVlZF0nLFxyXG4gICAgaW1wbGVtZW50ZWQ6IHRydWUsXHJcbiAgfSxcclxuICB7XHJcbiAgICB0eXBlOiAnSElERV9HQVVHRScsXHJcbiAgICBjYXRlZ29yeTogJ2luc3RydW1lbnQnLFxyXG4gICAgc3ludGF4OiAnW0hJREVfR0FVR0UgdmFyaWFibGVdJyxcclxuICAgIGRlc2NyaXB0aW9uOiAnSGlkZXMgdGhlIGdhdWdlIGJvdW5kIHRvIHRoZSBnaXZlbiB2YXJpYWJsZS4nLFxyXG4gICAgcGFyYW1ldGVyczogW1xyXG4gICAgICB7IG5hbWU6ICd2YXJpYWJsZScsIHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1RoZSB2YXJpYWJsZSB3aG9zZSBnYXVnZSB0byBoaWRlJyB9LFxyXG4gICAgXSxcclxuICAgIGV4YW1wbGU6ICdbSElERV9HQVVHRSB3YWdlc10nLFxyXG4gICAgaW1wbGVtZW50ZWQ6IHRydWUsXHJcbiAgfSxcclxuXHJcbiAgLy8gPT09PT09PT09PT09IENIT0lDRSBDT01NQU5EUyA9PT09PT09PT09PT1cclxuICB7XHJcbiAgICB0eXBlOiAnQ0hPSUNFJyxcclxuICAgIGNhdGVnb3J5OiAnY2hvaWNlJyxcclxuICAgIHN5bnRheDogJ1tDSE9JQ0VdXFxuLSBcIk9wdGlvbiB0ZXh0XCIgLT4gdGFyZ2V0X3NjZW5lXFxuWy9DSE9JQ0VdJyxcclxuICAgIGRlc2NyaXB0aW9uOiAnUHJlc2VudHMgdGhlIHBsYXllciB3aXRoIGJyYW5jaGluZyBkaWFsb2d1ZSBvcHRpb25zLiBFYWNoIG9wdGlvbiBuYXZpZ2F0ZXMgdG8gYSBkaWZmZXJlbnQgc2NlbmUuJyxcclxuICAgIHBhcmFtZXRlcnM6IFtcclxuICAgICAgeyBuYW1lOiAnb3B0aW9ucycsIHR5cGU6ICdhcnJheScsIGRlc2NyaXB0aW9uOiAnTGlzdCBvZiBjaG9pY2Ugb3B0aW9ucyB3aXRoIHRleHQgYW5kIHRhcmdldCBzY2VuZXMnIH0sXHJcbiAgICBdLFxyXG4gICAgZXhhbXBsZTogYFtDSE9JQ0VdXHJcbi0gXCJJbnZlc3RpZ2F0ZSB0aGUgZGVza1wiIC0+IGRlc2tfc2NlbmVcclxuLSBcIlRhbGsgdG8gdGhlIHdpdG5lc3NcIiAtPiB3aXRuZXNzX3NjZW5lXHJcbi0gXCJMZWF2ZSB0aGUgcm9vbVwiIC0+IGhhbGx3YXlcclxuWy9DSE9JQ0VdYCxcclxuICAgIGltcGxlbWVudGVkOiB0cnVlLFxyXG4gIH0sXHJcblxyXG4gIC8vID09PT09PT09PT09PSBGTE9XIENPTlRST0wgPT09PT09PT09PT09XHJcbiAge1xyXG4gICAgdHlwZTogJ1NDRU5FJyxcclxuICAgIGNhdGVnb3J5OiAnc2NlbmUnLFxyXG4gICAgc3ludGF4OiAnW1NDRU5FIHNjZW5lX2lkXScsXHJcbiAgICBkZXNjcmlwdGlvbjogJ1RyYW5zaXRpb25zIHRvIGEgZGlmZmVyZW50IHNjZW5lIGltbWVkaWF0ZWx5LicsXHJcbiAgICBwYXJhbWV0ZXJzOiBbXHJcbiAgICAgIHsgbmFtZTogJ3NjZW5lX2lkJywgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVGhlIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSB0YXJnZXQgc2NlbmUnIH0sXHJcbiAgICBdLFxyXG4gICAgZXhhbXBsZTogJ1tTQ0VORSBmb3Jlc3RfY2xlYXJpbmddXFxuW1NDRU5FIGNoYXB0ZXIyX2ludHJvXScsXHJcbiAgICBpbXBsZW1lbnRlZDogdHJ1ZSxcclxuICB9LFxyXG4gIHtcclxuICAgIHR5cGU6ICdXQUlUJyxcclxuICAgIGNhdGVnb3J5OiAnZmxvdycsXHJcbiAgICBzeW50YXg6ICdbV0FJVCBkdXJhdGlvbl0nLFxyXG4gICAgZGVzY3JpcHRpb246ICdQYXVzZXMgc2NyaXB0IGV4ZWN1dGlvbiBmb3IgdGhlIHNwZWNpZmllZCBkdXJhdGlvbi4nLFxyXG4gICAgcGFyYW1ldGVyczogW1xyXG4gICAgICB7IG5hbWU6ICdkdXJhdGlvbicsIHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1dhaXQgdGltZSAoZS5nLiwgXCIyc1wiLCBcIjUwMG1zXCIsIG9yIGp1c3QgXCIyXCIgZm9yIHNlY29uZHMpJyB9LFxyXG4gICAgXSxcclxuICAgIGV4YW1wbGU6ICdbV0FJVCAyc11cXG5bV0FJVCA1MDBtc10nLFxyXG4gICAgaW1wbGVtZW50ZWQ6IHRydWUsXHJcbiAgfSxcclxuICB7XHJcbiAgICB0eXBlOiAnU0VUJyxcclxuICAgIGNhdGVnb3J5OiAnZmxvdycsXHJcbiAgICBzeW50YXg6ICdbU0VUIHZhcmlhYmxlID0gdmFsdWVfb3JfZXhwcmVzc2lvbl0nLFxyXG4gICAgZGVzY3JpcHRpb246ICdTZXRzIGEgd29ybGQgc3RhdGUgdmFyaWFibGUgdGhhdCBwZXJzaXN0cyBhY3Jvc3Mgc2NlbmVzLiBUaGUgcmlnaHQgc2lkZSBjYW4gYmUgYSBsaXRlcmFsIChzdHJpbmcsIG51bWJlciwgYm9vbGVhbikgb3IgYW4gYXJpdGhtZXRpYyBleHByZXNzaW9uIG92ZXIgb3RoZXIgdmFyaWFibGVzLiBFeHByZXNzaW9ucyBzdXBwb3J0ICsgLSAqIC8gKCApLCBudW1lcmljIGxpdGVyYWxzLCB2YXJpYWJsZSBuYW1lcywgYW5kIHRoZSBmdW5jdGlvbnMgY2xhbXAoeCxtaW4sbWF4KSwgbWluKC4uLiksIG1heCguLi4pLCBhYnMoeCksIGZsb29yKHgpLCByYW5kKCkuIEEgYmFyZSB2YXJpYWJsZSBuYW1lIGNvcGllcyB0aGF0IHZhcmlhYmxlXFwncyB2YWx1ZS4gQmFkIGV4cHJlc3Npb25zIGFuZCB1bmtub3duIHZhcmlhYmxlcyByZXNvbHZlIHRvIDAgd2l0aCBhIGNvbnNvbGUgd2FybmluZyBcdTIwMTQgc2NyaXB0cyBuZXZlciBjcmFzaC4nLFxyXG4gICAgcGFyYW1ldGVyczogW1xyXG4gICAgICB7IG5hbWU6ICd2YXJpYWJsZScsIHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1RoZSB2YXJpYWJsZSBuYW1lIChhbHBoYW51bWVyaWMsIG5vIHNwYWNlcyknIH0sXHJcbiAgICAgIHsgbmFtZTogJ3ZhbHVlJywgdHlwZTogJ2FueScsIGRlc2NyaXB0aW9uOiAnQSBsaXRlcmFsIChzdHJpbmcsIG51bWJlciwgYm9vbGVhbikgb3IgYW4gYXJpdGhtZXRpYyBleHByZXNzaW9uJyB9LFxyXG4gICAgXSxcclxuICAgIGV4YW1wbGU6IGBbU0VUIGhhc0tleSA9IHRydWVdXHJcbltTRVQgdmlzaXRDb3VudCA9IDNdXHJcbltTRVQgcGxheWVyTmFtZSA9IFwiQWxleFwiXVxyXG5bU0VUIHByb2R1Y3QgPSBsYWJvckZvcmNlICogcHJvZHVjdGl2aXR5XVxyXG5bU0VUIHdhZ2VzID0gbWF4KHByb2R1Y3QgLSByZW50LCBzdXJ2aXZhbEZsb29yKV1cclxuW1NFVCByZW50ID0gY2xhbXAocHJvZHVjdCAqIHJlbnRTaGFyZSwgMCwgcHJvZHVjdCldYCxcclxuICAgIGltcGxlbWVudGVkOiB0cnVlLFxyXG4gIH0sXHJcbiAge1xyXG4gICAgdHlwZTogJ0lGJyxcclxuICAgIGNhdGVnb3J5OiAnZmxvdycsXHJcbiAgICBzeW50YXg6ICdbSUYgY29uZGl0aW9uXVxcbi4uLmNvbW1hbmRzLi4uXFxuW0VORElGXScsXHJcbiAgICBkZXNjcmlwdGlvbjogJ0NvbmRpdGlvbmFsbHkgZXhlY3V0ZXMgY29tbWFuZHMgYmFzZWQgb24gd29ybGQgc3RhdGUuIFRoZSBzaW1wbGUgZm9ybSBjb21wYXJlcyBvbmUgdmFyaWFibGUgYWdhaW5zdCBhIGxpdGVyYWwuIEVpdGhlciBzaWRlIG1heSBhbHNvIGJlIGFuIGFyaXRobWV0aWMgZXhwcmVzc2lvbiAoc2FtZSBncmFtbWFyIGFzIFNFVCksIGluIHdoaWNoIGNhc2UgYm90aCBzaWRlcyBldmFsdWF0ZSBudW1lcmljYWxseS4gQm9vbGVhbnMgY291bnQgYXMgMS8wIGluIGV4cHJlc3Npb25zLicsXHJcbiAgICBwYXJhbWV0ZXJzOiBbXHJcbiAgICAgIHsgbmFtZTogJ2xocycsIHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1RoZSB2YXJpYWJsZSB0byBjaGVjaywgb3IgYW4gYXJpdGhtZXRpYyBleHByZXNzaW9uJyB9LFxyXG4gICAgICB7IG5hbWU6ICdvcGVyYXRvcicsIHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NvbXBhcmlzb24gb3BlcmF0b3I6ID09LCAhPSwgPiwgPCwgPj0sIDw9JyB9LFxyXG4gICAgICB7IG5hbWU6ICdyaHMnLCB0eXBlOiAnYW55JywgZGVzY3JpcHRpb246ICdBIGxpdGVyYWwsIHZhcmlhYmxlLCBvciBhcml0aG1ldGljIGV4cHJlc3Npb24gdG8gY29tcGFyZSBhZ2FpbnN0JyB9LFxyXG4gICAgXSxcclxuICAgIGV4YW1wbGU6IGBbSUYgaGFzS2V5ID09IHRydWVdXHJcbkRldGVjdGl2ZTogXCJJIGNhbiB1bmxvY2sgdGhpcyBkb29yIG5vdy5cIlxyXG5bRU5ESUZdXHJcblxyXG5bSUYgd2FnZXMgPCBzdXJ2aXZhbEZsb29yICsgMTBdXHJcbk5hcnJhdG9yOiBcIlRoZSBodW1hbnMgYXJlIHN0YXJ2aW5nLlwiXHJcbltFTkRJRl1cclxuXHJcbltJRiBzcGVjdWxhdGlvbiAqIGdyZWVkID4gNTAwMF1cclxuW0VGRkVDVCBzaGFrZSBvbiBzdGFnZV1cclxuW0VORElGXWAsXHJcbiAgICBpbXBsZW1lbnRlZDogdHJ1ZSxcclxuICB9LFxyXG4gIHtcclxuICAgIHR5cGU6ICdFTkRJRicsXHJcbiAgICBjYXRlZ29yeTogJ2Zsb3cnLFxyXG4gICAgc3ludGF4OiAnW0VORElGXScsXHJcbiAgICBkZXNjcmlwdGlvbjogJ01hcmtzIHRoZSBlbmQgb2YgYW4gSUYgY29uZGl0aW9uYWwgYmxvY2suJyxcclxuICAgIHBhcmFtZXRlcnM6IFtdLFxyXG4gICAgZXhhbXBsZTogJ1tFTkRJRl0nLFxyXG4gICAgaW1wbGVtZW50ZWQ6IHRydWUsXHJcbiAgfSxcclxuICB7XHJcbiAgICB0eXBlOiAnVElDSycsXHJcbiAgICBjYXRlZ29yeTogJ2Zsb3cnLFxyXG4gICAgc3ludGF4OiAnW1RJQ0sgaW50ZXJ2YWxdXFxuLi4uY29tbWFuZHMuLi5cXG5bL1RJQ0tdJyxcclxuICAgIGRlc2NyaXB0aW9uOiAnQSByZXBlYXRpbmcgYmxvY2s6IHRoZSBib2R5IHJ1bnMgZXZlcnkgaW50ZXJ2YWwgd2hpbGUgdGhlIHNjZW5lIGlzIGFjdGl2ZSwgY29uY3VycmVudCB3aXRoIChuZXZlciBibG9ja2luZykgbm9ybWFsIHNjcmlwdCBhbmQgZGlhbG9ndWUgZmxvdy4gVXNlIGl0IGFzIGEgc2ltdWxhdGlvbiBoZWFydGJlYXQgXHUyMDE0IHR5cGljYWxseSBTRVRzIGFuZCBJRnMgdXBkYXRpbmcgd29ybGQgc3RhdGUuIE9uZSBUSUNLIGJsb2NrIHBlciBzY2VuZTsgZXh0cmEgYmxvY2tzIGFyZSBpZ25vcmVkIHdpdGggYSB3YXJuaW5nLiBCbG9ja2luZyBjb21tYW5kcyAoRElBTE9HVUUsIENIT0lDRSwgV0FJVCwgbmVzdGVkIFRJQ0spIGFyZSBza2lwcGVkIGluc2lkZSBhIHRpY2sgYm9keSB3aXRoIGEgd2FybmluZy4gVGhlIHRpY2sga2VlcHMgcnVubmluZyBhZnRlciB0aGUgc2NlbmUgc2NyaXB0IGNvbXBsZXRlcyBhbmQgc3RvcHMgb24gc2NlbmUgdHJhbnNpdGlvbi4nLFxyXG4gICAgcGFyYW1ldGVyczogW1xyXG4gICAgICB7IG5hbWU6ICdpbnRlcnZhbCcsIHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JlcGVhdCBpbnRlcnZhbCAoZS5nLiwgXCI1MDBtc1wiLCBcIjJzXCIpJyB9LFxyXG4gICAgXSxcclxuICAgIGV4YW1wbGU6IGBbVElDSyA1MDBtc11cclxuW1NFVCBwcm9kdWN0aXZpdHkgPSBwcm9kdWN0aXZpdHkgKyAwLjFdXHJcbltTRVQgcHJvZHVjdCA9IGxhYm9yRm9yY2UgKiBwcm9kdWN0aXZpdHkgKiAobWFyZ2luSGVpZ2h0IC8gMTAwKV1cclxuW0lGIHNwZWN1bGF0aW9uID4gNzBdXHJcbltFRkZFQ1Qgc2hha2Ugb24gc3RhZ2VdXHJcbltFTkRJRl1cclxuWy9USUNLXWAsXHJcbiAgICBpbXBsZW1lbnRlZDogdHJ1ZSxcclxuICB9LFxyXG5cclxuICB7XHJcbiAgICB0eXBlOiAnTkFSUkFUT04nLFxyXG4gICAgY2F0ZWdvcnk6ICdmbG93JyxcclxuICAgIHN5bnRheDogJ1tOQVJSQVRPTiBwb29sPXBvb2xfbmFtZV0nLFxyXG4gICAgZGVzY3JpcHRpb246ICdZaWVsZHMgZmxvdyBjb250cm9sIHRvIHRoZSBOYXJyYXRvbiBzZWxlY3RvciAodGhlIDE5ODYgS2luZyBvZiBDaGljYWdvIHN0b3J5dGVsbGVyKS4gSXQgZ2F0aGVycyBldmVyeSBzY2VuZSB3aG9zZSBOYXJyYXRvbiBtZXRhZGF0YSBuYW1lcyB0aGlzIHBvb2wsIGZpbHRlcnMgYnkgaGFyZCByZXF1aXJlbWVudHMsIHBsYXkgaGlzdG9yeSAobm9uLXJlcGVhdGFibGUgc2NlbmVzIHBsYXkgb25jZSksIGFuZCBzdWJwbG90IHJvdGF0aW9uIChvbmUgc2NlbmUgcGVyIHN1YnBsb3QsIGluIG9yZGVyKSwgdGhlbiB0cmFuc2l0aW9ucyB0byB0aGUgc3Vydml2b3Igd2hvc2Uga2V5cyBsZWFzdC1zcXVhcmVzIG1hdGNoIHRoZSBjdXJyZW50IHdvcmxkIHN0YXRlOiBzY29yZSA9IHN1bSBvZiAoKGN1cnJlbnQgLSB0YXJnZXQpIC8gc2NhbGUpXjIgcGVyIGtleSwgZGl2aWRlZCBieSB0aGUgc2NlbmVcXCdzIHdlaWdodDsgbG93ZXN0IHdpbnMsIGV4YWN0IHRpZXMgYnJlYWsgcmFuZG9tbHkuIFNjZW5lIG1ldGFkYXRhIGlzIHNldCBpbiB0aGUgc2NlbmUgZWRpdG9yLiBFdmVyeSBzZWxlY3Rpb24gZGVjaXNpb24gKGNhbmRpZGF0ZSBwb29sLCBnYXRlcywgcGVyLWtleSBkZWx0YXMsIHNjb3Jlcywgd2lubmVyKSBpcyBsb2dnZWQgdG8gdGhlIGNvbnNvbGUuIElmIG5vIHNjZW5lIGlzIGVsaWdpYmxlLCB0aGUgc2NyaXB0IGNvbnRpbnVlcyBwYXN0IHRoZSBjb21tYW5kIHdpdGggYSB3YXJuaW5nLicsXHJcbiAgICBwYXJhbWV0ZXJzOiBbXHJcbiAgICAgIHsgbmFtZTogJ3Bvb2wnLCB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdUaGUgc2VsZWN0aW9uIHBvb2wgdG8gZHJhdyBmcm9tIChkZWZhdWx0OiBtYWluKScsIG9wdGlvbmFsOiB0cnVlIH0sXHJcbiAgICBdLFxyXG4gICAgZXhhbXBsZTogYCMgTGV0IHRoZSBzdG9yeXRlbGxlciBwaWNrIHdoYXQgaGFwcGVucyBuZXh0XHJcbltOQVJSQVRPTiBwb29sPW1haW5dXHJcblxyXG4jIEVyYS1zcGVjaWZpYyBwb29sXHJcbltOQVJSQVRPTiBwb29sPWVyYTJfZXh0cmFjdGlvbl1gLFxyXG4gICAgaW1wbGVtZW50ZWQ6IHRydWUsXHJcbiAgfSxcclxuXHJcbiAgLy8gPT09PT09PT09PT09IFNQRUNJQUwgPT09PT09PT09PT09XHJcbiAge1xyXG4gICAgdHlwZTogJ0NPTU1FTlQnLFxyXG4gICAgY2F0ZWdvcnk6ICdmbG93JyxcclxuICAgIHN5bnRheDogJyMgY29tbWVudCB0ZXh0ICBPUiAgLy8gY29tbWVudCB0ZXh0JyxcclxuICAgIGRlc2NyaXB0aW9uOiAnQSBjb21tZW50IGxpbmUgdGhhdCBpcyBpZ25vcmVkIGR1cmluZyBleGVjdXRpb24uIFVzZWZ1bCBmb3Igbm90ZXMgYW5kIGRvY3VtZW50YXRpb24uJyxcclxuICAgIHBhcmFtZXRlcnM6IFtcclxuICAgICAgeyBuYW1lOiAndGV4dCcsIHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0FueSBjb21tZW50IHRleHQnIH0sXHJcbiAgICBdLFxyXG4gICAgZXhhbXBsZTogYCMgVGhpcyBpcyBhIGNvbW1lbnRcclxuLy8gVGhpcyBpcyBhbHNvIGEgY29tbWVudGAsXHJcbiAgICBpbXBsZW1lbnRlZDogdHJ1ZSxcclxuICB9LFxyXG4gIHtcclxuICAgIHR5cGU6ICdVTktOT1dOJyxcclxuICAgIGNhdGVnb3J5OiAnZmxvdycsXHJcbiAgICBzeW50YXg6ICcoYW55IHVucmVjb2duaXplZCB0ZXh0KScsXHJcbiAgICBkZXNjcmlwdGlvbjogJ1JlcHJlc2VudHMgYW55IGxpbmUgdGhhdCBjb3VsZCBub3QgYmUgcGFyc2VkLiBTa2lwcGVkIGR1cmluZyBleGVjdXRpb24uJyxcclxuICAgIHBhcmFtZXRlcnM6IFtdLFxyXG4gICAgZXhhbXBsZTogJ3NvbWUgdW5yZWNvZ25pemVkIGNvbW1hbmQnLFxyXG4gICAgaW1wbGVtZW50ZWQ6IHRydWUsXHJcbiAgfSxcclxuXTtcclxuXHJcbi8vIENhdGVnb3J5IG1ldGFkYXRhIGZvciBkb2N1bWVudGF0aW9uXHJcbmV4cG9ydCBjb25zdCBDQVRFR09SWV9JTkZPOiBSZWNvcmQ8Q29tbWFuZERvY1snY2F0ZWdvcnknXSwgeyB0aXRsZTogc3RyaW5nOyBkZXNjcmlwdGlvbjogc3RyaW5nIH0+ID0ge1xyXG4gIHNjZW5lOiB7XHJcbiAgICB0aXRsZTogJ1NjZW5lIENvbW1hbmRzJyxcclxuICAgIGRlc2NyaXB0aW9uOiAnQ29tbWFuZHMgZm9yIHRyYW5zaXRpb25pbmcgYmV0d2VlbiBzY2VuZXMgYW5kIG1hbmFnaW5nIGJhY2tncm91bmRzLicsXHJcbiAgfSxcclxuICBhY3Rvcjoge1xyXG4gICAgdGl0bGU6ICdBY3RvciBDb21tYW5kcycsXHJcbiAgICBkZXNjcmlwdGlvbjogJ0NvbW1hbmRzIGZvciBjb250cm9sbGluZyBhY3RvciB2aXNpYmlsaXR5LCBwb3NpdGlvbiwgYW5kIGFwcGVhcmFuY2Ugb24gc3RhZ2UuJyxcclxuICB9LFxyXG4gIGRpYWxvZ3VlOiB7XHJcbiAgICB0aXRsZTogJ0RpYWxvZ3VlIENvbW1hbmRzJyxcclxuICAgIGRlc2NyaXB0aW9uOiAnQ29tbWFuZHMgZm9yIGRpc3BsYXlpbmcgY2hhcmFjdGVyIGRpYWxvZ3VlIGFuZCBuYXJyYXRpb24uJyxcclxuICB9LFxyXG4gIGF1ZGlvOiB7XHJcbiAgICB0aXRsZTogJ0F1ZGlvIENvbW1hbmRzJyxcclxuICAgIGRlc2NyaXB0aW9uOiAnQ29tbWFuZHMgZm9yIHBsYXlpbmcgbXVzaWMsIGFtYmllbnQgc291bmRzLCBhbmQgc291bmQgZWZmZWN0cy4nLFxyXG4gIH0sXHJcbiAgYnV0dG9uOiB7XHJcbiAgICB0aXRsZTogJ0J1dHRvbiBDb21tYW5kcycsXHJcbiAgICBkZXNjcmlwdGlvbjogJ0NvbW1hbmRzIGZvciBzaG93aW5nIGFuZCBoaWRpbmcgaW50ZXJhY3RpdmUgYnV0dG9ucy4nLFxyXG4gIH0sXHJcbiAgY2hvaWNlOiB7XHJcbiAgICB0aXRsZTogJ0Nob2ljZSBDb21tYW5kcycsXHJcbiAgICBkZXNjcmlwdGlvbjogJ0NvbW1hbmRzIGZvciBwcmVzZW50aW5nIGJyYW5jaGluZyBuYXJyYXRpdmUgY2hvaWNlcyB0byB0aGUgcGxheWVyLicsXHJcbiAgfSxcclxuICBmbG93OiB7XHJcbiAgICB0aXRsZTogJ0Zsb3cgQ29udHJvbCcsXHJcbiAgICBkZXNjcmlwdGlvbjogJ0NvbW1hbmRzIGZvciBjb250cm9sbGluZyBzY3JpcHQgZXhlY3V0aW9uLCB2YXJpYWJsZXMsIGFuZCBjb25kaXRpb25hbHMuJyxcclxuICB9LFxyXG4gIGVmZmVjdDoge1xyXG4gICAgdGl0bGU6ICdFZmZlY3QgQ29tbWFuZHMnLFxyXG4gICAgZGVzY3JpcHRpb246ICdDb21tYW5kcyBmb3IgYXBwbHlpbmcgYW5kIHJlbW92aW5nIHZpc3VhbCBlZmZlY3RzIG9uIGFjdG9ycyBhbmQgZWxlbWVudHMuJyxcclxuICB9LFxyXG4gIGluc3RydW1lbnQ6IHtcclxuICAgIHRpdGxlOiAnSW5zdHJ1bWVudCBDb21tYW5kcycsXHJcbiAgICBkZXNjcmlwdGlvbjogJ0ludGVyYWN0aXZlIHNsaWRlcnMgYW5kIHJlYWQtb25seSBnYXVnZXMgd2lyZWQgdG8gd29ybGQgc3RhdGUgdmFyaWFibGVzIFx1MjAxNCB0aGUgaW5zdHJ1bWVudCBwYW5lbC4nLFxyXG4gIH0sXHJcbn07XHJcblxyXG4vLyA9PT09PT09PT09PT0gRURJVE9SIEFVVE9DT01QTEVURSBQQUxFVFRFID09PT09PT09PT09PVxyXG4vLyBUaGUgc2NyaXB0IGVkaXRvcidzIGNvbW1hbmQgcGFsZXR0ZSwga2VwdCBoZXJlIChuZXh0IHRvIHRoZSBkb2NzKSBhc1xyXG4vLyB0aGUgc2luZ2xlIHNvdXJjZSBvZiB0cnV0aC4gT3JkZXIgPSBkaXNwbGF5IG9yZGVyIGluIHRoZSBlZGl0b3IuXHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmRBdXRvY29tcGxldGVFbnRyeSB7XHJcbiAgdHlwZTogU2NyaXB0Q29tbWFuZFR5cGU7XHJcbiAgbGFiZWw6IHN0cmluZztcclxuICBpbnNlcnRUZXh0OiBzdHJpbmc7XHJcbiAgZGVzY3JpcHRpb246IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IENPTU1BTkRfQVVUT0NPTVBMRVRFOiBDb21tYW5kQXV0b2NvbXBsZXRlRW50cnlbXSA9IFtcclxuICB7IHR5cGU6ICdFTlRFUicsIGxhYmVsOiAnRU5URVInLCBpbnNlcnRUZXh0OiAnRU5URVIgJywgZGVzY3JpcHRpb246ICdNYWtlIGFjdG9yIGFwcGVhcicgfSxcclxuICB7IHR5cGU6ICdFWElUJywgbGFiZWw6ICdFWElUJywgaW5zZXJ0VGV4dDogJ0VYSVQgJywgZGVzY3JpcHRpb246ICdSZW1vdmUgYWN0b3InIH0sXHJcbiAgeyB0eXBlOiAnTU9WRScsIGxhYmVsOiAnTU9WRScsIGluc2VydFRleHQ6ICdNT1ZFICcsIGRlc2NyaXB0aW9uOiAnQW5pbWF0ZSBhY3RvciBtb3ZlbWVudCcgfSxcclxuICB7IHR5cGU6ICdQT1NFJywgbGFiZWw6ICdQT1NFJywgaW5zZXJ0VGV4dDogJ1BPU0UgJywgZGVzY3JpcHRpb246ICdDaGFuZ2UgcG9zZS9leHByZXNzaW9uJyB9LFxyXG4gIHsgdHlwZTogJ0JHTScsIGxhYmVsOiAnQkdNOicsIGluc2VydFRleHQ6ICdCR006IFwiXCInLCBkZXNjcmlwdGlvbjogJ1BsYXkgYmFja2dyb3VuZCBtdXNpYycgfSxcclxuICB7IHR5cGU6ICdBTUJJRU5DRScsIGxhYmVsOiAnQU1CSUVOQ0U6JywgaW5zZXJ0VGV4dDogJ0FNQklFTkNFOiBcIlwiJywgZGVzY3JpcHRpb246ICdQbGF5IGFtYmllbnQgc291bmQnIH0sXHJcbiAgeyB0eXBlOiAnU0ZYJywgbGFiZWw6ICdTRlg6JywgaW5zZXJ0VGV4dDogJ1NGWDogXCJcIicsIGRlc2NyaXB0aW9uOiAnUGxheSBzb3VuZCBlZmZlY3QnIH0sXHJcbiAgeyB0eXBlOiAnRUZGRUNUJywgbGFiZWw6ICdFRkZFQ1QnLCBpbnNlcnRUZXh0OiAnRUZGRUNUICcsIGRlc2NyaXB0aW9uOiAnQXBwbHkgdmlzdWFsIGVmZmVjdCcgfSxcclxuICB7IHR5cGU6ICdDTEVBUl9FRkZFQ1QnLCBsYWJlbDogJ0NMRUFSX0VGRkVDVCcsIGluc2VydFRleHQ6ICdDTEVBUl9FRkZFQ1QgJywgZGVzY3JpcHRpb246ICdSZW1vdmUgZWZmZWN0JyB9LFxyXG4gIHsgdHlwZTogJ1dBSVQnLCBsYWJlbDogJ1dBSVQnLCBpbnNlcnRUZXh0OiAnV0FJVCAxc10nLCBkZXNjcmlwdGlvbjogJ1BhdXNlIGV4ZWN1dGlvbicgfSxcclxuICB7IHR5cGU6ICdTQ0VORScsIGxhYmVsOiAnU0NFTkUnLCBpbnNlcnRUZXh0OiAnU0NFTkUgJywgZGVzY3JpcHRpb246ICdHbyB0byBzY2VuZScgfSxcclxuICB7IHR5cGU6ICdCVVRUT04nLCBsYWJlbDogJ0JVVFRPTicsIGluc2VydFRleHQ6ICdCVVRUT04gJywgZGVzY3JpcHRpb246ICdTaG93IGJ1dHRvbicgfSxcclxuICB7IHR5cGU6ICdISURFX0JVVFRPTicsIGxhYmVsOiAnSElERV9CVVRUT04nLCBpbnNlcnRUZXh0OiAnSElERV9CVVRUT04gJywgZGVzY3JpcHRpb246ICdIaWRlIGJ1dHRvbicgfSxcclxuICB7IHR5cGU6ICdTRVQnLCBsYWJlbDogJ1NFVCcsIGluc2VydFRleHQ6ICdTRVQgJywgZGVzY3JpcHRpb246ICdTZXQgdmFyaWFibGUgKGxpdGVyYWwgb3IgZXhwcmVzc2lvbiknIH0sXHJcbiAgeyB0eXBlOiAnSUYnLCBsYWJlbDogJ0lGJywgaW5zZXJ0VGV4dDogJ0lGICcsIGRlc2NyaXB0aW9uOiAnQ29uZGl0aW9uYWwgYmxvY2snIH0sXHJcbiAgeyB0eXBlOiAnVElDSycsIGxhYmVsOiAnVElDSycsIGluc2VydFRleHQ6ICdUSUNLIDFzXVxcblxcblsvVElDSycsIGRlc2NyaXB0aW9uOiAnUmVwZWF0aW5nIHNpbXVsYXRpb24gYmxvY2snIH0sXHJcbiAgeyB0eXBlOiAnQklORCcsIGxhYmVsOiAnQklORCcsIGluc2VydFRleHQ6ICdCSU5EICcsIGRlc2NyaXB0aW9uOiAnRHJpdmUgZWxlbWVudCBwcm9wZXJ0eSBmcm9tIGV4cHJlc3Npb24nIH0sXHJcbiAgeyB0eXBlOiAnVU5CSU5EJywgbGFiZWw6ICdVTkJJTkQnLCBpbnNlcnRUZXh0OiAnVU5CSU5EICcsIGRlc2NyaXB0aW9uOiAnUmVsZWFzZSBhIGJvdW5kIHByb3BlcnR5JyB9LFxyXG4gIHsgdHlwZTogJ1NMSURFUicsIGxhYmVsOiAnU0xJREVSJywgaW5zZXJ0VGV4dDogJ1NMSURFUiAnLCBkZXNjcmlwdGlvbjogJ0ludGVyYWN0aXZlIHZhcmlhYmxlIHNsaWRlcicgfSxcclxuICB7IHR5cGU6ICdHQVVHRScsIGxhYmVsOiAnR0FVR0UnLCBpbnNlcnRUZXh0OiAnR0FVR0UgJywgZGVzY3JpcHRpb246ICdSZWFkLW9ubHkgdmFyaWFibGUgZGlhbCcgfSxcclxuICB7IHR5cGU6ICdISURFX1NMSURFUicsIGxhYmVsOiAnSElERV9TTElERVInLCBpbnNlcnRUZXh0OiAnSElERV9TTElERVIgJywgZGVzY3JpcHRpb246ICdIaWRlIGEgc2xpZGVyJyB9LFxyXG4gIHsgdHlwZTogJ0hJREVfR0FVR0UnLCBsYWJlbDogJ0hJREVfR0FVR0UnLCBpbnNlcnRUZXh0OiAnSElERV9HQVVHRSAnLCBkZXNjcmlwdGlvbjogJ0hpZGUgYSBnYXVnZScgfSxcclxuICB7IHR5cGU6ICdOQVJSQVRPTicsIGxhYmVsOiAnTkFSUkFUT04nLCBpbnNlcnRUZXh0OiAnTkFSUkFUT04gcG9vbD1tYWluXScsIGRlc2NyaXB0aW9uOiAnTGV0IHRoZSBzdG9yeXRlbGxlciBwaWNrIHRoZSBuZXh0IHNjZW5lJyB9LFxyXG4gIHsgdHlwZTogJ0NIT0lDRScsIGxhYmVsOiAnQ0hPSUNFJywgaW5zZXJ0VGV4dDogJ0NIT0lDRV1cXG4tIFwiT3B0aW9uXCIgLT4gc2NlbmVcXG5bL0NIT0lDRScsIGRlc2NyaXB0aW9uOiAnUHJlc2VudCBjaG9pY2VzJyB9LFxyXG5dO1xyXG5cclxuLy8gVmFsaWRhdGlvbiBoZWxwZXI6IGNoZWNrIGlmIGFsbCBjb21tYW5kIHR5cGVzIGFyZSBkb2N1bWVudGVkXHJcbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZURvY3VtZW50YXRpb24oKTogeyBtaXNzaW5nOiBzdHJpbmdbXTsgZG9jdW1lbnRlZDogc3RyaW5nW10gfSB7XHJcbiAgY29uc3QgYWxsVHlwZXM6IFNjcmlwdENvbW1hbmRUeXBlW10gPSBbXHJcbiAgICAnRElBTE9HVUUnLCAnRU5URVInLCAnRVhJVCcsICdNT1ZFJywgJ1BPU0UnLFxyXG4gICAgJ0JHTScsICdBTUJJRU5DRScsICdTRlgnLCAnRUZGRUNUJywgJ0NMRUFSX0VGRkVDVCcsXHJcbiAgICAnV0FJVCcsICdTQ0VORScsICdDSE9JQ0UnLCAnU0VUJywgJ0lGJywgJ0VORElGJywgJ1RJQ0snLFxyXG4gICAgJ0JJTkQnLCAnVU5CSU5EJyxcclxuICAgICdTTElERVInLCAnR0FVR0UnLCAnSElERV9TTElERVInLCAnSElERV9HQVVHRScsXHJcbiAgICAnTkFSUkFUT04nLFxyXG4gICAgJ0JVVFRPTicsICdISURFX0JVVFRPTicsICdDT01NRU5UJywgJ1VOS05PV04nXHJcbiAgXTtcclxuICBcclxuICBjb25zdCBkb2N1bWVudGVkVHlwZXMgPSBuZXcgU2V0KENPTU1BTkRfRE9DUy5tYXAoZG9jID0+IGRvYy50eXBlKSk7XHJcbiAgY29uc3QgbWlzc2luZyA9IGFsbFR5cGVzLmZpbHRlcih0eXBlID0+ICFkb2N1bWVudGVkVHlwZXMuaGFzKHR5cGUpKTtcclxuICBjb25zdCBkb2N1bWVudGVkID0gYWxsVHlwZXMuZmlsdGVyKHR5cGUgPT4gZG9jdW1lbnRlZFR5cGVzLmhhcyh0eXBlKSk7XHJcbiAgXHJcbiAgcmV0dXJuIHsgbWlzc2luZywgZG9jdW1lbnRlZCB9O1xyXG59XHJcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcZG91Z3NcXFxcRHJvcGJveFxcXFxfX19fMjAyNSBQcm9qZWN0c1xcXFxfVVNBIFZTIE1BR0FcXFxcQXBwIFNvdXJjZVxcXFxEcmFtYXRvbiAyLjAgR2l0XFxcXGRyYW1hdG9uLXN0dWRpby02MlxcXFxzcmNcXFxcdXRpbHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGRvdWdzXFxcXERyb3Bib3hcXFxcX19fXzIwMjUgUHJvamVjdHNcXFxcX1VTQSBWUyBNQUdBXFxcXEFwcCBTb3VyY2VcXFxcRHJhbWF0b24gMi4wIEdpdFxcXFxkcmFtYXRvbi1zdHVkaW8tNjJcXFxcc3JjXFxcXHV0aWxzXFxcXGdlbmVyYXRlRHJhbURvY3MudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2RvdWdzL0Ryb3Bib3gvX19fXzIwMjUlMjBQcm9qZWN0cy9fVVNBJTIwVlMlMjBNQUdBL0FwcCUyMFNvdXJjZS9EcmFtYXRvbiUyMDIuMCUyMEdpdC9kcmFtYXRvbi1zdHVkaW8tNjIvc3JjL3V0aWxzL2dlbmVyYXRlRHJhbURvY3MudHNcIjsvLyBEUkFNIFNjcmlwdCBEb2N1bWVudGF0aW9uIEdlbmVyYXRvclxyXG4vLyBUaGlzIHNjcmlwdCBnZW5lcmF0ZXMgZG9jcy9EUkFNX1NDUklQVC5tZCBmcm9tIHRoZSBjb21tYW5kIHJlZ2lzdHJ5XHJcbi8vIFJ1biB3aXRoOiBucG0gcnVuIGRvY3M6ZHJhbVxyXG5cclxuaW1wb3J0IHsgQ09NTUFORF9ET0NTLCBDQVRFR09SWV9JTkZPLCB2YWxpZGF0ZURvY3VtZW50YXRpb24sIENvbW1hbmREb2MgfSBmcm9tICcuL3NjcmlwdERvY3MnO1xyXG5cclxuY29uc3QgQ0FURUdPUllfT1JERVI6IENvbW1hbmREb2NbJ2NhdGVnb3J5J11bXSA9IFtcclxuICAnc2NlbmUnLFxyXG4gICdhY3RvcicsXHJcbiAgJ2RpYWxvZ3VlJyxcclxuICAnYXVkaW8nLFxyXG4gICdlZmZlY3QnLFxyXG4gICdidXR0b24nLFxyXG4gICdpbnN0cnVtZW50JyxcclxuICAnY2hvaWNlJyxcclxuICAnZmxvdycsXHJcbl07XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZU1hcmtkb3duKCk6IHN0cmluZyB7XHJcbiAgY29uc3QgbGluZXM6IHN0cmluZ1tdID0gW107XHJcblxyXG4gIC8vIEhlYWRlciAobm8gZGF0ZSBzdGFtcDogb3V0cHV0IG11c3QgYmUgc3RhYmxlIHNvIHJlZ2VucyBkaWZmIGNsZWFuKVxyXG4gIGxpbmVzLnB1c2goJyMgRFJBTSBTY3JpcHQgTGFuZ3VhZ2UgUmVmZXJlbmNlJyk7XHJcbiAgbGluZXMucHVzaCgnJyk7XHJcbiAgbGluZXMucHVzaCgnKipWZXJzaW9uOioqIDEuMCcpO1xyXG4gIGxpbmVzLnB1c2goJycpO1xyXG4gIGxpbmVzLnB1c2goJ0RSQU0gU2NyaXB0IGlzIHRoZSBzY3JpcHRpbmcgbGFuZ3VhZ2UgdXNlZCBieSBEcmFtYXRvbiB0byBjb250cm9sIG5hcnJhdGl2ZSBmbG93LCBzY2VuZSB0cmFuc2l0aW9ucywgY2hhcmFjdGVyIGRpYWxvZ3VlLCBhbmQgaW50ZXJhY3RpdmUgZWxlbWVudHMgaW4gdmlzdWFsIG5vdmVsLXN0eWxlIGdhbWVzLicpO1xyXG4gIGxpbmVzLnB1c2goJycpO1xyXG4gIGxpbmVzLnB1c2goJz4gKipOb3RlOioqIFRoaXMgZG9jdW1lbnQgaXMgYXV0by1nZW5lcmF0ZWQgZnJvbSBgc3JjL3V0aWxzL3NjcmlwdERvY3MudHNgLiBEbyBub3QgZWRpdCBkaXJlY3RseS4nKTtcclxuICBsaW5lcy5wdXNoKCcnKTtcclxuICBsaW5lcy5wdXNoKCctLS0nKTtcclxuICBsaW5lcy5wdXNoKCcnKTtcclxuICBcclxuICAvLyBUYWJsZSBvZiBDb250ZW50c1xyXG4gIGxpbmVzLnB1c2goJyMjIFRhYmxlIG9mIENvbnRlbnRzJyk7XHJcbiAgbGluZXMucHVzaCgnJyk7XHJcbiAgbGluZXMucHVzaCgnMS4gW092ZXJ2aWV3XSgjb3ZlcnZpZXcpJyk7XHJcbiAgbGluZXMucHVzaCgnMi4gW0Jhc2ljIFN5bnRheF0oI2Jhc2ljLXN5bnRheCknKTtcclxuICBsaW5lcy5wdXNoKCczLiBbQ29tbWFuZHNdKCNjb21tYW5kcyknKTtcclxuICBcclxuICBmb3IgKGNvbnN0IGNhdGVnb3J5IG9mIENBVEVHT1JZX09SREVSKSB7XHJcbiAgICBjb25zdCBpbmZvID0gQ0FURUdPUllfSU5GT1tjYXRlZ29yeV07XHJcbiAgICBjb25zdCBhbmNob3IgPSBpbmZvLnRpdGxlLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvXFxzKy9nLCAnLScpO1xyXG4gICAgbGluZXMucHVzaChgICAgLSBbJHtpbmZvLnRpdGxlfV0oIyR7YW5jaG9yfSlgKTtcclxuICB9XHJcbiAgXHJcbiAgbGluZXMucHVzaCgnNC4gW0V4YW1wbGVzXSgjZXhhbXBsZXMpJyk7XHJcbiAgbGluZXMucHVzaCgnNS4gW0Jlc3QgUHJhY3RpY2VzXSgjYmVzdC1wcmFjdGljZXMpJyk7XHJcbiAgbGluZXMucHVzaCgnJyk7XHJcbiAgbGluZXMucHVzaCgnLS0tJyk7XHJcbiAgbGluZXMucHVzaCgnJyk7XHJcbiAgXHJcbiAgLy8gT3ZlcnZpZXdcclxuICBsaW5lcy5wdXNoKCcjIyBPdmVydmlldycpO1xyXG4gIGxpbmVzLnB1c2goJycpO1xyXG4gIGxpbmVzLnB1c2goJ0RSQU0gU2NyaXB0IGZpbGVzIGFyZSBwbGFpbiB0ZXh0IHNjcmlwdHMgdGhhdCBkZWZpbmUgdGhlIHNlcXVlbmNlIG9mIGV2ZW50cyBpbiBhIERyYW1hdG9uIGdhbWUuIEVhY2ggbGluZSByZXByZXNlbnRzIGEgc2luZ2xlIGNvbW1hbmQgdGhhdCB0aGUgZW5naW5lIGV4ZWN1dGVzIGluIG9yZGVyIGR1cmluZyBwbGF5YmFjay4nKTtcclxuICBsaW5lcy5wdXNoKCcnKTtcclxuICBsaW5lcy5wdXNoKCdTY3JpcHRzIGFyZSBhdHRhY2hlZCB0byAqKlNjZW5lcyoqIGFuZCBleGVjdXRlZCB3aGVuIHRoYXQgc2NlbmUgaXMgYWN0aXZlLiBUaGUgc2NyaXB0IHJ1bm5lciBwcm9jZXNzZXMgY29tbWFuZHMgc2VxdWVudGlhbGx5LCB3aXRoIHNvbWUgY29tbWFuZHMgKGxpa2UgQ0hPSUNFKSBwYXVzaW5nIGZvciB1c2VyIGlucHV0LicpO1xyXG4gIGxpbmVzLnB1c2goJycpO1xyXG4gIGxpbmVzLnB1c2goJy0tLScpO1xyXG4gIGxpbmVzLnB1c2goJycpO1xyXG4gIFxyXG4gIC8vIEJhc2ljIFN5bnRheFxyXG4gIGxpbmVzLnB1c2goJyMjIEJhc2ljIFN5bnRheCcpO1xyXG4gIGxpbmVzLnB1c2goJycpO1xyXG4gIGxpbmVzLnB1c2goJy0gT25lIGNvbW1hbmQgcGVyIGxpbmUnKTtcclxuICBsaW5lcy5wdXNoKCctIEJyYWNrZXRlZCBjb21tYW5kcyB1c2UgYFtDT01NQU5EIC4uLl1gIGZvcm1hdCcpO1xyXG4gIGxpbmVzLnB1c2goJy0gRGlhbG9ndWUgdXNlcyBgQUNUT1JfTkFNRTogXCJ0ZXh0XCJgIGZvcm1hdCcpO1xyXG4gIGxpbmVzLnB1c2goJy0gQ29tbWVudHMgc3RhcnQgd2l0aCBgI2Agb3IgYC8vYCcpO1xyXG4gIGxpbmVzLnB1c2goJy0gQmxhbmsgbGluZXMgYXJlIGlnbm9yZWQnKTtcclxuICBsaW5lcy5wdXNoKCctIEFyZ3VtZW50cyBjYW4gaW5jbHVkZSBzdHJpbmdzIChpbiBxdW90ZXMpLCBudW1iZXJzLCBhbmQgZmxhZ3MnKTtcclxuICBsaW5lcy5wdXNoKCcnKTtcclxuICBsaW5lcy5wdXNoKCdgYGAnKTtcclxuICBsaW5lcy5wdXNoKCdbQ09NTUFORCBhcmd1bWVudDEgYXJndW1lbnQyXScpO1xyXG4gIGxpbmVzLnB1c2goJ0FDVE9SX05BTUU6IFwiZGlhbG9ndWUgdGV4dFwiJyk7XHJcbiAgbGluZXMucHVzaCgnIyBUaGlzIGlzIGEgY29tbWVudCcpO1xyXG4gIGxpbmVzLnB1c2goJ2BgYCcpO1xyXG4gIGxpbmVzLnB1c2goJycpO1xyXG4gIGxpbmVzLnB1c2goJy0tLScpO1xyXG4gIGxpbmVzLnB1c2goJycpO1xyXG4gIFxyXG4gIC8vIENvbW1hbmRzIGJ5IENhdGVnb3J5XHJcbiAgbGluZXMucHVzaCgnIyMgQ29tbWFuZHMnKTtcclxuICBsaW5lcy5wdXNoKCcnKTtcclxuICBcclxuICBmb3IgKGNvbnN0IGNhdGVnb3J5IG9mIENBVEVHT1JZX09SREVSKSB7XHJcbiAgICBjb25zdCBjYXRlZ29yeURvY3MgPSBDT01NQU5EX0RPQ1MuZmlsdGVyKGRvYyA9PiBkb2MuY2F0ZWdvcnkgPT09IGNhdGVnb3J5KTtcclxuICAgIGlmIChjYXRlZ29yeURvY3MubGVuZ3RoID09PSAwKSBjb250aW51ZTtcclxuICAgIFxyXG4gICAgY29uc3QgaW5mbyA9IENBVEVHT1JZX0lORk9bY2F0ZWdvcnldO1xyXG4gICAgbGluZXMucHVzaChgIyMjICR7aW5mby50aXRsZX1gKTtcclxuICAgIGxpbmVzLnB1c2goJycpO1xyXG4gICAgbGluZXMucHVzaChpbmZvLmRlc2NyaXB0aW9uKTtcclxuICAgIGxpbmVzLnB1c2goJycpO1xyXG4gICAgXHJcbiAgICBmb3IgKGNvbnN0IGRvYyBvZiBjYXRlZ29yeURvY3MpIHtcclxuICAgICAgLy8gU2tpcCBpbnRlcm5hbCBjb21tYW5kcyBsaWtlIFVOS05PV05cclxuICAgICAgaWYgKGRvYy50eXBlID09PSAnVU5LTk9XTicpIGNvbnRpbnVlO1xyXG4gICAgICBcclxuICAgICAgbGluZXMucHVzaChgIyMjIyBcXGAke2RvYy50eXBlfVxcYGApO1xyXG4gICAgICBsaW5lcy5wdXNoKCcnKTtcclxuICAgICAgbGluZXMucHVzaChkb2MuZGVzY3JpcHRpb24pO1xyXG4gICAgICBsaW5lcy5wdXNoKCcnKTtcclxuICAgICAgbGluZXMucHVzaCgnKipTeW50YXg6KionKTtcclxuICAgICAgbGluZXMucHVzaCgnYGBgJyk7XHJcbiAgICAgIGxpbmVzLnB1c2goZG9jLnN5bnRheCk7XHJcbiAgICAgIGxpbmVzLnB1c2goJ2BgYCcpO1xyXG4gICAgICBsaW5lcy5wdXNoKCcnKTtcclxuICAgICAgXHJcbiAgICAgIGlmIChkb2MucGFyYW1ldGVycyAmJiBkb2MucGFyYW1ldGVycy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgbGluZXMucHVzaCgnKipQYXJhbWV0ZXJzOioqJyk7XHJcbiAgICAgICAgbGluZXMucHVzaCgnfCBOYW1lIHwgVHlwZSB8IERlc2NyaXB0aW9uIHwnKTtcclxuICAgICAgICBsaW5lcy5wdXNoKCd8LS0tLS0tfC0tLS0tLXwtLS0tLS0tLS0tLS0tfCcpO1xyXG4gICAgICAgIGZvciAoY29uc3QgcGFyYW0gb2YgZG9jLnBhcmFtZXRlcnMpIHtcclxuICAgICAgICAgIGNvbnN0IG9wdGlvbmFsID0gcGFyYW0ub3B0aW9uYWwgPyAnICoob3B0aW9uYWwpKicgOiAnJztcclxuICAgICAgICAgIGxpbmVzLnB1c2goYHwgXFxgJHtwYXJhbS5uYW1lfVxcYCB8ICR7cGFyYW0udHlwZX0gfCAke3BhcmFtLmRlc2NyaXB0aW9ufSR7b3B0aW9uYWx9IHxgKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgbGluZXMucHVzaCgnJyk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIGxpbmVzLnB1c2goJyoqRXhhbXBsZToqKicpO1xyXG4gICAgICBsaW5lcy5wdXNoKCdgYGAnKTtcclxuICAgICAgbGluZXMucHVzaChkb2MuZXhhbXBsZSk7XHJcbiAgICAgIGxpbmVzLnB1c2goJ2BgYCcpO1xyXG4gICAgICBsaW5lcy5wdXNoKCcnKTtcclxuICAgICAgXHJcbiAgICAgIGlmICghZG9jLmltcGxlbWVudGVkKSB7XHJcbiAgICAgICAgbGluZXMucHVzaCgnPiBcdTI2QTBcdUZFMEYgKipQbGFubmVkIEZlYXR1cmUqKiAtIE5vdCB5ZXQgaW1wbGVtZW50ZWQnKTtcclxuICAgICAgICBsaW5lcy5wdXNoKCcnKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICBsaW5lcy5wdXNoKCctLS0nKTtcclxuICAgIGxpbmVzLnB1c2goJycpO1xyXG4gIH1cclxuICBcclxuICAvLyBFeGFtcGxlcyBTZWN0aW9uXHJcbiAgbGluZXMucHVzaCgnIyMgRXhhbXBsZXMnKTtcclxuICBsaW5lcy5wdXNoKCcnKTtcclxuICBcclxuICBsaW5lcy5wdXNoKCcjIyMgU2ltcGxlIERpYWxvZ3VlIFNjZW5lJyk7XHJcbiAgbGluZXMucHVzaCgnJyk7XHJcbiAgbGluZXMucHVzaCgnYGBgJyk7XHJcbiAgbGluZXMucHVzaCgnW0VOVEVSIGRldGVjdGl2ZSBhdCA1MCw1MF0nKTtcclxuICBsaW5lcy5wdXNoKCdEZXRlY3RpdmU6IFwiQW5vdGhlciBsYXRlIG5pZ2h0IGF0IHRoZSBwcmVjaW5jdC5cIicpO1xyXG4gIGxpbmVzLnB1c2goJ1tXQUlUIDFzXScpO1xyXG4gIGxpbmVzLnB1c2goJ0RldGVjdGl2ZTogXCJUaGUgY2FzZSBmaWxlcyBhcmVuXFwndCBnb2luZyB0byBzb2x2ZSB0aGVtc2VsdmVzLlwiJyk7XHJcbiAgbGluZXMucHVzaCgnW1NGWDogXCJwaG9uZV9yaW5nXCJdJyk7XHJcbiAgbGluZXMucHVzaCgnRGV0ZWN0aXZlOiBcIk5vdyB3aGF0P1wiJyk7XHJcbiAgbGluZXMucHVzaCgnYGBgJyk7XHJcbiAgbGluZXMucHVzaCgnJyk7XHJcbiAgXHJcbiAgbGluZXMucHVzaCgnIyMjIFNjZW5lIHdpdGggQ2hvaWNlcycpO1xyXG4gIGxpbmVzLnB1c2goJycpO1xyXG4gIGxpbmVzLnB1c2goJ2BgYCcpO1xyXG4gIGxpbmVzLnB1c2goJ1tFTlRFUiBndWlkZSBhdCA1MCw1MF0nKTtcclxuICBsaW5lcy5wdXNoKCdHdWlkZTogXCJXaGljaCBwYXRoIHdpbGwgeW91IHRha2U/XCInKTtcclxuICBsaW5lcy5wdXNoKCdbQ0hPSUNFXScpO1xyXG4gIGxpbmVzLnB1c2goJy0gXCJUaGUgbW91bnRhaW4gcGFzc1wiIC0+IG1vdW50YWluJyk7XHJcbiAgbGluZXMucHVzaCgnLSBcIlRoZSBmb3Jlc3QgdHJhaWxcIiAtPiBmb3Jlc3QnKTtcclxuICBsaW5lcy5wdXNoKCctIFwiUmV0dXJuIHRvIHRvd25cIiAtPiB0b3duJyk7XHJcbiAgbGluZXMucHVzaCgnWy9DSE9JQ0VdJyk7XHJcbiAgbGluZXMucHVzaCgnYGBgJyk7XHJcbiAgbGluZXMucHVzaCgnJyk7XHJcbiAgXHJcbiAgbGluZXMucHVzaCgnIyMjIEludGVyYWN0aXZlIFNjZW5lIHdpdGggQnV0dG9ucycpO1xyXG4gIGxpbmVzLnB1c2goJycpO1xyXG4gIGxpbmVzLnB1c2goJ2BgYCcpO1xyXG4gIGxpbmVzLnB1c2goJ1tCVVRUT04gZXhhbWluZV9kZXNrXScpO1xyXG4gIGxpbmVzLnB1c2goJ1tCVVRUT04gY2hlY2tfd2luZG93XScpO1xyXG4gIGxpbmVzLnB1c2goJ1tCVVRUT04gcmVhZF9sZXR0ZXJdJyk7XHJcbiAgbGluZXMucHVzaCgnTmFycmF0b3I6IFwiVGhlIG9mZmljZSBpcyBxdWlldC4gV2hhdCBjYXRjaGVzIHlvdXIgYXR0ZW50aW9uP1wiJyk7XHJcbiAgbGluZXMucHVzaCgnYGBgJyk7XHJcbiAgbGluZXMucHVzaCgnJyk7XHJcbiAgXHJcbiAgbGluZXMucHVzaCgnIyMjIENvbmRpdGlvbmFsIExvZ2ljJyk7XHJcbiAgbGluZXMucHVzaCgnJyk7XHJcbiAgbGluZXMucHVzaCgnYGBgJyk7XHJcbiAgbGluZXMucHVzaCgnW0lGIGhhc0tleSA9PSB0cnVlXScpO1xyXG4gIGxpbmVzLnB1c2goJ1BsYXllcjogXCJJIGNhbiB1c2UgdGhpcyBrZXkgb24gdGhlIGxvY2tlZCBkb29yLlwiJyk7XHJcbiAgbGluZXMucHVzaCgnW1NDRU5FIGxvY2tlZF9yb29tXScpO1xyXG4gIGxpbmVzLnB1c2goJ1tFTkRJRl0nKTtcclxuICBsaW5lcy5wdXNoKCcnKTtcclxuICBsaW5lcy5wdXNoKCdbSUYgdmlzaXRDb3VudCA+IDFdJyk7XHJcbiAgbGluZXMucHVzaCgnU2hvcGtlZXBlcjogXCJCYWNrIGFnYWluPyBJIHJlbWVtYmVyIHlvdS5cIicpO1xyXG4gIGxpbmVzLnB1c2goJ1tFTkRJRl0nKTtcclxuICBsaW5lcy5wdXNoKCdgYGAnKTtcclxuICBsaW5lcy5wdXNoKCcnKTtcclxuICBcclxuICBsaW5lcy5wdXNoKCctLS0nKTtcclxuICBsaW5lcy5wdXNoKCcnKTtcclxuICBcclxuICAvLyBCZXN0IFByYWN0aWNlc1xyXG4gIGxpbmVzLnB1c2goJyMjIEJlc3QgUHJhY3RpY2VzJyk7XHJcbiAgbGluZXMucHVzaCgnJyk7XHJcbiAgbGluZXMucHVzaCgnMS4gKipVc2UgZGVzY3JpcHRpdmUgSURzKio6IGBmb3Jlc3RfbmlnaHRgIGlzIGJldHRlciB0aGFuIGBzY2VuZV83YCcpO1xyXG4gIGxpbmVzLnB1c2goJzIuICoqS2VlcCBkaWFsb2d1ZSBjb25jaXNlKio6IEJyZWFrIGxvbmcgc3BlZWNoZXMgaW50byBtdWx0aXBsZSBsaW5lcycpO1xyXG4gIGxpbmVzLnB1c2goJzMuICoqVGVzdCBmcmVxdWVudGx5Kio6IFVzZSBUaGVhdGVyIG1vZGUgdG8gcHJldmlldyB5b3VyIHNjcmlwdHMnKTtcclxuICBsaW5lcy5wdXNoKCc0LiAqKkNvbW1lbnQgeW91ciBsb2dpYyoqOiBBZGQgbm90ZXMgZm9yIGNvbXBsZXggYnJhbmNoaW5nIHdpdGggYCNgIGNvbW1lbnRzJyk7XHJcbiAgbGluZXMucHVzaCgnNS4gKipPcmdhbml6ZSBieSBhY3QqKjogR3JvdXAgcmVsYXRlZCBzY2VuZXMgdG9nZXRoZXInKTtcclxuICBsaW5lcy5wdXNoKCc2LiAqKlVzZSBjb25zaXN0ZW50IG5hbWluZyoqOiBTdGljayB0byBzbmFrZV9jYXNlIGZvciBJRHMnKTtcclxuICBsaW5lcy5wdXNoKCcnKTtcclxuICBsaW5lcy5wdXNoKCctLS0nKTtcclxuICBsaW5lcy5wdXNoKCcnKTtcclxuICBcclxuICAvLyBJbXBsZW1lbnRhdGlvbiBTdGF0dXNcclxuICBjb25zdCB7IG1pc3NpbmcsIGRvY3VtZW50ZWQgfSA9IHZhbGlkYXRlRG9jdW1lbnRhdGlvbigpO1xyXG4gIFxyXG4gIGxpbmVzLnB1c2goJyMjIEltcGxlbWVudGF0aW9uIFN0YXR1cycpO1xyXG4gIGxpbmVzLnB1c2goJycpO1xyXG4gIGxpbmVzLnB1c2goYFx1MjcwNSAqKiR7ZG9jdW1lbnRlZC5sZW5ndGh9IGNvbW1hbmRzIGRvY3VtZW50ZWQqKmApO1xyXG4gIFxyXG4gIGlmIChtaXNzaW5nLmxlbmd0aCA+IDApIHtcclxuICAgIGxpbmVzLnB1c2goYFx1MjZBMFx1RkUwRiAqKiR7bWlzc2luZy5sZW5ndGh9IGNvbW1hbmRzIG1pc3NpbmcgZG9jdW1lbnRhdGlvbioqOiAke21pc3Npbmcuam9pbignLCAnKX1gKTtcclxuICB9XHJcbiAgbGluZXMucHVzaCgnJyk7XHJcbiAgbGluZXMucHVzaCgnLS0tJyk7XHJcbiAgbGluZXMucHVzaCgnJyk7XHJcbiAgbGluZXMucHVzaCgnKlRoaXMgZG9jdW1lbnQgaXMgYXV0by1nZW5lcmF0ZWQgZnJvbSB0aGUgRHJhbWF0b24gc291cmNlIGNvZGUuKicpO1xyXG4gIFxyXG4gIHJldHVybiBsaW5lcy5qb2luKCdcXG4nKTtcclxufVxyXG5cclxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgY29udGV4dHNcclxuZXhwb3J0IHsgZ2VuZXJhdGVNYXJrZG93biB9O1xyXG5cclxuLy8gSWYgcnVubmluZyBhcyBhIHNjcmlwdCwgd3JpdGUgZG9jcy9EUkFNX1NDUklQVC5tZCBkaXJlY3RseS5cclxuLy8gVXNhZ2U6IG5wbSBydW4gZG9jczpkcmFtXHJcbmlmICh0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJvY2Vzcy5hcmd2WzFdPy5pbmNsdWRlcygnZ2VuZXJhdGVEcmFtRG9jcycpKSB7XHJcbiAgY29uc3QgeyB3cml0ZUZpbGVTeW5jIH0gPSBhd2FpdCBpbXBvcnQoJ25vZGU6ZnMnKTtcclxuICBjb25zdCB7IHJlc29sdmUgfSA9IGF3YWl0IGltcG9ydCgnbm9kZTpwYXRoJyk7XHJcbiAgY29uc3Qgb3V0UGF0aCA9IHJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ2RvY3MnLCAnRFJBTV9TQ1JJUFQubWQnKTtcclxuICB3cml0ZUZpbGVTeW5jKG91dFBhdGgsIGdlbmVyYXRlTWFya2Rvd24oKSArICdcXG4nLCAndXRmOCcpO1xyXG4gIGNvbnNvbGUubG9nKGBXcm90ZSAke291dFBhdGh9YCk7XHJcbn1cclxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxkb3Vnc1xcXFxEcm9wYm94XFxcXF9fX18yMDI1IFByb2plY3RzXFxcXF9VU0EgVlMgTUFHQVxcXFxBcHAgU291cmNlXFxcXERyYW1hdG9uIDIuMCBHaXRcXFxcZHJhbWF0b24tc3R1ZGlvLTYyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxkb3Vnc1xcXFxEcm9wYm94XFxcXF9fX18yMDI1IFByb2plY3RzXFxcXF9VU0EgVlMgTUFHQVxcXFxBcHAgU291cmNlXFxcXERyYW1hdG9uIDIuMCBHaXRcXFxcZHJhbWF0b24tc3R1ZGlvLTYyXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9kb3Vncy9Ecm9wYm94L19fX18yMDI1JTIwUHJvamVjdHMvX1VTQSUyMFZTJTIwTUFHQS9BcHAlMjBTb3VyY2UvRHJhbWF0b24lMjAyLjAlMjBHaXQvZHJhbWF0b24tc3R1ZGlvLTYyL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XHJcbmltcG9ydCB7IGRyYW1Eb2NzUGx1Z2luIH0gZnJvbSBcIi4vdml0ZS1wbHVnaW4tZHJhbS1kb2NzXCI7XHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xyXG4gIHNlcnZlcjoge1xyXG4gICAgaG9zdDogXCI6OlwiLFxyXG4gICAgcG9ydDogODA4MCxcclxuICAgIGhtcjoge1xyXG4gICAgICBvdmVybGF5OiBmYWxzZSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBwbHVnaW5zOiBbXHJcbiAgICByZWFjdCgpLFxyXG4gICAgZHJhbURvY3NQbHVnaW4oKSxcclxuICAgIG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIiAmJiBjb21wb25lbnRUYWdnZXIoKSxcclxuICBdLmZpbHRlcihCb29sZWFuKSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcclxuICAgIH0sXHJcbiAgfSxcclxufSkpO1xyXG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGRvdWdzXFxcXERyb3Bib3hcXFxcX19fXzIwMjUgUHJvamVjdHNcXFxcX1VTQSBWUyBNQUdBXFxcXEFwcCBTb3VyY2VcXFxcRHJhbWF0b24gMi4wIEdpdFxcXFxkcmFtYXRvbi1zdHVkaW8tNjJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGRvdWdzXFxcXERyb3Bib3hcXFxcX19fXzIwMjUgUHJvamVjdHNcXFxcX1VTQSBWUyBNQUdBXFxcXEFwcCBTb3VyY2VcXFxcRHJhbWF0b24gMi4wIEdpdFxcXFxkcmFtYXRvbi1zdHVkaW8tNjJcXFxcdml0ZS1wbHVnaW4tZHJhbS1kb2NzLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9kb3Vncy9Ecm9wYm94L19fX18yMDI1JTIwUHJvamVjdHMvX1VTQSUyMFZTJTIwTUFHQS9BcHAlMjBTb3VyY2UvRHJhbWF0b24lMjAyLjAlMjBHaXQvZHJhbWF0b24tc3R1ZGlvLTYyL3ZpdGUtcGx1Z2luLWRyYW0tZG9jcy50c1wiO2ltcG9ydCB7IFBsdWdpbiB9IGZyb20gJ3ZpdGUnO1xyXG5pbXBvcnQgeyB3cml0ZUZpbGVTeW5jLCBta2RpclN5bmMsIGV4aXN0c1N5bmMgfSBmcm9tICdmcyc7XHJcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcclxuXHJcbi8qKlxyXG4gKiBWaXRlIHBsdWdpbiB0aGF0IGF1dG8tZ2VuZXJhdGVzIERSQU0gU2NyaXB0IGRvY3VtZW50YXRpb25cclxuICogUnVucyBvbiBldmVyeSBkZXYgc2VydmVyIHN0YXJ0IGFuZCBwcm9kdWN0aW9uIGJ1aWxkXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZHJhbURvY3NQbHVnaW4oKTogUGx1Z2luIHtcclxuICByZXR1cm4ge1xyXG4gICAgbmFtZTogJ2RyYW0tZG9jcy1nZW5lcmF0b3InLFxyXG4gICAgXHJcbiAgICAvLyBSdW4gYXQgdGhlIHZlcnkgc3RhcnQgb2YgYm90aCBkZXYgYW5kIGJ1aWxkXHJcbiAgICBidWlsZFN0YXJ0OiBhc3luYyAoKSA9PiB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgLy8gRHluYW1pYyBpbXBvcnQgdG8gZ2V0IGZyZXNoIGNvbnRlbnQgZWFjaCB0aW1lXHJcbiAgICAgICAgY29uc3QgeyBnZW5lcmF0ZU1hcmtkb3duIH0gPSBhd2FpdCBpbXBvcnQoJy4vc3JjL3V0aWxzL2dlbmVyYXRlRHJhbURvY3MnKTtcclxuICAgICAgICBjb25zdCBtYXJrZG93biA9IGdlbmVyYXRlTWFya2Rvd24oKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBFbnN1cmUgZG9jcyBkaXJlY3RvcnkgZXhpc3RzXHJcbiAgICAgICAgY29uc3QgZG9jc0RpciA9IHJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ2RvY3MnKTtcclxuICAgICAgICBpZiAoIWV4aXN0c1N5bmMoZG9jc0RpcikpIHtcclxuICAgICAgICAgIG1rZGlyU3luYyhkb2NzRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gV3JpdGUgdGhlIGRvY3VtZW50YXRpb25cclxuICAgICAgICBjb25zdCBvdXRwdXRQYXRoID0gcmVzb2x2ZShkb2NzRGlyLCAnRFJBTV9TQ1JJUFQubWQnKTtcclxuICAgICAgICB3cml0ZUZpbGVTeW5jKG91dHB1dFBhdGgsIG1hcmtkb3duLCAndXRmLTgnKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBDb3VudCBjb21tYW5kcyBmb3IgdGhlIGxvZyBtZXNzYWdlXHJcbiAgICAgICAgY29uc3QgY29tbWFuZENvdW50ID0gKG1hcmtkb3duLm1hdGNoKC8jIyMjIGAvZykgfHwgW10pLmxlbmd0aDtcclxuICAgICAgICBjb25zb2xlLmxvZyhgXFxuXHVEODNEXHVEQ0REIERSQU0gU2NyaXB0IGRvY3MgdXBkYXRlZCAoJHtjb21tYW5kQ291bnR9IGNvbW1hbmRzKVxcbmApO1xyXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1x1MjZBMFx1RkUwRiBGYWlsZWQgdG8gZ2VuZXJhdGUgRFJBTSBkb2NzOicsIGVycm9yKTtcclxuICAgICAgfVxyXG4gICAgfSxcclxuICB9O1xyXG59XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7O0FBK2VPLFNBQVMsd0JBQXFFO0FBQ25GLFFBQU0sV0FBZ0M7QUFBQSxJQUNwQztBQUFBLElBQVk7QUFBQSxJQUFTO0FBQUEsSUFBUTtBQUFBLElBQVE7QUFBQSxJQUNyQztBQUFBLElBQU87QUFBQSxJQUFZO0FBQUEsSUFBTztBQUFBLElBQVU7QUFBQSxJQUNwQztBQUFBLElBQVE7QUFBQSxJQUFTO0FBQUEsSUFBVTtBQUFBLElBQU87QUFBQSxJQUFNO0FBQUEsSUFBUztBQUFBLElBQ2pEO0FBQUEsSUFBUTtBQUFBLElBQ1I7QUFBQSxJQUFVO0FBQUEsSUFBUztBQUFBLElBQWU7QUFBQSxJQUNsQztBQUFBLElBQ0E7QUFBQSxJQUFVO0FBQUEsSUFBZTtBQUFBLElBQVc7QUFBQSxFQUN0QztBQUVBLFFBQU0sa0JBQWtCLElBQUksSUFBSSxhQUFhLElBQUksU0FBTyxJQUFJLElBQUksQ0FBQztBQUNqRSxRQUFNLFVBQVUsU0FBUyxPQUFPLFVBQVEsQ0FBQyxnQkFBZ0IsSUFBSSxJQUFJLENBQUM7QUFDbEUsUUFBTSxhQUFhLFNBQVMsT0FBTyxVQUFRLGdCQUFnQixJQUFJLElBQUksQ0FBQztBQUVwRSxTQUFPLEVBQUUsU0FBUyxXQUFXO0FBQy9CO0FBL2ZBLElBdUJhLGNBMFlBO0FBamFiO0FBQUE7QUF1Qk8sSUFBTSxlQUE2QjtBQUFBO0FBQUEsTUFFeEM7QUFBQSxRQUNFLE1BQU07QUFBQSxRQUNOLFVBQVU7QUFBQSxRQUNWLFFBQVE7QUFBQSxRQUNSLGFBQWE7QUFBQSxRQUNiLFlBQVk7QUFBQSxVQUNWLEVBQUUsTUFBTSxhQUFhLE1BQU0sVUFBVSxhQUFhLHlFQUF5RTtBQUFBLFVBQzNILEVBQUUsTUFBTSxRQUFRLE1BQU0s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
