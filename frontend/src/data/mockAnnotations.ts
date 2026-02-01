import { AnnotationData } from '../types/annotations';

export const mockAnnotations: AnnotationData = {
  metadata: {
    videoWidth: 1920,
    videoHeight: 1080,
    frameRate: 30,
  },
  frames: [
    // Pre-snap formation (0.0 - 1.0s)
    {
      timestamp: 0.0,
      players: [
        { id: 'qb', x: 50, y: 55, label: 'QB', highlight: true, color: '#FFD700' },
        { id: 'rb', x: 45, y: 62, label: 'RB', highlight: false, color: '#4CAF50' },
        { id: 'wr1', x: 20, y: 45, label: 'WR', highlight: false, color: '#2196F3' },
        { id: 'wr2', x: 80, y: 45, label: 'WR', highlight: false, color: '#2196F3' },
        { id: 'te', x: 35, y: 52, label: 'TE', highlight: false, color: '#9C27B0' },
      ],
      arrows: [],
      terminology: [
        { x: 75, y: 8, term: 'I-Formation', definition: 'Quarterback under center with fullback and running back aligned behind', duration: 1.5 },
      ],
    },
    {
      timestamp: 0.5,
      players: [
        { id: 'qb', x: 50, y: 55, label: 'QB', highlight: true, color: '#FFD700' },
        { id: 'rb', x: 45, y: 62, label: 'RB', highlight: false, color: '#4CAF50' },
        { id: 'wr1', x: 20, y: 44, label: 'WR', highlight: false, color: '#2196F3' },
        { id: 'wr2', x: 80, y: 44, label: 'WR', highlight: false, color: '#2196F3' },
        { id: 'te', x: 35, y: 52, label: 'TE', highlight: false, color: '#9C27B0' },
      ],
      arrows: [],
      terminology: [],
    },

    // Snap and play action fake (1.0 - 2.0s)
    {
      timestamp: 1.0,
      players: [
        { id: 'qb', x: 50, y: 54, label: 'QB', highlight: true, color: '#FFD700' },
        { id: 'rb', x: 46, y: 60, label: 'RB', highlight: true, color: '#4CAF50' },
        { id: 'wr1', x: 18, y: 42, label: 'WR', highlight: false, color: '#2196F3' },
        { id: 'wr2', x: 82, y: 42, label: 'WR', highlight: false, color: '#2196F3' },
        { id: 'te', x: 36, y: 50, label: 'TE', highlight: false, color: '#9C27B0' },
      ],
      arrows: [],
      terminology: [
        { x: 75, y: 8, term: 'Play Action', definition: 'Fake handoff to freeze the defense before passing', duration: 1.5 },
      ],
    },
    {
      timestamp: 1.5,
      players: [
        { id: 'qb', x: 50, y: 52, label: 'QB', highlight: true, color: '#FFD700' },
        { id: 'rb', x: 48, y: 58, label: 'RB', highlight: true, color: '#4CAF50' },
        { id: 'wr1', x: 16, y: 39, label: 'WR', highlight: false, color: '#2196F3' },
        { id: 'wr2', x: 84, y: 39, label: 'WR', highlight: false, color: '#2196F3' },
        { id: 'te', x: 38, y: 48, label: 'TE', highlight: false, color: '#9C27B0' },
      ],
      arrows: [
        { from: [50, 54], to: [48, 58], color: '#FFD700', label: 'Fake' },
      ],
      terminology: [],
    },

    // QB drops back, WRs running routes (2.0 - 3.0s)
    {
      timestamp: 2.0,
      players: [
        { id: 'qb', x: 51, y: 50, label: 'QB', highlight: true, color: '#FFD700' },
        { id: 'rb', x: 52, y: 60, label: 'RB', highlight: false, color: '#4CAF50' },
        { id: 'wr1', x: 14, y: 35, label: 'WR', highlight: false, color: '#2196F3' },
        { id: 'wr2', x: 86, y: 36, label: 'WR', highlight: false, color: '#2196F3' },
        { id: 'te', x: 42, y: 44, label: 'TE', highlight: false, color: '#9C27B0' },
      ],
      arrows: [],
      terminology: [
        { x: 75, y: 8, term: 'Go Route', definition: 'Wide receiver runs straight down the field at full speed', duration: 1.5 },
      ],
    },
    {
      timestamp: 2.5,
      players: [
        { id: 'qb', x: 52, y: 49, label: 'QB', highlight: true, color: '#FFD700' },
        { id: 'rb', x: 54, y: 62, label: 'RB', highlight: false, color: '#4CAF50' },
        { id: 'wr1', x: 12, y: 30, label: 'WR', highlight: true, color: '#2196F3' },
        { id: 'wr2', x: 88, y: 33, label: 'WR', highlight: false, color: '#2196F3' },
        { id: 'te', x: 46, y: 40, label: 'TE', highlight: false, color: '#9C27B0' },
      ],
      arrows: [
        { from: [52, 49], to: [12, 30], color: '#FF6B6B', label: 'Pass', dashed: true },
      ],
      terminology: [],
    },

    // Ball in air, WR making catch (3.0 - 4.0s)
    {
      timestamp: 3.0,
      players: [
        { id: 'qb', x: 52, y: 48, label: 'QB', highlight: false, color: '#FFD700' },
        { id: 'rb', x: 55, y: 64, label: 'RB', highlight: false, color: '#4CAF50' },
        { id: 'wr1', x: 10, y: 26, label: 'WR', highlight: true, color: '#2196F3' },
        { id: 'wr2', x: 90, y: 30, label: 'WR', highlight: false, color: '#2196F3' },
        { id: 'te', x: 50, y: 36, label: 'TE', highlight: false, color: '#9C27B0' },
      ],
      arrows: [
        { from: [52, 48], to: [10, 26], color: '#FF6B6B', dashed: true },
      ],
      terminology: [],
    },
    {
      timestamp: 3.5,
      players: [
        { id: 'qb', x: 53, y: 49, label: 'QB', highlight: false, color: '#FFD700' },
        { id: 'rb', x: 57, y: 65, label: 'RB', highlight: false, color: '#4CAF50' },
        { id: 'wr1', x: 9, y: 22, label: 'WR', highlight: true, color: '#2196F3' },
        { id: 'wr2', x: 91, y: 28, label: 'WR', highlight: false, color: '#2196F3' },
        { id: 'te', x: 52, y: 34, label: 'TE', highlight: false, color: '#9C27B0' },
      ],
      arrows: [
        { from: [10, 26], to: [9, 22], color: '#2196F3' },
      ],
      terminology: [
        { x: 75, y: 8, term: 'Completion', definition: 'Successful pass caught by the receiver', duration: 1.5 },
      ],
    },

    // After catch, WR running (4.0 - 5.0s)
    {
      timestamp: 4.0,
      players: [
        { id: 'qb', x: 54, y: 50, label: 'QB', highlight: false, color: '#FFD700' },
        { id: 'rb', x: 58, y: 66, label: 'RB', highlight: false, color: '#4CAF50' },
        { id: 'wr1', x: 8, y: 18, label: 'WR', highlight: true, color: '#2196F3' },
        { id: 'wr2', x: 92, y: 27, label: 'WR', highlight: false, color: '#2196F3' },
        { id: 'te', x: 54, y: 33, label: 'TE', highlight: false, color: '#9C27B0' },
      ],
      arrows: [],
      terminology: [],
    },
    {
      timestamp: 4.5,
      players: [
        { id: 'qb', x: 54, y: 51, label: 'QB', highlight: false, color: '#FFD700' },
        { id: 'rb', x: 59, y: 67, label: 'RB', highlight: false, color: '#4CAF50' },
        { id: 'wr1', x: 7, y: 14, label: 'WR', highlight: true, color: '#2196F3' },
        { id: 'wr2', x: 93, y: 26, label: 'WR', highlight: false, color: '#2196F3' },
        { id: 'te', x: 55, y: 32, label: 'TE', highlight: false, color: '#9C27B0' },
      ],
      arrows: [],
      terminology: [
        { x: 75, y: 8, term: 'YAC', definition: 'Yards After Catch - receiver gains extra yards after the reception', duration: 1.5 },
      ],
    },

    // Tackle / end of play (5.0 - 6.0s)
    {
      timestamp: 5.0,
      players: [
        { id: 'qb', x: 55, y: 52, label: 'QB', highlight: false, color: '#FFD700' },
        { id: 'rb', x: 60, y: 68, label: 'RB', highlight: false, color: '#4CAF50' },
        { id: 'wr1', x: 6, y: 11, label: 'WR', highlight: true, color: '#2196F3' },
        { id: 'wr2', x: 93, y: 25, label: 'WR', highlight: false, color: '#2196F3' },
        { id: 'te', x: 56, y: 31, label: 'TE', highlight: false, color: '#9C27B0' },
      ],
      arrows: [],
      terminology: [],
    },
    {
      timestamp: 5.5,
      players: [
        { id: 'qb', x: 55, y: 53, label: 'QB', highlight: false, color: '#FFD700' },
        { id: 'rb', x: 60, y: 68, label: 'RB', highlight: false, color: '#4CAF50' },
        { id: 'wr1', x: 5, y: 9, label: 'WR', highlight: true, color: '#2196F3' },
        { id: 'wr2', x: 93, y: 25, label: 'WR', highlight: false, color: '#2196F3' },
        { id: 'te', x: 56, y: 31, label: 'TE', highlight: false, color: '#9C27B0' },
      ],
      arrows: [],
      terminology: [
        { x: 75, y: 8, term: 'First Down', definition: 'Offense gains enough yards for a new set of downs', duration: 2.0 },
      ],
    },
    {
      timestamp: 6.0,
      players: [
        { id: 'qb', x: 55, y: 53, label: 'QB', highlight: false, color: '#FFD700' },
        { id: 'rb', x: 60, y: 68, label: 'RB', highlight: false, color: '#4CAF50' },
        { id: 'wr1', x: 5, y: 8, label: 'WR', highlight: true, color: '#2196F3' },
        { id: 'wr2', x: 93, y: 25, label: 'WR', highlight: false, color: '#2196F3' },
        { id: 'te', x: 56, y: 31, label: 'TE', highlight: false, color: '#9C27B0' },
      ],
      arrows: [],
      terminology: [],
    },
  ],
};
