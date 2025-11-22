# CADS Modern - Computer-Aided Die Study

A modern desktop application for numismatic die analysis using computer vision and hierarchical clustering.

## ✨ Features

- 📁 **Load coin images** from any folder
- 🔍 **Automatic feature detection** using OpenCV ORB algorithm
- 📊 **Hierarchical clustering** to group coins by die similarity
- 🌳 **Interactive dendrogram visualization** using D3.js
- 💾 **Export results** as JSON for further analysis
- ⚡ **Fast and reliable** Python backend for computer vision
- 🖥️ **Modern UI** built with React and Electron

## 🏗️ Architecture

- **Frontend**: Electron + React + D3.js for the user interface
- **Backend**: Python with OpenCV for computer vision processing
- **Communication**: IPC (Inter-Process Communication) between Electron and Python

This architecture provides:
- ✅ **Reliable installation** (no native compilation issues)
- ✅ **Fast processing** (native Python OpenCV performance)
- ✅ **M4 Mac compatible** (works on all Apple Silicon)
- ✅ **Same algorithms** as original CADS

## 📋 Prerequisites

### Required Software

1. **Node.js** (v18 or later)
   - Download from: https://nodejs.org/
   - Or install with Homebrew: `brew install node`
   - Verify installation: `node --version`

2. **Python 3** (v3.8 or later)
   - macOS has Python 3 pre-installed
   - Verify installation: `python3 --version`

3. **pip** (Python package manager)
   - Usually comes with Python 3
   - Verify installation: `pip3 --version`

## 🚀 Installation

### Step 1: Install Python Dependencies

```bash
cd cads-modern
pip3 install -r python/requirements.txt
```

This will install:
- `opencv-python` (4.8.1) - Computer vision library
- `numpy` (1.24.3) - Numerical computing
- `scipy` (1.11.4) - Scientific computing (for clustering)

**Note**: On Mac M4, these packages install cleanly via pip without any compilation.

### Step 2: Install Node.js Dependencies

```bash
npm install
```

This installs Electron, React, Vite, D3.js, and other frontend dependencies.

### Step 3: Verify Installation

```bash
# Test Python dependencies
python3 -c "import cv2, numpy, scipy; print('Python OK')"

# Should print: Python OK
```

## 🎯 Running the Application

### Development Mode

```bash
npm run electron:dev
```

This will:
1. Start the Vite development server (React frontend)
2. Launch the Electron application
3. Open developer tools for debugging

### First Time Setup Check

When the app opens, verify in the sidebar:
- "Python Backend: **Ready**" (should be green)
- No errors in the developer console

## 📖 How to Use

### 1. Load Images

1. Click **"📁 Load Coin Images"** button
2. Select a folder containing your coin images
3. Supported formats: JPG, JPEG, PNG, BMP, TIFF

The sidebar will display how many images were loaded.

### 2. Analyze Dies

1. Click **"🔍 Analyze Dies"** button
2. Watch the progress bar as the analysis runs:
   - **Feature Detection**: Finds distinctive points in each coin (ORB algorithm)
   - **Distance Computation**: Calculates similarity between all coin pairs
   - **Clustering**: Groups coins by die similarity (AGNES algorithm)

**Processing time**: ~2-5 seconds per image depending on resolution

### 3. View Results

The dendrogram (tree diagram) shows:
- 🔴 **Leaf nodes** (red circles): Individual coins
- 🔵 **Internal nodes** (blue circles): Cluster points
- 📏 **Branch lengths**: Die similarity (shorter = more similar)
- 🔢 **Numbers on branches**: Distance values

### 4. Export Results

1. Click **"💾 Export Results"** button
2. Choose where to save the JSON file
3. The file contains:
   - All detected features
   - Distance matrix
   - Clustering hierarchy
   - Timestamps and metadata

## 🔬 Technical Details

### Feature Detection

- **Algorithm**: ORB (Oriented FAST and Rotated BRIEF)
- **Features per image**: 1000
- **Preprocessing**: Gaussian blur (5x5 kernel) to reduce noise
- **Implementation**: OpenCV Python (cv2.ORB_create)

### Feature Matching

- **Matcher**: Brute-Force Matcher with Hamming distance
- **Cross-check**: Enabled for better match quality
- **Distance normalization**: Adjusted by match ratio to penalize low-matching pairs

