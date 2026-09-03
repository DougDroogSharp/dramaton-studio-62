/**
 * Test Scene Generator for POSE_MOVE and ZORDER Command Testing
 * 
 * This utility creates test actors with animation frames and scenes
 * that demonstrate the new functionality.
 */

import { Actor, ActorAnimation, AnimationFrame, Scene, StageElement, GameData, ActorGraphic } from '@/types';

// Generate a simple colored rectangle as a placeholder frame
const generatePlaceholderFrame = (color: string, label: string, size = 128): string => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size * 1.5; // Taller for character proportions
  const ctx = canvas.getContext('2d')!;
  
  // Body
  ctx.fillStyle = color;
  ctx.fillRect(size * 0.2, size * 0.3, size * 0.6, size * 1.1);
  
  // Head
  ctx.beginPath();
  ctx.arc(size / 2, size * 0.2, size * 0.18, 0, Math.PI * 2);
  ctx.fill();
  
  // Label
  ctx.fillStyle = '#fff';
  ctx.font = `${size * 0.12}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(label, size / 2, size * 0.9);
  
  return canvas.toDataURL('image/png');
};

// Generate walk cycle frames (4 frames)
const generateWalkCycleFrames = (color: string, direction: 'left' | 'right'): AnimationFrame[] => {
  const labels = ['L1', 'L2', 'R1', 'R2'];
  return labels.map((label, i) => ({
    id: `frame_${direction}_${i}`,
    frameIndex: i,
    image: generatePlaceholderFrame(color, `${direction.toUpperCase()}\n${label}`),
    duration: 150, // 150ms per frame
  }));
};

// Generate run cycle frames (6 frames, faster)
const generateRunCycleFrames = (color: string, direction: 'left' | 'right'): AnimationFrame[] => {
  const labels = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'];
  return labels.map((label, i) => ({
    id: `run_frame_${direction}_${i}`,
    frameIndex: i,
    image: generatePlaceholderFrame(color, `RUN\n${label}`),
    duration: 100, // Faster for running
  }));
};

// Generate transition/morph frames (3 frames)
const generateTransitionFrames = (color: string): AnimationFrame[] => {
  return [1, 2, 3].map((i) => ({
    id: `transition_${i}`,
    frameIndex: i - 1,
    image: generatePlaceholderFrame(color, `MORPH\n${i}`),
    duration: 100,
  }));
};

// Create a test actor with full animation library
export const createTestActor = (
  id: string,
  name: string,
  color: string
): Actor => {
  // Create pose graphics
  const graphics: ActorGraphic[] = [
    {
      id: `${id}_standing`,
      pose: 'Standing',
      expression: 'Neutral',
      angle: 0,
      image: generatePlaceholderFrame(color, 'STAND'),
    },
    {
      id: `${id}_walking`,
      pose: 'Walking',
      expression: 'Neutral',
      angle: 0,
      image: generatePlaceholderFrame(color, 'WALK'),
    },
    {
      id: `${id}_happy`,
      pose: 'Standing',
      expression: 'Happy',
      angle: 0,
      image: generatePlaceholderFrame(color, 'HAPPY'),
    },
  ];

  // Create animations
  const animations: ActorAnimation[] = [
    {
      id: `${id}_walk_left`,
      name: 'walk_left',
      gait: 'walk',
      direction: 'left',
      frames: generateWalkCycleFrames(color, 'left'),
      transitionFrames: generateTransitionFrames(color),
    },
    {
      id: `${id}_walk_right`,
      name: 'walk_right',
      gait: 'walk',
      direction: 'right',
      frames: generateWalkCycleFrames(color, 'right'),
      transitionFrames: generateTransitionFrames(color),
    },
    {
      id: `${id}_run_left`,
      name: 'run_left',
      gait: 'run',
      direction: 'left',
      frames: generateRunCycleFrames(color, 'left'),
      transitionFrames: generateTransitionFrames(color),
    },
    {
      id: `${id}_run_right`,
      name: 'run_right',
      gait: 'run',
      direction: 'right',
      frames: generateRunCycleFrames(color, 'right'),
      transitionFrames: generateTransitionFrames(color),
    },
  ];

  return {
    id,
    name,
    graphics,
    animations,
    status: 'work',
    note: `Test actor with ${animations.length} animation sequences`,
  };
};

// Create test scene with POSE_MOVE demo script
export const createPoseMoveTestScene = (): Scene => {
  // Stage elements must exist for ENTER commands to make them visible
  const stage: StageElement[] = [
    {
      id: 'stage_hero',
      assetId: 'hero',
      type: 'ACTOR',
      x: 15,
      y: 70,
      scale: 1,
      zIndex: 1,
      rotation: 0,
      pose: 'Standing',
      expression: 'Neutral',
      spriteAngle: 0,
    },
    {
      id: 'stage_sidekick',
      assetId: 'sidekick',
      type: 'ACTOR',
      x: 85,
      y: 70,
      scale: 0.8,
      zIndex: 2,
      rotation: 0,
      pose: 'Standing',
      expression: 'Neutral',
      spriteAngle: 0,
    },
  ];
  
  const script = `// ===== POSE_MOVE TEST SCENE =====
