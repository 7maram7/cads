"""
Feature detection using OpenCV ORB (Oriented FAST and Rotated BRIEF)
This implements the same algorithm as the original CADS application
"""

import cv2
import numpy as np
from typing import Tuple, List, Dict, Any


class FeatureDetector:
    """Handles ORB feature detection and matching for die study images"""

    def __init__(self, n_features: int = 1000):
        """
        Initialize the ORB detector

        Args:
            n_features: Maximum number of features to detect (default: 1000)
        """
        self.orb = cv2.ORB_create(nfeatures=n_features)
        self.bf_matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)

    def detect_features(self, image_path: str) -> Dict[str, Any]:
        """
        Detect ORB features in an image

        Args:
            image_path: Path to the image file

        Returns:
            Dictionary containing:
                - descriptors: Feature descriptors as list
                - keypoints: Keypoint information as list of dicts
                - success: Boolean indicating if detection succeeded
                - error: Error message if failed
        """
        try:
            # Read image
            img = cv2.imread(image_path)
            if img is None:
                return {
                    'success': False,
                    'error': f'Failed to load image: {image_path}'
                }

            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # Apply Gaussian blur to reduce noise (same as original CADS)
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)

            # Detect keypoints and compute descriptors
            keypoints, descriptors = self.orb.detectAndCompute(blurred, None)

            if descriptors is None or len(keypoints) == 0:
                return {
                    'success': False,
                    'error': f'No features detected in image: {image_path}'
                }

            # Convert keypoints to serializable format
            keypoint_list = [
                {
                    'x': float(kp.pt[0]),
                    'y': float(kp.pt[1]),
                    'size': float(kp.size),
                    'angle': float(kp.angle),
                    'response': float(kp.response)
                }
                for kp in keypoints
            ]

            # Convert descriptors to list (numpy array -> list for JSON)
            descriptor_list = descriptors.tolist()

            return {
                'success': True,
                'descriptors': descriptor_list,
                'keypoints': keypoint_list,
                'num_features': len(keypoints)
            }

        except Exception as e:
            return {
                'success': False,
                'error': f'Error processing {image_path}: {str(e)}'
            }

    def match_features(self, desc1: List[List[int]], desc2: List[List[int]]) -> float:
        """
        Match features between two sets of descriptors using BFMatcher

        Args:
            desc1: First set of descriptors (list of lists)
            desc2: Second set of descriptors (list of lists)

        Returns:
            Distance score (lower = more similar, 0-1000 scale)
        """
        if len(desc1) == 0 or len(desc2) == 0:
            return 1000.0  # Maximum distance if no features

        try:
            # Convert lists back to numpy arrays with correct dtype
            descriptors1 = np.array(desc1, dtype=np.uint8)
            descriptors2 = np.array(desc2, dtype=np.uint8)

            # Match descriptors using BFMatcher with Hamming distance
            matches = self.bf_matcher.match(descriptors1, descriptors2)

            if len(matches) == 0:
                return 1000.0

            # Calculate average distance of matches
            total_distance = sum(match.distance for match in matches)
            avg_distance = total_distance / len(matches)

            # Normalize by match ratio (fewer matches = less similar)
            max_features = max(len(desc1), len(desc2))
            match_ratio = len(matches) / max_features

            # Calculate normalized distance
            # Lower match ratio increases the distance
            normalized_distance = avg_distance / (match_ratio + 0.01)

            return float(normalized_distance)

        except Exception as e:
            print(f'Error matching features: {e}')
            return 1000.0  # Return max distance on error


def compute_distance_matrix(features_list: List[Dict[str, Any]]) -> List[List[float]]:
    """
    Compute pairwise distance matrix for all images

    Args:
        features_list: List of feature dictionaries from detect_features()

    Returns:
        2D distance matrix as list of lists
    """
    detector = FeatureDetector()
    n = len(features_list)
    distance_matrix = [[0.0] * n for _ in range(n)]

    for i in range(n):
        for j in range(i + 1, n):
            desc1 = features_list[i]['descriptors']
            desc2 = features_list[j]['descriptors']

            distance = detector.match_features(desc1, desc2)
            distance_matrix[i][j] = distance
            distance_matrix[j][i] = distance  # Symmetric matrix

    return distance_matrix
