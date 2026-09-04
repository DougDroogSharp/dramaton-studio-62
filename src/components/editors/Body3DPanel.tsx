// The actor editor's 3-D preview: one store model at the stage's standard
// height, feet on the ground, orbitable, playing one clip. Reports what it
// learned about the model (rig, height, clip names) so the Skin manifest can
// be filled in without a second parse.
//
// Filed 2026-09-02 22:07 -07:00 by EDITOR (actor-3d lane).

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { RigKind } from '@/types';
import {
  TARGET_H, boneNames, disposeModel, firstSkinnedMesh, groundAndScale,
  loadClips, loadModel, quatsOnly, rigKindFromScene,
} from '@/utils/rig3d';

export interface Body3DInfo {
  rig: RigKind;
  heightM: number;          // render height before scaling
  animations: string[];     // the model's own clips
  bones: string[];
}

export interface Body3DPanelProps {
  modelUrl: string;
  // Which clip to play: one of the model's own (by name) or a library clip
  // file (URL). Library wins when both are given. Nothing = rest pose.
  clipName?: string;
  clipUrl?: string;
  onLoaded?: (info: Body3DInfo) => void;
  onError?: (message: string) => void;
  className?: string;
}

export interface Body3DPanelHandle {
  // Render the current frame to a PNG data URL (transparent background).
  snapshot: () => string | null;
}

export const Body3DPanel = forwardRef<Body3DPanelHandle, Body3DPanelProps>(
  ({ modelUrl, clipName, clipUrl, onLoaded, onError, className }, ref) => {
    const hostRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const modelRef = useRef<THREE.Object3D | null>(null);
    const ownClipsRef = useRef<THREE.AnimationClip[]>([]);
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const [status, setStatus] = useState<string>('loading…');
    const onLoadedRef = useRef(onLoaded);
    const onErrorRef = useRef(onError);
    onLoadedRef.current = onLoaded;
    onErrorRef.current = onError;

    useImperativeHandle(ref, () => ({
      snapshot: () => {
        const r = rendererRef.current, s = sceneRef.current, c = cameraRef.current;
        if (!r || !s || !c) return null;
        r.render(s, c);
        return r.domElement.toDataURL('image/png');
      },
    }));

    // Scene, renderer, loop: once per mount.
    useEffect(() => {
      const host = hostRef.current;
      if (!host) return;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      host.appendChild(renderer.domElement);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';

      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xfff4e0, 0x3a3128, 1.6));
      const sun = new THREE.DirectionalLight(0xffffff, 1.4);
      sun.position.set(2.5, 4, 3);
      scene.add(sun);
      const grid = new THREE.GridHelper(2, 8, 0x8a7a4a, 0x3a3328);
      (grid.material as THREE.Material).transparent = true;
      (grid.material as THREE.Material).opacity = 0.35;
      scene.add(grid);

      const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 50);
      camera.position.set(0, TARGET_H * 0.62, 3.6);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, TARGET_H * 0.5, 0);
      controls.enablePan = false;
      controls.minDistance = 1.2;
      controls.maxDistance = 8;
      controls.update();

      rendererRef.current = renderer;
      sceneRef.current = scene;
      cameraRef.current = camera;

      const fit = () => {
        const w = host.clientWidth || 1, h = host.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      fit();
      const ro = new ResizeObserver(fit);
      ro.observe(host);

      const clock = new THREE.Clock();
      let raf = 0;
      const tick = () => {
        raf = requestAnimationFrame(tick);
        const dt = clock.getDelta();
        mixerRef.current?.update(dt);
        controls.update();
        renderer.render(scene, camera);
      };
      tick();

      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        controls.dispose();
        if (modelRef.current) { scene.remove(modelRef.current); disposeModel(modelRef.current); modelRef.current = null; }
        renderer.dispose();
        renderer.domElement.remove();
        rendererRef.current = null;
        sceneRef.current = null;
        cameraRef.current = null;
      };
    }, []);

    // Model: reload when the URL changes.
    useEffect(() => {
      let cancelled = false;
      const scene = sceneRef.current;
      if (!scene) return;
      setStatus('loading…');
      mixerRef.current = null;
      if (modelRef.current) { scene.remove(modelRef.current); disposeModel(modelRef.current); modelRef.current = null; }
      loadModel(modelUrl)
        .then(({ scene: model, animations }) => {
          if (cancelled) { disposeModel(model); return; }
          const heightM = groundAndScale(model);
          scene.add(model);
          modelRef.current = model;
          ownClipsRef.current = animations;
          const rig = rigKindFromScene(model);
          setStatus('');
          onLoadedRef.current?.({ rig, heightM, animations: animations.map(a => a.name), bones: boneNames(model) });
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const message = err instanceof Error ? err.message : String(err);
          setStatus(`could not load: ${message}`);
          onErrorRef.current?.(message);
        });
      return () => { cancelled = true; };
    }, [modelUrl]);

    // Clip: (re)bind when the choice changes or a model lands.
    const modelKey = modelRef.current ? modelUrl : '';
    useEffect(() => {
      let cancelled = false;
      const model = modelRef.current;
      if (!model) return;
      // Mixer root = the SkinnedMesh so "bones[x]" and bone-name tracks both bind.
      const root: THREE.Object3D = firstSkinnedMesh(model) ?? model;
      const play = (clip: THREE.AnimationClip) => {
        if (cancelled) return;
        mixerRef.current?.stopAllAction();
        const mixer = new THREE.AnimationMixer(root);
        mixer.clipAction(clip).reset().play();
        mixerRef.current = mixer;
      };
      if (clipUrl) {
        loadClips(clipUrl)
          .then(clips => { if (clips[0]) play(clips[0]); else setStatus('clip file has no animation'); })
          .catch((err: unknown) => setStatus(`clip failed: ${err instanceof Error ? err.message : String(err)}`));
      } else if (clipName) {
        const own = ownClipsRef.current.find(c => c.name === clipName);
        if (own) play(quatsOnly(own));
        else mixerRef.current = null;
      } else {
        mixerRef.current?.stopAllAction();
        mixerRef.current = null;
      }
      return () => { cancelled = true; };
    }, [clipUrl, clipName, modelKey, status]);

    // The canvas host has NO React children: three.js appends the canvas
    // itself, and React would wipe it (resetTextContent) while reconciling
    // the status overlay in and out. The overlay is a sibling.
    return (
      <div className={`relative ${className ?? ''}`}>
        <div ref={hostRef} className="absolute inset-0" />
        {status ? (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-diesel-steel pointer-events-none">
            {status}
          </div>
        ) : null}
      </div>
    );
  },
);
Body3DPanel.displayName = 'Body3DPanel';
