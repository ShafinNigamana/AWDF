# Practical 8 — Performance Optimization and Lazy Loading in React

## Aim and Objective
Optimize React application performance using lazy loading and code splitting (`React.lazy()`, `Suspense`), and evaluate the impact through production build metrics and React DevTools profiling.

## Implementation Highlights
- Route-level code splitting in `src/App.jsx` for `Projects` and `Contact` routes using `React.lazy()` and `Suspense` with a 300 ms minimum delay helper (`delayImport`).
- Meaningful loading fallback UI (`<div className="route-loading">Loading page...</div>`).
- Component-level lazy loading in `src/pages/Projects.jsx` for the heavy Recharts analytics component (`TaskSummary`), deferring ~358 kB of third-party chart dependencies until task data is loaded.
- Component loading fallback UI (`<div className="loading-panel">Loading task summary...</div>`).
- CORS origin update in backend `server.js` allowing Vite preview server port (`4173`) alongside development port (`5173`).

## Production Build Metrics
Command: `npm run build` (Vite v8.1.3)

| Asset Chunk | Type | Uncompressed Size | Gzip Size | Loading Behavior |
| :--- | :--- | :--- | :--- | :--- |
| `dist/assets/index-CGmJcWT8.js` | Main entry bundle | 240.82 kB | 76.97 kB | Loaded on initial page visit |
| `dist/assets/Contact-0Fy-cMte.js` | Route chunk | 1.75 kB | 0.75 kB | Loaded on demand when visiting `/contact` |
| `dist/assets/Projects-BXpEs3mF.js` | Route chunk | 6.75 kB | 2.33 kB | Loaded on demand when visiting `/projects` |
| `dist/assets/TaskSummary-BBYQAimE.js` | Heavy component chunk | 358.77 kB | 103.83 kB | Loaded on demand when tasks are displayed |
| `dist/assets/index-C3PMDAgg.css` | Stylesheet | 12.96 kB | 3.41 kB | Loaded on initial page visit |
| `dist/index.html` | HTML template | 0.48 kB | 0.30 kB | Initial document |

### Code Splitting Impact Analysis
- **Without Lazy Loading**: Total monolithic JavaScript bundle would be ~608.09 kB (~183.88 kB gzip), forcing clients to download Recharts on initial load even if they never visit the Projects page.
- **With Lazy Loading**: Initial JavaScript payload is reduced to 240.82 kB (76.97 kB gzip), a **60.4% reduction** in initial JavaScript size. The 358.77 kB Recharts library is completely deferred.

## React DevTools Profiler Observation
- **Component Identified**: `<TaskSummary>` inside `Projects.jsx`.
- **Observation**: When typing into the "Title" or "Description" input fields in the "Add a task" form, the `Projects` parent component updates its `form` state on every keystroke. This causes `Projects` to re-render, which in turn causes `<TaskSummary>` to re-render on every keystroke even though the `tasks` prop array reference has not changed.
- **Profiler Evidence**: Profiler flamegraph shows `<TaskSummary>` rendered with reason: "The parent component rendered" while props remained unchanged.
- **Optimization Strategy**: Wrapping `<TaskSummary>` with `React.memo` prevents re-renders during form input, ensuring it only re-renders when the `tasks` reference updates (creation, update, or deletion).

## Manual Screenshot Checklist
Capture the following screenshots for the practical submission:
1. **Production Build Output**: Terminal screenshot running `npm run build` in `Practicals/Student-Portfolio` displaying chunk names and gzip sizes.
2. **Initial Page Load Network**: DevTools Network tab filtered to JS on `/` showing only `index-*.js` loaded (verifying `Projects`, `Contact`, and `TaskSummary` are not requested).
3. **Route Chunk Loading**: Network tab showing `Contact-*.js` fetched upon clicking Contact link.
4. **Projects & Chart Chunk Loading**: Network tab showing `Projects-*.js` and `TaskSummary-*.js` fetched upon navigating to `/projects`.
5. **Loading Fallback UI**: Browser view showing the fallback banner ("Loading page..." or "Loading task summary...") during throttled load.
6. **React DevTools Profiler**: Profiler flamegraph/ranked chart showing `<TaskSummary>` render activity during state changes.
