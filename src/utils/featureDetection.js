/**
 * Feature detection using OpenCV.js ORB (Oriented FAST and Rotated BRIEF)
 * This is the same algorithm used in the original CADS
 */

export async function detectFeatures(imagePath) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const cv = window.cv;

        if (!cv || !cv.imread) {
          reject(new Error('OpenCV is not fully initialized.'));
          return;
        }

        // Create canvas and load image
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Convert to OpenCV Mat
        let src = cv.imread(canvas);

        // Convert to grayscale
        let gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

        // Apply Gaussian blur to reduce noise
        let blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

        // Create ORB detector (same as original CADS)
        const orb = new cv.ORB(1000); // Detect up to 1000 features

        // Detect keypoints and compute descriptors
        let keypoints = new cv.KeyPointVector();
        let descriptors = new cv.Mat();
        let mask = new cv.Mat();

        orb.detectAndCompute(blurred, mask, keypoints, descriptors);

        // Copy descriptors out as a compact byte array (rows x cols, CV_8U).
        // Much smaller in memory than nested JS arrays — matters for
        // thousand-image studies.
        const descRows = descriptors.rows;
        const descCols = descriptors.cols || 32;
        const descriptorData = new Uint8Array(
          descriptors.data.subarray(0, descRows * descCols)
        );

        const keypointCount = keypoints.size();

        // Clean up (everything allocated by OpenCV must be freed manually)
        src.delete();
        gray.delete();
        blurred.delete();
        mask.delete();
        keypoints.delete();
        descriptors.delete();
        orb.delete();

        resolve({
          descriptors: descriptorData,
          descRows,
          descCols,
          keypointCount
        });
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${imagePath}`));
    };

    // In Electron with webSecurity: false, we can load local files directly
    const fileUrl = imagePath.startsWith('file://') ? imagePath : `file://${imagePath}`;
    img.src = fileUrl;
  });
}

/**
 * Build a reusable cv.Mat from stored descriptor bytes. Building these once
 * per image (instead of once per pair) makes large studies far faster.
 */
export function buildDescriptorMat(feature) {
  const cv = window.cv;
  const mat = new cv.Mat(feature.descRows, feature.descCols || 32, cv.CV_8U);
  if (feature.descRows > 0) {
    mat.data.set(feature.descriptors);
  }
  return mat;
}

/**
 * Match two descriptor Mats with a shared BFMatcher.
 * Returns a distance score (lower = more similar).
 */
export function matchDescriptorMats(bf, desc1, desc2) {
  const cv = window.cv;

  if (desc1.rows === 0 || desc2.rows === 0) {
    return 1000; // Maximum distance if no features
  }

  const matches = new cv.DMatchVector();
  try {
    bf.match(desc1, desc2, matches);

    if (matches.size() === 0) {
      return 1000;
    }

    // Calculate average distance of matches
    let totalDistance = 0;
    for (let i = 0; i < matches.size(); i++) {
      totalDistance += matches.get(i).distance;
    }
    const avgDistance = totalDistance / matches.size();

    // Normalize by number of matches (fewer matches = less similar)
    const matchRatio = matches.size() / Math.max(desc1.rows, desc2.rows);
    return avgDistance / (matchRatio + 0.01);
  } catch (error) {
    console.error('Error matching features:', error);
    return 1000;
  } finally {
    matches.delete();
  }
}
