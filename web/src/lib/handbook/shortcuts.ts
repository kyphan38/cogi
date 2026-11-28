/**
 * Keyboard shortcuts, shown at the end of the Handbook (/handbook#shortcuts).
 * Update this list when a key handler changes.
 */
export const HANDBOOK_SHORTCUTS: { title: string; rows: { keys: string; action: string }[] } = {
  title: "Shortcuts",
  rows: [
    { keys: "Esc", action: "Close a pop-up window, or cancel a delete in Past exercises." },
    { keys: "Esc", action: "Close the domain list, or clear the text you selected in a passage." },
    { keys: "↑ ↓", action: "Domain list: move up and down." },
    { keys: "Enter", action: "Domain list: pick the marked item." },
    { keys: "Enter or Space", action: "Tag or open the sentence you moved to with Tab." },
    { keys: "Arrow keys", action: "Map question: move the cross. Hold Shift to move faster." },
    { keys: "+ and -", action: "Map question: zoom in and out." },
    { keys: "Enter or Space", action: "Map question: answer at the cross." },
    { keys: "Enter", action: "Today, \"What happened?\" box: save." },
  ],
};
