# Accessibility and keyboard checklist

Run `npm run test:a11y` before release. The smoke test covers empty, populated, display settings, import and task editor states in the configured light, dark, desktop and mobile browser projects. It fails on serious or critical axe violations.

## Manual keyboard pass

- Start with an empty project. Use Tab and Shift+Tab to reach every toolbar action. Confirm the focus indicator is always visible.
- Open View, Project and Export with Enter, Space and Arrow Down. Use Arrow Up, Arrow Down, Home and End within each menu. Escape must close the menu and return focus to its trigger.
- Create a task without a pointer. In the editor, confirm initial focus lands on Task name, Tab and Shift+Tab stay inside the dialog, Escape closes it, and focus returns to the control that opened it.
- Focus each chart task. Confirm Enter or Space opens the editor, F2 renames it, Left and Right move it by one day, Shift+Left and Shift+Right move it by seven days, Up and Down reorder it, and Delete removes it.
- In Edit tasks, change names, dates, categories and progress. Open dependencies with Enter or Space, toggle predecessors with Space, save, move tasks up and down, and delete a task.
- Open Import, Display settings, Help, Dependencies and Clear project. Confirm each has a spoken name and description, traps focus, closes with Escape, and returns focus to its opener. Focus must never move to content behind an overlay.
- Test at 200% browser zoom and at a 320 CSS-pixel viewport. No essential control or dialog action should be clipped in one direction of scrolling.
- Enable reduced motion at operating-system level. Pulsing indicators, smooth scrolling and transitions should stop.
- In light and dark themes, inspect default, hover, focus, selected, disabled, error and destructive states. Text and interactive boundaries should meet WCAG AA, and selection/progress/dependencies must remain understandable without relying on colour alone.
- With a screen reader, confirm symbol controls announce their purpose, for example “Close task editor”, “Move task up”, “Zoom out” and “Delete task name”, rather than only the displayed symbol or colour value.
