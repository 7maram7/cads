#!/usr/bin/env python3
"""
CADS Python Backend - Main Entry Point
Handles JSON-based IPC communication with Electron frontend
"""

import sys
import json
import os
from typing import Dict, Any, List
from feature_detection import FeatureDetector
from clustering import perform_clustering


def send_message(msg: Dict[str, Any]):
    """Send JSON message to stdout for Electron to read"""
    try:
        json_str = json.dumps(msg)
        print(json_str, flush=True)
    except Exception as e:
        # Fallback error message
        error_msg = json.dumps({
            'type': 'error',
            'message': f'Failed to serialize message: {str(e)}'
        })
        print(error_msg, flush=True)


def send_progress(current: int, total: int, message: str):
    """Send progress update to frontend"""
    send_message({
        'type': 'progress',
        'current': current,
        'total': total,
        'message': message
    })


def send_error(message: str):
    """Send error message to frontend"""
    send_message({
        'type': 'error',
        'message': message
    })


def send_result(data: Dict[str, Any]):
    """Send final result to frontend"""
    send_message({
        'type': 'result',
        'data': data
    })


def analyze_images(image_paths: List[str]) -> Dict[str, Any]:
    """
    Main analysis pipeline: detect features, compute distances, perform clustering

    Args:
        image_paths: List of absolute paths to image files

    Returns:
        Dictionary containing features and clustering results
    """
    detector = FeatureDetector(n_features=1000)

    # Step 1: Detect features in all images
    send_progress(0, len(image_paths), 'Starting feature detection...')

    features_list = []
    image_names = []

    for idx, image_path in enumerate(image_paths):
        # Extract just the filename for display
        image_name = os.path.basename(image_path)
        send_progress(idx + 1, len(image_paths), f'Detecting features: {image_name}')

        result = detector.detect_features(image_path)

        if not result['success']:
            send_error(result['error'])
            continue

        features_list.append(result)
        image_names.append(image_name)

    if len(features_list) == 0:
        return {
            'success': False,
            'error': 'No features detected in any images'
        }

    # Step 2: Compute pairwise distance matrix with progress tracking
    n = len(features_list)
    total_pairs = (n * (n - 1)) // 2
    send_progress(0, total_pairs, 'Computing pairwise distances...')

    # Compute distances with progress updates
    distance_matrix = [[0.0] * n for _ in range(n)]
    pair_count = 0

    for i in range(n):
        for j in range(i + 1, n):
            desc1 = features_list[i]['descriptors']
            desc2 = features_list[j]['descriptors']

            distance = detector.match_features(desc1, desc2)
            distance_matrix[i][j] = distance
            distance_matrix[j][i] = distance

            pair_count += 1
            # Send progress every 50 pairs to avoid flooding
            if pair_count % 50 == 0 or pair_count == total_pairs:
                send_progress(pair_count, total_pairs,
                            f'Comparing images: {pair_count}/{total_pairs} pairs')

    send_progress(total_pairs, total_pairs, 'Distance computation complete')

    # Step 3: Perform hierarchical clustering
    send_progress(0, 1, 'Performing hierarchical clustering...')

    clustering_result = perform_clustering(distance_matrix, image_names)

    if not clustering_result['success']:
        return clustering_result

    send_progress(1, 1, 'Clustering complete')

    # Step 4: Prepare final results
    return {
        'success': True,
        'features': [
            {
                'name': image_names[i],
                'path': image_paths[i],
                'num_features': features_list[i]['num_features'],
                'descriptors': features_list[i]['descriptors'],
                'keypoints': features_list[i]['keypoints']
            }
            for i in range(len(features_list))
        ],
        'distance_matrix': distance_matrix,
        'clustering': clustering_result['tree'],
        'linkage_matrix': clustering_result['linkage_matrix']
    }


def handle_command(command_data: Dict[str, Any]):
    """
    Handle incoming command from Electron

    Args:
        command_data: Dictionary containing command and parameters
    """
    command = command_data.get('command')

    if command == 'analyze':
        image_paths = command_data.get('image_paths', [])

        if not image_paths:
            send_error('No image paths provided')
            return

        # Validate that files exist
        valid_paths = []
        for path in image_paths:
            if os.path.exists(path) and os.path.isfile(path):
                valid_paths.append(path)
            else:
                send_error(f'Image file not found: {path}')

        if not valid_paths:
            send_error('No valid image files found')
            return

        # Run analysis
        result = analyze_images(valid_paths)
        send_result(result)

    elif command == 'ping':
        # Health check
        send_result({'success': True, 'message': 'pong'})

    else:
        send_error(f'Unknown command: {command}')


def main():
    """Main entry point - read commands from stdin"""
    try:
        # Read input from stdin (single JSON object)
        input_data = sys.stdin.read()

        if not input_data.strip():
            send_error('No input data received')
            return

        # Parse JSON command
        command_data = json.loads(input_data)

        # Handle the command
        handle_command(command_data)

    except json.JSONDecodeError as e:
        send_error(f'Invalid JSON input: {str(e)}')
    except Exception as e:
        send_error(f'Unexpected error: {str(e)}')


if __name__ == '__main__':
    main()
