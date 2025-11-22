#!/usr/bin/env python3
"""
Test script for CADS Python backend
Validates that all components work correctly
"""

import sys
import json
import tempfile
import os
import numpy as np
import cv2

# Import our modules
from feature_detection import FeatureDetector, compute_distance_matrix
from clustering import perform_clustering


def create_test_image(filename, pattern='random'):
    """Create a test image with distinguishable features"""
    # Create a 500x500 image
    img = np.ones((500, 500, 3), dtype=np.uint8) * 255

    if pattern == 'random':
        # Add random noise/features
        for _ in range(50):
            x, y = np.random.randint(50, 450, 2)
            radius = np.random.randint(5, 20)
            color = tuple(np.random.randint(0, 255, 3).tolist())
            cv2.circle(img, (x, y), radius, color, -1)

    elif pattern == 'grid':
        # Add grid pattern
        for i in range(5):
            for j in range(5):
                x, y = 50 + i * 100, 50 + j * 100
                cv2.rectangle(img, (x-10, y-10), (x+10, y+10), (0, 0, 0), -1)

    elif pattern == 'circles':
        # Add concentric circles
        center = (250, 250)
        for radius in range(50, 200, 30):
            cv2.circle(img, center, radius, (0, 0, 0), 2)

    cv2.imwrite(filename, img)
    return filename


def test_feature_detection():
    """Test feature detection on a single image"""
    print("Testing feature detection...")

    # Create a temporary test image
    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
        test_img = create_test_image(tmp.name, 'random')

    try:
        detector = FeatureDetector(n_features=500)
        result = detector.detect_features(test_img)

        assert result['success'], f"Feature detection failed: {result.get('error')}"
        assert 'descriptors' in result
        assert 'keypoints' in result
        assert result['num_features'] > 0, "No features detected"

        print(f"  ✓ Detected {result['num_features']} features")
        return True

    finally:
        os.unlink(test_img)


def test_feature_matching():
    """Test feature matching between two images"""
    print("Testing feature matching...")

    # Create two temporary test images
    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp1:
        img1 = create_test_image(tmp1.name, 'random')

    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp2:
        img2 = create_test_image(tmp2.name, 'random')

    try:
        detector = FeatureDetector(n_features=500)

        result1 = detector.detect_features(img1)
        result2 = detector.detect_features(img2)

        assert result1['success'] and result2['success']

        # Match features
        distance = detector.match_features(
            result1['descriptors'],
            result2['descriptors']
        )

        assert isinstance(distance, float), "Distance should be a float"
        assert 0 <= distance <= 1000, "Distance out of expected range"

        print(f"  ✓ Match distance: {distance:.2f}")
        return True

    finally:
        os.unlink(img1)
        os.unlink(img2)


def test_clustering():
    """Test hierarchical clustering"""
    print("Testing clustering...")

    # Create test images
    test_images = []
    for i, pattern in enumerate(['random', 'grid', 'circles', 'random', 'grid']):
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
            img = create_test_image(tmp.name, pattern)
            test_images.append(img)

    try:
        detector = FeatureDetector(n_features=500)

        # Detect features in all images
        features = []
        for img in test_images:
            result = detector.detect_features(img)
            assert result['success'], f"Failed to detect features in {img}"
            features.append(result)

        # Compute distance matrix
        dist_matrix = compute_distance_matrix(features)

        assert len(dist_matrix) == len(test_images)
        assert len(dist_matrix[0]) == len(test_images)

        # Perform clustering
        image_names = [f"test_{i}.jpg" for i in range(len(test_images))]
        cluster_result = perform_clustering(dist_matrix, image_names)

        assert cluster_result['success'], f"Clustering failed: {cluster_result.get('error')}"
        assert 'tree' in cluster_result
        assert 'linkage_matrix' in cluster_result

        print(f"  ✓ Clustered {len(test_images)} images")
        print(f"  ✓ Tree structure has {count_nodes(cluster_result['tree'])} nodes")
        return True

    finally:
        for img in test_images:
            os.unlink(img)


def count_nodes(tree):
    """Recursively count nodes in tree"""
    if tree.get('isLeaf'):
        return 1
    return 1 + sum(count_nodes(child) for child in tree.get('children', []))


def test_json_interface():
    """Test the JSON stdin/stdout interface"""
    print("Testing JSON interface...")

    # Test ping command
    from main import handle_command
    import io
    from contextlib import redirect_stdout

    output = io.StringIO()
    with redirect_stdout(output):
        command_data = {'command': 'ping'}
        handle_command(command_data)

    result_line = output.getvalue().strip()
    result = json.loads(result_line)

    assert result['type'] == 'result'
    assert result['data']['success'] == True
    assert result['data']['message'] == 'pong'

    print("  ✓ JSON interface working")
    return True


def main():
    """Run all tests"""
    print("=" * 50)
    print("CADS Python Backend Tests")
    print("=" * 50)
    print()

    tests = [
        ("Feature Detection", test_feature_detection),
        ("Feature Matching", test_feature_matching),
        ("Hierarchical Clustering", test_clustering),
        ("JSON Interface", test_json_interface),
    ]

    passed = 0
    failed = 0

    for name, test_func in tests:
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
                print(f"  ✗ {name} failed")
        except Exception as e:
            failed += 1
            print(f"  ✗ {name} failed with error: {e}")
            import traceback
            traceback.print_exc()

    print()
    print("=" * 50)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 50)

    return 0 if failed == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
