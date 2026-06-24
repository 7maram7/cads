# Changelog

All notable changes to **CADS** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-06-24

This release makes CADS usable on real-world, large-scale die studies
(thousands of coins). It fixes the bugs that prevented clustering from running
at all, removes the dependence on an internet connection for OpenCV, and adds
checkpointing, pause/resume, progress estimates, study save/reload, and a die
grouping view.

### Added

- **Crash-safe checkpointing.** Long analyses now survive closing or crashing
  the app. Detected features and the partial distance matrix are written to the
  OS user-data directory (`meta.json`, `features.json`, `features.bin`,
  `distances.bin`). The distance matrix is flushed every 20,000 pairs using an
  atomic temp-file-and-rename so an interrupted write cannot corrupt the
  checkpoint. A "Resume Saved Analysis" button continues exactly where the run
  left off.
- **Pause / Continue.** Processing can be paused and resumed mid-run; paused
  time is excluded from the elapsed/remaining estimates.
- **Progress and ETA.** A throttled progress bar shows the current phase,
  elapsed working time, and an estimated time remaining.
- **Die Groups view.** A new panel cuts the dendrogram at an adjustable distance
  threshold to form candidate die groups, displaying thumbnails for each group.
  Lower thresholds produce stricter (smaller) groups.
- **Save / Load Study.** Exported study JSON can be reopened later with a new
  "Load Study" button, restoring the dendrogram and die groups without
  re-running the analysis.

### Changed

- **OpenCV.js is now bundled locally** (`public/opencv.js`) and loaded from disk,
  so the app no longer needs an internet connection or a CDN at startup.
- **Far lower memory use and faster matching for large studies.** ORB
  descriptors are stored as compact `Uint8Array` byte buffers instead of nested
  JavaScript arrays. Each image's descriptor `cv.Mat` is built once and a single
  `BFMatcher` is reused across all pairs, instead of rebuilding two matrices for
  every one of the *n·(n−1)/2* comparisons.
- All OpenCV-allocated objects (`Mat`, `KeyPointVector`, `ORB`, `BFMatcher`,
  matches) are now explicitly freed, eliminating WASM heap leaks during long
  runs.
- Removed verbose per-image `console.log` calls from the feature-detection path.

### Fixed

- **Clustering produced wrong results / failed to build the tree.** `agnes` is
  now called with `isDistanceMatrix: true` so it treats the input as a
  precomputed distance matrix. The dendrogram builder now reads `ml-hclust` v3's
  `children[]` array instead of the removed `left`/`right` properties.
- **OpenCV would intermittently hang or fail to initialize.** The loader is now
  a single module-level promise (immune to React StrictMode double-mounting),
  calls the emscripten thenable's `.then()` exactly once and deletes `cv.then`
  to avoid an infinite thenable-unwrap freeze, hides the Electron
  `module`/`exports` globals so the UMD wrapper actually sets `window.cv`,
  supports both the 4.x thenable and the 3.4 `onRuntimeInitialized` paths, and
  fails cleanly after a 60-second timeout.
- **Broken production build.** Removed the `vite` `manualChunks`/`optimizeDeps`
  entries that referenced `opencv.js` as if it were an npm dependency.
- **Windows file paths.** Image filenames are now split on both `/` and `\` in
  the dendrogram and die-group labels.

### Dependencies

- Bumped `concurrently` to `^9.2.1` and `wait-on` to `^8.0.5`.

## [2.0.0] - 2025-11-22

Initial release of the rebuilt **CADS**: a complete rebuild on a modern
stack — Electron 32, React 18, Vite 5, and WebAssembly OpenCV.js — replacing the
legacy Electron 6 + `opencv4nodejs` application, which required Python and native
compilation and was effectively unbuildable on current machines. Provides folder
image loading, ORB feature detection, pairwise BFMatcher matching, AGNES
hierarchical clustering, an interactive D3 dendrogram, and JSON export.

[2.1.0]: https://github.com/7maram7/cads/releases/tag/v2.1.0
[2.0.0]: https://github.com/7maram7/cads/releases/tag/v2.0.0
