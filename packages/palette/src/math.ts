/** Calculates Euclidean distance between two points in 3D space. */
export const getEuclideanDistance = (v1: number[], v2: number[]): number => {
    return Math.sqrt(
        Math.pow(v1[0] - v2[0], 2) +
        Math.pow(v1[1] - v2[1], 2) +
        Math.pow(v1[2] - v2[2], 2)
    );
};
