---
date: 2026-01-18
title: The theater opens
commits: 74
source: reconstructed
---

> **Reconstructed from the commit log.** 37 of 74 commits carry a message.

The day the editor learned to *play* what it was editing.

**`Integrate Theater framework`** is the commit that matters. Before it, Dramaton
Studio was a place to arrange assets. After it, there was somewhere for a scene
to actually happen. `Use shared Stage in SceneEditor` follows shortly — the
editor preview and the player became the same renderer, which is why, months
later, a change to how balloons are drawn shows up in both places for free.

Then `Add preview scene button`, `Add Play/Edit splash buttons`, `Add back to
menu button`, `Finish Theater button interactivity`. The loop closing: make a
thing, watch the thing, come back and change it.

**The self-documenting turn.** Three commits — `Generate DRAM docs auto`,
`Automate DRAM docs registry`, `Automate project state capture` — establish
something the project still runs on: the scripting language's documentation is
*generated from the code that implements it*. Seven months later the language has
43 commands and the reference has never once been out of date, because nobody has
ever been allowed to write it by hand.

**Also landed:** the asset library with notes and status, automatic status
promotion (touch an asset and it stops being "new"), a native file picker
replacing browser dialogs, draggable stage buttons, and PDF capture of the whole
project — including, in a nicely absurd touch, `Add splash screen PDF capture`.

**One quiet fix worth flagging:** `Fix drop background green bg bug`. Green
screens were already causing trouble in January. In August the chroma-key
pipeline gets rebuilt around them properly.