// This scene demonstrates the POSE_MOVE command
// with locomotion cycles, transitions, and final poses

// --- Setup: Enter actors at starting positions ---
// Format: [ENTER actor at x,y z pose expression angle]
[ENTER hero at 15,70 1 Standing Neutral 0]
[ENTER sidekick at 85,70 2 Standing Neutral 0]
[WAIT 1s]

// --- Test 1: Basic walk movement ---
[DIALOGUE narrator]
Test 1: Hero walks right using walk cycle
[POSE_MOVE hero to 50,70 walk Standing Neutral over 2s]
[WAIT 0.5s]

// --- Test 2: Walk with expression change ---
[DIALOGUE narrator]
Test 2: Sidekick walks left, ends Happy
[POSE_MOVE sidekick to 50,70 walk Standing Happy over 2s]
[WAIT 0.5s]

// --- Test 3: Run movement (faster gait) ---
[DIALOGUE narrator]
Test 3: Hero runs to the right
[POSE_MOVE hero to 85,70 run Standing Neutral over 1.5s]
[WAIT 0.5s]

// --- Test 4: Simultaneous movements ---
[DIALOGUE narrator]
Test 4: Both actors move at once
[POSE_MOVE hero to 30,70 walk Walking Neutral over 2s]
[POSE_MOVE sidekick to 70,70 walk Walking Happy over 2s]
[WAIT 2.5s]

// --- Test 5: Short distance (tests timing) ---
[DIALOGUE narrator]
Test 5: Short walk (timing adjustment)
[POSE_MOVE hero to 40,70 walk Standing Neutral over 1s]
[WAIT 1s]

// --- Cleanup ---
[DIALOGUE narrator]
POSE_MOVE test complete!
[WAIT 2s]
`;

  return {
    id: 'scene_pose_move_test',
    name: 'POSE_MOVE Test Scene',
    sceneType: 'test',
    stage,
    script,
    status: 'work',
    note: 'Automated test scene for POSE_MOVE command verification',
    tags: ['test', 'pose_move', 'animation'],
  };
};

// Create test scene for ZORDER commands
export const createZOrderTestScene = (): Scene => {
  // Stage elements for ZORDER testing - 4 overlapping actors
  const stage: StageElement[] = [
    {
      id: 'stage_actor_a',
      assetId: 'actor_a',
      type: 'ACTOR',
      x: 35,
      y: 60,
      scale: 0.9,
      zIndex: 1,
      rotation: 0,
      pose: 'Standing',
      expression: 'Neutral',
      spriteAngle: 0,
    },
    {
      id: 'stage_actor_b',
      assetId: 'actor_b',
      type: 'ACTOR',
      x: 45,
      y: 60,
      scale: 0.9,
      zIndex: 2,
      rotation: 0,
      pose: 'Standing',
      expression: 'Neutral',
      spriteAngle: 0,
    },
    {
      id: 'stage_actor_c',
      assetId: 'actor_c',
      type: 'ACTOR',
      x: 55,
      y: 60,
      scale: 0.9,
      zIndex: 3,
      rotation: 0,
      pose: 'Standing',
      expression: 'Neutral',
      spriteAngle: 0,
    },
    {
      id: 'stage_actor_d',
      assetId: 'actor_d',
      type: 'ACTOR',
      x: 65,
      y: 60,
      scale: 0.9,
      zIndex: 4,
      rotation: 0,
      pose: 'Standing',
      expression: 'Neutral',
      spriteAngle: 0,
    },
  ];

  const script = `// ===== ZORDER TEST SCENE =====
