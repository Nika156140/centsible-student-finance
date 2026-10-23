# Centsible — Coding Agent Skills

This file describes working skills and task procedures the coding agent should apply to Centsible. Follow the relevant procedure for the task; do not attempt every procedure for every change.

## Skill 1: Repository Inspection
**Use when:** starting work, continuing an existing project, or debugging unfamiliar code.
1. Inspect the project files.
2. Identify the entry point, styles, scripts, data storage, and run instructions.
3. Check existing dependencies/frameworks before adding anything.
4. Identify existing features and known errors.
5. Give a short plan and preserve working implementation.

**Deliverable:** concise summary of the current structure and the smallest safe next step.

## Skill 2: Frontend Implementation
**Use when:** building a new feature or initial prototype.
1. Use semantic HTML, maintainable CSS, and readable vanilla JavaScript.
2. Keep presentation, styling, and application logic reasonably separated.
3. Use reusable functions for repeated UI updates and calculations.
4. Make forms accessible and validate input.
5. Support responsive layouts.
6. Ensure every visible control performs the action its label promises.
7. Keep scope limited to the requested feature.

**Acceptance checks:** the feature works, invalid input is handled, the layout remains usable on mobile, and unrelated features do not regress.

## Skill 3: Personal Finance Calculations
**Use when:** changing dashboard totals, budgets, transaction summaries, or savings calculations.
1. Identify the source of truth for transactions, budgets, and goals.
2. Define the calculation clearly before editing.
3. Keep income and expense transactions distinct.
4. Calculate totals from data rather than hardcoded display values.
5. Apply date and category filters consistently.
6. Handle empty lists, invalid data, and boundary cases.
7. Ensure affected UI components update after a data change.

**Acceptance checks:** adding, editing, and deleting records produces consistent totals throughout the app.

## Skill 4: localStorage Persistence
**Use when:** saving or loading app data.
1. Use consistent, documented storage keys.
2. Handle missing or malformed stored values safely.
3. Provide defaults for a first-time visit without overwriting existing user data.
4. Save changes after successful mutations.
5. Confirm persistence after a reload.
6. Make reset behavior explicit and require confirmation for destructive resets.
7. If the data schema changes, handle older saved data safely.

**Acceptance checks:** data survives reload, first launch works, malformed data does not crash the app, and reset behavior is clear.

## Skill 5: Smart Insights
**Use when:** generating spending summaries or saving suggestions.
1. Base insights on actual transactions and budgets.
2. Use transparent rules, such as identifying the largest spending category or a budget overrun.
3. Avoid unsupported claims from too little data.
4. Explain the reason behind each insight when practical.
5. Provide a helpful empty state when there is insufficient data.
6. Label suggestions as general guidance, not professional financial advice.
7. Do not describe rule-based logic as a real AI model.

**Acceptance checks:** insights change when the underlying data changes and do not contradict dashboard totals.

## Skill 6: UI and Responsive Design
**Use when:** improving the visual interface.
1. Keep Centsible's navy-and-green fintech identity.
2. Prioritize clear hierarchy for income, expenses, remaining budget, and savings.
3. Use consistent spacing, typography, borders, and card styles.
4. Check mobile and desktop layouts.
5. Provide readable labels, focus states, and accessible contrast.
6. Include loading, empty, success, and error states where appropriate.
7. Do not change data logic during a UI-only task.

**Acceptance checks:** the interface is readable, responsive, consistent, and existing interactions still work.

## Skill 7: Debugging and Regression Testing
**Use when:** the app has errors or after a meaningful code change.
Test relevant flows:
- Add a transaction.
- Edit a transaction.
- Delete a transaction.
- Reload and verify persistence.
- Change a category budget.
- Update a savings goal.
- Test empty required fields and invalid amounts.
- Check empty-state behavior.
- Check mobile and desktop layouts.
- Inspect browser console errors when browser access is available.

Fix root causes where practical rather than hiding errors. Clearly report any tests that could not actually be run.

## Skill 8: Hackathon Demo Preparation
**Use when:** preparing a live demonstration or pitch.
1. Confirm the core user journey works.
2. Prepare a clean, clearly labeled demo dataset.
3. Rehearse: dashboard → add expense → budget update → insight → savings goal.
4. Keep a local copy and know how to start it.
5. Avoid depending on the internet unless the app genuinely requires it.
6. Explain architecture and limitations honestly.
7. Use real screenshots from the running app in slides.
8. Do not claim unimplemented integrations or tests.

**Acceptance checks:** the demo is reliable and the developer can explain every demonstrated feature.

## Skill 9: Presentation and Project Explanation
**Use when:** writing the pitch deck, README, or judge-facing explanation.
Include:
- The student financial-management problem.
- The Centsible solution.
- The user workflow.
- The actual technology stack.
- Demonstrable features and screenshots.
- Current limitations.
- Realistic future improvements.

Do not invent metrics, user feedback, or outcomes. Clearly separate current functionality from future scope.

## Skill 10: Task Handoff
At the end of each task, provide:
1. A short summary.
2. Files changed.
3. How to run or verify the change.
4. Tests actually run and results.
5. Remaining issues or limitations.
6. One sensible next step, if useful.

Never claim a successful test without evidence.
