"""
Hierarchical clustering using AGNES (Agglomerative Nesting)
This implements the same clustering algorithm as the original CADS
"""

import numpy as np
from scipy.cluster.hierarchy import linkage, to_tree
from scipy.spatial.distance import squareform
from typing import List, Dict, Any


def perform_clustering(distance_matrix: List[List[float]], image_names: List[str]) -> Dict[str, Any]:
    """
    Perform hierarchical clustering using AGNES with complete linkage

    Args:
        distance_matrix: 2D symmetric distance matrix
        image_names: List of image names corresponding to matrix indices

    Returns:
        Dictionary containing dendrogram tree structure for visualization
    """
    try:
        # Convert to numpy array
        dist_array = np.array(distance_matrix)

        # Convert to condensed distance matrix (required by scipy)
        # squareform converts square matrix to condensed form
        condensed_dist = squareform(dist_array)

        # Perform hierarchical clustering using complete linkage
        # This is the same method used in the original CADS (AGNES algorithm)
        linkage_matrix = linkage(condensed_dist, method='complete')

        # Convert linkage matrix to tree structure
        root_node = to_tree(linkage_matrix)

        # Build dendrogram tree structure for D3.js visualization
        tree = build_tree_structure(root_node, image_names, len(image_names))

        return {
            'success': True,
            'tree': tree,
            'linkage_matrix': linkage_matrix.tolist()
        }

    except Exception as e:
        return {
            'success': False,
            'error': f'Clustering failed: {str(e)}'
        }


def build_tree_structure(node, image_names: List[str], n_samples: int) -> Dict[str, Any]:
    """
    Recursively build tree structure from scipy hierarchy

    Args:
        node: scipy ClusterNode object
        image_names: List of original image names
        n_samples: Number of original samples

    Returns:
        Tree structure dict compatible with D3.js hierarchy
    """
    # If this is a leaf node (original sample)
    if node.is_leaf():
        return {
            'name': image_names[node.id],
            'id': node.id,
            'distance': 0,
            'isLeaf': True
        }

    # Internal node - recursively build children
    left_child = build_tree_structure(node.left, image_names, n_samples)
    right_child = build_tree_structure(node.right, image_names, n_samples)

    return {
        'name': f'Cluster {node.id - n_samples}',
        'id': node.id,
        'distance': float(node.dist),
        'isLeaf': False,
        'children': [left_child, right_child]
    }


def get_clusters_at_threshold(linkage_matrix: List[List[float]],
                               threshold: float,
                               image_names: List[str]) -> List[List[str]]:
    """
    Get flat cluster assignments at a given distance threshold

    Args:
        linkage_matrix: The linkage matrix from hierarchical clustering
        threshold: Distance threshold for cutting the dendrogram
        image_names: List of image names

    Returns:
        List of clusters, where each cluster is a list of image names
    """
    from scipy.cluster.hierarchy import fcluster

    try:
        # Get cluster labels for each sample
        labels = fcluster(np.array(linkage_matrix), threshold, criterion='distance')

        # Group images by cluster label
        clusters = {}
        for idx, label in enumerate(labels):
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(image_names[idx])

        # Convert to list of clusters
        return list(clusters.values())

    except Exception as e:
        print(f'Error getting clusters at threshold: {e}')
        return []