// This scene demonstrates all ZORDER options

// --- Setup: Enter 4 overlapping actors ---
// Format: [ENTER actor at x,y z pose expression angle]
[ENTER actor_a at 35,60 1 Standing Neutral 0]
[ENTER actor_b at 45,60 2 Standing Neutral 0]
[ENTER actor_c at 55,60 3 Standing Neutral 0]
[ENTER actor_d at 65,60 4 Standing Neutral 0]
[WAIT 1s]

// --- Test relative positioning ---
[DIALOGUE narrator]
Initial order: A, B, C, D (back to front)
[WAIT 2s]

[DIALOGUE narrator]
Moving A forward one layer...
[ZORDER actor_a forward]
[WAIT 1s]

[DIALOGUE narrator]
Moving D back one layer...
[ZORDER actor_d back]
[WAIT 1s]

// --- Test absolute positioning ---
[DIALOGUE narrator]
Moving B to TOP (front-most)
[ZORDER actor_b top]
[WAIT 1s]

[DIALOGUE narrator]
Moving C to BOTTOM (back-most)
[ZORDER actor_c bottom]
[WAIT 1s]

// --- Test synonyms ---
[DIALOGUE narrator]
Using "last" (same as top) on A
[ZORDER actor_a last]
[WAIT 1s]

[DIALOGUE narrator]
Using "first" (same as bottom) on D
[ZORDER actor_d first]
[WAIT 1s]

[DIALOGUE narrator]
ZORDER test complete!
[WAIT 2s]
`;

  return {
    id: 'scene_zorder_test',
    name: 'ZORDER Test Scene',
    sceneType: 'test',
    stage,
    script,
    status: 'work',
    note: 'Automated test scene for ZORDER command verification',
    tags: ['test', 'zorder', 'layering'],
  };
};

// Add test data to existing game
export const addTestDataToGame = (game: GameData): GameData => {
  // Create test actors if they don't exist
  const testActors: Actor[] = [
    createTestActor('hero', 'Hero', '#3b82f6'),      // Blue
    createTestActor('sidekick', 'Sidekick', '#22c55e'), // Green
    createTestActor('actor_a', 'Actor A', '#ef4444'),   // Red
    createTestActor('actor_b', 'Actor B', '#f59e0b'),   // Amber
    createTestActor('actor_c', 'Actor C', '#8b5cf6'),   // Purple
    createTestActor('actor_d', 'Actor D', '#ec4899'),   // Pink
  ];

  // Filter out actors that already exist
  const existingActorIds = new Set(game.actors.map(a => a.id));
  const newActors = testActors.filter(a => !existingActorIds.has(a.id));

  // Create test scenes
  const testScenes: Scene[] = [
    createPoseMoveTestScene(),
    createZOrderTestScene(),
  ];

  // Filter out scenes that already exist
  const existingSceneIds = new Set(game.scenes.map(s => s.id));
  const newScenes = testScenes.filter(s => !existingSceneIds.has(s.id));

  // Add new scenes to current episode
  const currentEpisodeId = game.info.currentEpisodeId;
  const updatedEpisodes = game.episodes.map(ep => {
    if (ep.id === currentEpisodeId) {
      return {
        ...ep,
        sceneIds: [...ep.sceneIds, ...newScenes.map(s => s.id)],
      };
    }
    return ep;
  });

  return {
    ...game,
    actors: [...game.actors, ...newActors],
    scenes: [...game.scenes, ...newScenes],
    episodes: updatedEpisodes,
  };
};

// Console utility for manual testing
export const logTestInstructions = () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           POSE_MOVE & ZORDER Test Utility                    ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  To add test data, run in browser console:                   ║
║                                                              ║
║    import { addTestDataToGame } from                         ║
║      '@/utils/testSceneGenerator';                           ║
║                                                              ║
║  Or use the "Add Test Scenes" button in Settings.            ║
║                                                              ║
║  Test Scenes Created:                                        ║
║    1. POSE_MOVE Test Scene - Tests walk/run animations       ║
║    2. ZORDER Test Scene - Tests all layer positioning        ║
║                                                              ║
║  Test Actors Created:                                        ║
║    - hero, sidekick (for POSE_MOVE)                          ║
║    - actor_a, actor_b, actor_c, actor_d (for ZORDER)         ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
};