### Hierarchical Clustering

- **Algorithm**: AGNES (Agglomerative Nesting)
- **Linkage method**: Complete linkage
- **Library**: SciPy's `scipy.cluster.hierarchy`
- **Same method as original CADS**

## 🐛 Troubleshooting

### "Python Backend: Not Available"

**Problem**: Python is not found or dependencies are missing

**Solutions**:
```bash
# Verify Python is installed
python3 --version

# Reinstall Python dependencies
pip3 install -r python/requirements.txt

# On macOS, ensure python3 is in PATH
which python3
```

### "Failed to start Python: ..."

**Problem**: Python script path is incorrect or permissions issue

**Solutions**:
```bash
# Make Python script executable
chmod +x python/main.py

# Test Python script manually
echo '{"command":"ping"}' | python3 python/main.py
# Should output: {"type": "result", "data": {"success": true, "message": "pong"}}
```

### "No features detected in any images"

**Problem**: Images are corrupted, wrong format, or too low quality

**Solutions**:
- Verify images open in an image viewer
- Use high-resolution images (at least 800x800 pixels recommended)
- Ensure good lighting and contrast
- Try different images to isolate the problem

### Analysis is very slow

**Solutions**:
- Start with fewer images (10-20) to test
- Use smaller image files (resize to 1200x1200 max)
- Close other applications to free up CPU/memory
- High-resolution images take longer but produce better results

## 📂 File Structure

```
cads-modern/
├── python/                 # Python backend
│   ├── main.py            # Entry point for Python processing
│   ├── feature_detection.py  # ORB feature detection
│   ├── clustering.py      # Hierarchical clustering
│   └── requirements.txt   # Python dependencies
├── electron/              # Electron main process
│   └── main.js            # IPC handlers and window management
├── src/                   # React frontend
│   ├── App.jsx            # Main application component
│   ├── components/        # UI components
│   │   ├── Controls.jsx
│   │   ├── Dendrogram.jsx
│   │   └── ImageLoader.jsx
│   └── styles/            # CSS styles
├── package.json           # Node.js dependencies
└── README.md             # This file
```

## 🔧 Development

```bash
# Run in development mode (with hot reload)
npm run electron:dev

# Build for production
npm run electron:build

# Build web version only (for debugging)
npm run build
```

## 📊 Export Format

The JSON export includes:

```json
{
  "timestamp": "2025-11-22T10:30:00.000Z",
  "imageCount": 50,
  "images": ["path/to/image1.jpg", ...],
  "clustering": {
    "name": "Cluster 0",
    "distance": 123.45,
    "children": [...]
  },
  "features": [
    {
      "name": "image1.jpg",
      "path": "/full/path/image1.jpg",
      "keypointCount": 876
    }
  ]
}
```

## 🆚 Differences from Original CADS

| Feature | Original CADS | CADS Modern |
|---------|--------------|-------------|
| OpenCV | Native (opencv4nodejs) | Python (opencv-python) |
| Installation | Complex, often fails | Simple, always works |
| Mac M4 Support | ❌ Broken | ✅ Works perfectly |
| Build Time | 20-30 minutes | 2-3 minutes |
| Python Required | For compilation only | For runtime (better!) |
| UI Framework | jQuery + Material | React 18 |
| Bundler | Webpack 4 | Vite 5 |
| Electron | v6 (2019) | v32 (2024) |
| Algorithms | ORB + AGNES | ORB + AGNES (same!) |

## 🎓 Credits

Based on the original CADS project by ztaylor54:
- [Original Repository](https://github.com/ztaylor54/cads)
- [Research Paper](https://digitalcommons.trinity.edu/compsci_honors/54)
- Developed in collaboration with the American Numismatic Society

Rebuilt with modern technologies for better compatibility and reliability.

## 📜 License

MIT License - Same as original CADS

## 💡 Tips for Best Results

1. **Image Quality**: Use high-resolution images (1000x1000 or larger)
2. **Consistent Lighting**: Images with similar lighting produce better results
3. **Clean Backgrounds**: Solid or consistent backgrounds work best
4. **Image Count**: Start with 10-20 images to test, then scale up
5. **Save Your Work**: Export results after each analysis session
