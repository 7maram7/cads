# Installation Guide for macOS (M4)

## Step-by-Step Installation

### 1. Install Node.js (if not already installed)

```bash
# Check if Node.js is installed
node --version

# If not installed or version < 18, install via Homebrew:
brew install node

# Verify installation
node --version  # Should show v20.x.x or higher
npm --version   # Should show v10.x.x or higher
```

### 2. Download CADS

```bash
# Navigate to your home directory
cd ~/

# Clone the repository
git clone https://github.com/7maram7/cads.git

# Or if you have the code already, just navigate to it
cd cads
```

### 3. Install Dependencies

```bash
# This will take 2-3 minutes
npm install
```

### 4. Run the Application

```bash
# Start in development mode
npm run electron:dev
```

The application window should open automatically!

## 🎉 That's It!

No Python, no CMake, no native compilation, no headaches.

## Using CADS

### First Time Setup
1. Wait for "OpenCV Status: Ready" in the sidebar (usually a few seconds)
2. Click "📁 Load Coin Images" and select your folder
3. Click "🔍 Analyze Dies" to process
4. View the dendrogram results
5. Click "💾 Export Results" to save

### Sample Workflow

```bash
# Your coin images should be in a folder like:
~/Documents/CoinStudy/
  ├── coin001.jpg
  ├── coin002.jpg
  ├── coin003.jpg
  └── ...
```

1. Load the folder containing your coin images
2. The app will analyze all images automatically
3. View the similarity dendrogram
4. Export results as JSON

## Tips

- **Image Format**: JPG, PNG, BMP, or TIFF work best
- **Image Quality**: Higher resolution = better feature detection
- **Processing Time**: ~2-5 seconds per image
- **Memory**: For 100+ images, you may need to close other apps

## Troubleshooting

### "OpenCV is still loading"
- OpenCV.js is bundled with the app (no internet needed) and is usually ready within a few seconds
- If the status shows "Failed", the error message appears below it in the sidebar
- Restart the app if it stays on "Loading..."

### App won't start
```bash
rm -rf node_modules
npm install
npm run electron:dev
```

### Images not showing
- Check that image paths don't have special characters
- Make sure images are valid JPG/PNG files

## Building Standalone App (Optional)

To create a standalone .app file:

```bash
npm run electron:build
```

The app will be in the `dist/` folder.

## Need Help?

Check the main README.md for more information!
