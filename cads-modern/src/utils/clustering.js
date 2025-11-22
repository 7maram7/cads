import { agnes } from 'ml-hclust';

/**
 * Perform hierarchical clustering on the distance matrix
 * Using AGNES (Agglomerative Nesting) algorithm - same as original CADS
 */
export function performClustering(distanceMatrix, features) {
  // Perform hierarchical clustering using complete linkage
  const clustering = agnes(distanceMatrix, {
    method: 'complete' // Same method as original CADS
  });

  // Convert clustering result to dendrogram format for D3
  const root = buildDendrogramTree(clustering, features);

  return root;
}

/**
 * Convert ml-hclust result to D3 hierarchy format
 */
function buildDendrogramTree(node, features, depth = 0) {
  if (node.isLeaf) {
    // Leaf node - this is an actual image
    return {
      imagePath: features[node.index].imagePath,
      index: node.index,
      keypointCount: features[node.index].keypoints.length,
      depth: depth
    };
  }

  // Internal node - has children
  const children = [];

  if (node.left) {
    children.push(buildDendrogramTree(node.left, features, depth + 1));
  }

  if (node.right) {
    children.push(buildDendrogramTree(node.right, features, depth + 1));
  }

  return {
    children: children,
    distance: node.height,
    depth: depth
  };
}

/**
 * Extract die groups from clustering at a given height threshold
 * This allows users to "cut" the dendrogram at different heights
 */
export function extractDieGroups(root, threshold) {
  const groups = [];

  function traverse(node, currentGroup) {
    if (!node) return;

    if (node.distance <= threshold || !node.children) {
      // This is a group
      const leaves = getLeafNodes(node);
      if (leaves.length > 0) {
        groups.push({
          id: groups.length,
          images: leaves.map(l => l.imagePath),
          similarity: node.distance || 0,
          size: leaves.length
        });
      }
    } else {
      // Keep traversing
      if (node.children) {
        node.children.forEach(child => traverse(child, currentGroup));
      }
    }
  }

  traverse(root, []);
  return groups;
}

/**
 * Get all leaf nodes from a subtree
 */
function getLeafNodes(node) {
  if (!node) return [];

  if (!node.children || node.children.length === 0) {
    // This is a leaf
    return [node];
  }

  // Recursively get leaves from children
  const leaves = [];
  node.children.forEach(child => {
    leaves.push(...getLeafNodes(child));
  });

  return leaves;
}

/**
 * Calculate dendrogram statistics
 */
export function getDendrogramStats(root) {
  let maxDepth = 0;
  let totalNodes = 0;
  let leafNodes = 0;

  function traverse(node, depth) {
    if (!node) return;

    totalNodes++;
    maxDepth = Math.max(maxDepth, depth);

    if (!node.children || node.children.length === 0) {
      leafNodes++;
    } else {
      node.children.forEach(child => traverse(child, depth + 1));
    }
  }

  traverse(root, 0);

  return {
    maxDepth,
    totalNodes,
    leafNodes,
    internalNodes: totalNodes - leafNodes
  };
}
