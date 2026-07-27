<script lang="ts">
  import { useThrelte, useTask } from '@threlte/core';
  import { onMount } from 'svelte';
  import { Euler, Vector3 } from 'three';
  import { terrainHeight } from '../shaders/noise';
  import { bridgeDeckY } from '../bridge';

  let { walk = 13, sprint = 26, eye = 4.2, jumpV = 14, gravity = 32 } = $props();

  const { camera, renderer, invalidate } = useThrelte();

  const keys = new Set<string>();
  const euler = new Euler(0, 0, 0, 'YXZ');
  let locked = false;
  let flying = false;

  let vy = 0;
  let grounded = false;

  const fwd = new Vector3();
  const right = new Vector3();
  const up = new Vector3(0, 1, 0);
  const move = new Vector3();

  function onMouseMove(e: MouseEvent) {
    if (!locked) return;
    euler.setFromQuaternion(camera.current.quaternion);
    euler.y -= e.movementX * 0.0022;
    euler.x -= e.movementY * 0.0022;
    euler.x = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, euler.x));
    camera.current.quaternion.setFromEuler(euler);
    invalidate();
  }

  onMount(() => {
    const dom = renderer.domElement;
    const requestLock = () => dom.requestPointerLock();
    const onLockChange = () => (locked = document.pointerLockElement === dom);
    const kd = (e: KeyboardEvent) => {
      if (e.code === 'KeyF' && !keys.has('KeyF')) flying = !flying; // toggle fly
      keys.add(e.code);
    };
    const ku = (e: KeyboardEvent) => keys.delete(e.code);
    dom.addEventListener('click', requestLock);
    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => {
      dom.removeEventListener('click', requestLock);
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  });

  useTask((delta) => {
    const dt = Math.min(delta, 0.05);
    const cam = camera.current;
    const fast = keys.has('ShiftLeft') || keys.has('ShiftRight');

    if (flying) {
      // free flight: move along the full look direction, no gravity
      cam.getWorldDirection(fwd);
      right.crossVectors(fwd, up).normalize();
      move.set(0, 0, 0);
      if (keys.has('KeyW')) move.add(fwd);
      if (keys.has('KeyS')) move.sub(fwd);
      if (keys.has('KeyD')) move.add(right);
      if (keys.has('KeyA')) move.sub(right);
      if (keys.has('Space')) move.add(up);
      if (keys.has('KeyC') || keys.has('ControlLeft')) move.sub(up);
      const speed = (fast ? sprint : walk) * 1.8;
      if (move.lengthSq() > 0) cam.position.addScaledVector(move.normalize(), speed * dt);
      vy = 0;
      grounded = false;
      invalidate();
      return;
    }

    // walking: horizontal movement relative to look yaw only
    cam.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    right.crossVectors(fwd, up).normalize();

    move.set(0, 0, 0);
    if (keys.has('KeyW')) move.add(fwd);
    if (keys.has('KeyS')) move.sub(fwd);
    if (keys.has('KeyD')) move.add(right);
    if (keys.has('KeyA')) move.sub(right);

    const speed = fast ? sprint : walk;
    if (move.lengthSq() > 0) cam.position.addScaledVector(move.normalize(), speed * dt);

    // gravity + jump, land on the terrain (or on the bridge deck if over it)
    const deck = bridgeDeckY(cam.position.x, cam.position.z);
    const gy = terrainHeight(cam.position.x, cam.position.z);
    const groundY = (deck !== null ? Math.max(deck, gy) : gy) + eye;
    if (grounded && keys.has('Space')) {
      vy = jumpV;
      grounded = false;
    }
    vy -= gravity * dt;
    cam.position.y += vy * dt;
    if (cam.position.y <= groundY) {
      cam.position.y = groundY;
      vy = 0;
      grounded = true;
    }

    invalidate();
  });
</script>
