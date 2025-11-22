# CADS Modern - Quick Start Guide

## 🎉 What's New

Your CADS application has been **completely rebuilt** with a reliable Python backend!

### Why the Change?

The OpenCV.js (WebAssembly) approach had persistent initialization issues. The new architecture uses:
- ✅ **Python OpenCV** (native, fast, reliable)
- ✅ **Clean installation** (works perfectly on Mac M4)
- ✅ **Same algorithms** (ORB features + AGNES clustering)
- ✅ **Better performance** (native code vs WASM)

## 🚀 Getting Started (2 minutes)

### Step 1: Pull Latest Code

```bash
cd ~/cads/cads-modern
git pull
```

### Step 2: Run Setup Script

```bash
./setup.sh
```

This will:
- ✅ Check Python3 and Node.js are installed
- ✅ Install Python packages (opencv-python, numpy, scipy)
- ✅ Install Node.js packages (Electron, React, etc.)
- ✅ Verify everything works

### Step 3: Launch the App

```bash
npm run electron:dev
```

**That's it!** The app will open.

## ✅ Verify Installation

When the app opens, check the sidebar:

- **"Python Backend: Ready"** (in green) ✅
- **"Images Loaded: 0"** ✅

If you see "Python Backend: Ready" in green, you're all set!

## 🎯 Quick Test with Your Data

1. **Load Images**: Click "📁 Load Coin Images"
2. **Select folder** with your 62 coin images
3. **Analyze**: Click "🔍 Analyze Dies"
4. **Watch progress**: You'll see real-time progress
5. **View results**: Dendrogram appears when complete
6. **Export**: Click "💾 Export Results" to save

## 📊 What to Expect

### Performance
- **Feature detection**: ~2-5 seconds per image
- **62 images total time**: ~3-5 minutes
- **Progress updates**: Real-time, every image

### Output
- **Interactive dendrogram** showing die relationships
- **Red circles**: Individual coins
- **Blue circles**: Cluster points
- **Shorter branches**: More similar dies

## 🐛 If Something Goes Wrong

### "Python Backend: Not Available" (Red)

```bash
# Verify Python is working
python3 --version

# Reinstall Python packages
pip3 install -r python/requirements.txt

# Test manually
echo '{"command":"ping"}' | python3 python/main.py
```

Should output: `{"type": "result", "data": {"success": true, "message": "pong"}}`

### "Failed to start Python"

```bash
# Make sure script is executable
chmod +x python/main.py

# Check Python is in PATH
which python3
```

### App won't start at all

```bash
# Clean reinstall
rm -rf node_modules package-lock.json
npm install
npm run electron:dev
```

## 📋 Architecture Overview

```
┌─────────────────────────────────────────┐
│  Electron + React UI                    │
│  (Frontend - Beautiful interface)       │
└──────────────┬──────────────────────────┘
               │ IPC Communication
               │ (JSON messages)
┌──────────────▼──────────────────────────┐
│  Python Backend                         │
│  - OpenCV feature detection             │
│  - SciPy hierarchical clustering        │
│  - Progress updates                     │
└─────────────────────────────────────────┘
```

## 🔍 What Changed Under the Hood

| Component | Old (OpenCV.js) | New (Python) |
|-----------|-----------------|--------------|
| **OpenCV** | WASM (unreliable) | Native Python |
| **Loading** | CDN download | Local package |
| **Speed** | Slower | Faster |
| **Reliability** | ❌ Broken | ✅ Works |
| **Installation** | Nightmare | `pip install` |

## 📖 Full Documentation

See `README.md` for:
- Complete installation guide
- Troubleshooting section
- Technical details
- Export format
- Tips for best results

## 💡 Pro Tips

1. **Start small**: Test with 10-20 images first
2. **Image quality matters**: Use high-res images (1000x1000+)
3. **Save your work**: Export after each analysis
4. **Check console**: Developer tools show detailed logs

## 📞 Help

If you encounter issues:
1. Check the **developer console** (it's open by default)
2. Look for error messages in **red**
3. See the **Troubleshooting** section in README.md
4. Test the Python backend manually (commands above)

---

**You're all set!** The new architecture is solid and should work reliably. Enjoy analyzing your coins! 🪙
