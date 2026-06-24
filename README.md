# CADS — Computer-Aided Die Study

**Version 2.1.0** · A desktop tool for numismatic die studies using computer vision, built on Electron, React, and WebAssembly OpenCV.js. Works on macOS (including Apple Silicon), Windows, and Linux. See [CHANGELOG.md](./CHANGELOG.md) for release history.

## ✨ Features

- 📁 **Load coin images** from any folder
- 🔍 **Automatic feature detection** using OpenCV.js ORB algorithm (bundled locally — no internet needed)
- 📊 **Hierarchical clustering** to group coins by die similarity
- 🌳 **Interactive dendrogram visualization** using D3.js
- 🧩 **Die Groups view** — cut the dendrogram at an adjustable distance threshold to form candidate die groups
- 💾 **Save & reload studies** as JSON, no need to re-run the analysis
- 💽 **Crash-safe checkpointing** — long runs survive closing or crashing the app and can be resumed
- ⏸️ **Pause / continue** processing at any time
- ⏱️ **Live progress with elapsed time and ETA**
- ⚡ **Modern, fast, and responsive** UI, tuned for studies of thousands of coins

## 🚀 Installation (Mac M4)

### Quick Start

```bash
# Clone the repository
cd ~/
git clone https://github.com/7maram7/cads.git
cd cads

# Install dependencies (uses Node 20+, no Python issues!)
npm install

# Run the app
npm run electron:dev
```

### Prerequisites

- **Node.js 20+** (Install via: `brew install node`)
- **npm** (comes with Node.js)

That's it! No Python, no native compilation, no headaches.

## 🎯 How to Use

1. **Load Images**
   - Click "📁 Load Coin Images"
   - Select a folder containing your coin images
   - Supported formats: JPG, PNG, BMP, TIFF

2. **Analyze Dies**
   - Click "🔍 Analyze Dies"
   - The progress bar shows the current phase, elapsed time, and an estimated time remaining
   - The tool will:
     - Detect features in each image
     - Compare all images pairwise
     - Perform hierarchical clustering
   - Use "⏸️ Pause" / "▶️ Continue" to interrupt and resume a run at any time
   - The run is checkpointed to disk as it goes. If you close (or crash) the app
     mid-analysis, reopen it and click "▶️ Resume Saved Analysis" to continue
     where it left off

3. **View Results**
   - The dendrogram shows die relationships — shorter branches = more similar dies, leaf nodes = individual coins
   - The **Die Groups** panel below it cuts the dendrogram at a distance
     threshold you control with a slider; lower values produce stricter
     (smaller) groups

4. **Export & reload**
   - Click "💾 Export Results" to save the study as JSON (clustering data and
     feature information)
   - Click "📂 Load Study" later to reopen an exported JSON and restore the
     dendrogram and die groups without re-running the analysis

## 🏗️ Technology Stack

- **Electron 32** - Cross-platform desktop app
- **React 18** - Modern UI framework
- **Vite 5** - Lightning-fast build tool
- **OpenCV.js** - WebAssembly computer vision (no native compilation!)
- **D3.js** - Data visualization for dendrograms
- **ml-hclust** - Hierarchical clustering algorithm

## 📊 How It Works

### 1. Feature Detection
- Uses ORB (Oriented FAST and Rotated BRIEF) algorithm
- Detects up to 1000 keypoints per image
- Applies Gaussian blur to reduce noise
- Same algorithm as original CADS

### 2. Feature Matching
- BFMatcher with Hamming distance
- Computes similarity between all image pairs
- Creates distance matrix for clustering

### 3. Hierarchical Clustering
- AGNES (Agglomerative Nesting) algorithm
- Complete linkage method
- Same as original CADS methodology

### 4. Visualization
- D3.js dendrogram layout
- Interactive, scalable SVG
- Shows similarity distances on branches

## 🔧 Development

```bash
# Run in development mode (with hot reload)
npm run electron:dev

# Build for production
npm run electron:build

# Build web version only (for debugging)
npm run build
```

## 📝 Export Format

The JSON export includes:

```json
{
  "timestamp": "2025-11-22T10:30:00.000Z",
  "imageCount": 50,
  "images": ["path/to/image1.jpg", ...],
  "clustering": {
    "children": [...],
    "distance": 123.45
  },
  "features": [
    {
      "imagePath": "path/to/image1.jpg",
      "keypointCount": 876
    }
  ]
}
```

## 🆚 Differences from Original CADS

| Feature | Original CADS | CADS (current) |
|---------|--------------|-------------|
| OpenCV | Native (opencv4nodejs) | WebAssembly (opencv.js) |
| Node Version | 12-16 only | 18+ (any modern version) |
| Python Required | Yes (for node-gyp) | No |
| Build Time | 20-30 minutes | 2-3 minutes |
| Installation Issues | Many on macOS | None |
| UI Framework | jQuery + Material Components | React 18 |
| Bundler | Webpack 4 | Vite 5 |
| Electron | v6 (2019) | v32 (2024) |

## 🐛 Troubleshooting

### OpenCV not loading
- OpenCV.js is bundled locally in `public/opencv.js` (no internet needed)
- Check "OpenCV Status" in sidebar shows "Ready" (usually within a few seconds)
- If it shows "Failed", the error message appears below the status

### Images not displaying
- Make sure image paths don't contain special characters
- Supported formats: JPG, PNG, BMP, TIFF

### App won't start
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
npm run electron:dev
```

## 📖 Credits

Based on the original CADS project by ztaylor54:
- [Original Repository](https://github.com/ztaylor54/cads)
- [Research Paper](https://digitalcommons.trinity.edu/compsci_honors/54)
- Developed in collaboration with the American Numismatic Society

Rebuilt with modern technologies for better compatibility and ease of use.

## 📜 License

MIT License - Same as original CADS
