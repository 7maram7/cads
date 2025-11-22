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

        orb.detectAndCompute(blurred, new cv.Mat(), keypoints, descriptors);

        // Convert descriptors to array for storage
        const descriptorArray = [];
        for (let i = 0; i < descriptors.rows; i++) {
          const row = [];
          for (let j = 0; j < descriptors.cols; j++) {
            row.push(descriptors.ucharAt(i, j));
          }
          descriptorArray.push(row);
        }

        // Convert keypoints to simple objects
        const keypointArray = [];
        for (let i = 0; i < keypoints.size(); i++) {
          const kp = keypoints.get(i);
          keypointArray.push({
            x: kp.pt.x,
            y: kp.pt.y,
            size: kp.size,
            angle: kp.angle,
            response: kp.response
          });
        }

        // Clean up
        src.delete();
        gray.delete();
        blurred.delete();
        keypoints.delete();
        descriptors.delete();

        resolve({
          descriptors: descriptorArray,
          keypoints: keypointArray
        });
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${imagePath}`));
    };

    img.src = `file://${imagePath}`;
  });
}

/**
 * Match features between two sets of descriptors using BFMatcher
 * Returns a distance score (lower = more similar)
 */
export function matchFeatures(descriptors1, descriptors2) {
  const cv = window.cv;

  if (descriptors1.length === 0 || descriptors2.length === 0) {
    return 1000; // Maximum distance if no features
  }

  try {
    // Convert descriptor arrays back to cv.Mat
    const desc1 = cv.matFromArray(
      descriptors1.length,
      descriptors1[0].length,
      cv.CV_8U,
      descriptors1.flat()
    );

    const desc2 = cv.matFromArray(
      descriptors2.length,
      descriptors2[0].length,
      cv.CV_8U,
      descriptors2.flat()
    );

    // Create BFMatcher with Hamming distance (for ORB)
    const bf = new cv.BFMatcher(cv.NORM_HAMMING, true);

    // Match descriptors
    let matches = new cv.DMatchVector();
    bf.match(desc1, desc2, matches);

    if (matches.size() === 0) {
      desc1.delete();
      desc2.delete();
      matches.delete();
      return 1000;
    }

    // Calculate average distance of matches
    let totalDistance = 0;
    for (let i = 0; i < matches.size(); i++) {
      totalDistance += matches.get(i).distance;
    }

    const avgDistance = totalDistance / matches.size();

    // Normalize by number of matches (fewer matches = less similar)
    const matchRatio = matches.size() / Math.max(descriptors1.length, descriptors2.length);
    const normalizedDistance = avgDistance / (matchRatio + 0.01); // Avoid division by zero

    // Clean up
    desc1.delete();
    desc2.delete();
    matches.delete();

    return normalizedDistance;
  } catch (error) {
    console.error('Error matching features:', error);
    return 1000; // Return max distance on error
  }
}
