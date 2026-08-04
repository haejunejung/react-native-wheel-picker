import type { RefObject } from "react";
import { useCallback, useEffect, useRef } from "react";
import type { ViewProps } from "react-native";

import type { AnimatedRef, SharedValue } from "react-native-reanimated";
import type Animated from "react-native-reanimated";

import { DECELERATION_RATE, MIN_MOMENTUM_VELOCITY } from "./constants";

type MouseDragSession = {
  startClientY: number;
  startOffset: number;
  lastClientY: number;
  lastTime: number;
  velocity: number;
};

export type UseWheelPointerDragProps = {
  scrollViewRef: AnimatedRef<Animated.ScrollView>;
  offsetY: SharedValue<number>;
  optionItemHeight: number;
  optionCount: number;
  cancelSettle: () => void;
  scheduleSettle: () => void;
  pendingSyncRef: RefObject<boolean>;
  onTouchStart: () => void;
  onTouchEnd: () => void;
};

export const useWheelPointerDrag = ({
  scrollViewRef,
  offsetY,
  optionItemHeight,
  optionCount,
  cancelSettle,
  scheduleSettle,
  pendingSyncRef,
  onTouchStart,
  onTouchEnd,
}: UseWheelPointerDragProps) => {
  const mouseDragRef = useRef<MouseDragSession | null>(null);
  const momentumFrameRef = useRef<number | null>(null);

  const startMomentumScroll = useCallback(
    (initialVelocity: number) => {
      if (Math.abs(initialVelocity) < MIN_MOMENTUM_VELOCITY) {
        // Too slow to glide: the drag's own scroll events armed the settle timer, but
        // arming it once more costs nothing and does not rely on that.
        scheduleSettle();
        return;
      }

      const maxOffset = (optionCount - 1) * optionItemHeight;
      let position = offsetY.value;
      let velocity = initialVelocity;
      let lastTime = Date.now();

      const step = () => {
        momentumFrameRef.current = null;

        const now = Date.now();
        const dt = Math.max(now - lastTime, 1);
        lastTime = now;

        position = Math.min(Math.max(position + velocity * dt, 0), maxOffset);
        velocity *= Math.pow(DECELERATION_RATE, dt);
        scrollViewRef.current?.scrollTo({ y: position, animated: false });

        const hitEdge = position === 0 || position === maxOffset;
        if (hitEdge || Math.abs(velocity) < MIN_MOMENTUM_VELOCITY) {
          scheduleSettle();
          return;
        }

        momentumFrameRef.current = requestAnimationFrame(step);
      };

      momentumFrameRef.current = requestAnimationFrame(step);
    },
    [offsetY, optionItemHeight, optionCount, scheduleSettle, scrollViewRef],
  );

  const cancelMomentumScroll = useCallback(() => {
    if (momentumFrameRef.current === null) return;
    cancelAnimationFrame(momentumFrameRef.current);
    momentumFrameRef.current = null;
  }, []);

  const handlePointerDown = useCallback(
    (event: Parameters<NonNullable<ViewProps["onPointerDown"]>>[0]) => {
      // Touch pointers scroll natively in the browser; intercepting them would double-handle.
      if (event.nativeEvent.pointerType !== "mouse") return;

      cancelMomentumScroll();
      cancelSettle();
      onTouchStart();

      const clientY = event.nativeEvent.clientY;
      mouseDragRef.current = {
        startClientY: clientY,
        startOffset: offsetY.value,
        lastClientY: clientY,
        lastTime: Date.now(),
        velocity: 0,
      };
    },
    [cancelMomentumScroll, cancelSettle, onTouchStart, offsetY],
  );

  const handlePointerMove = useCallback(
    (event: Parameters<NonNullable<ViewProps["onPointerMove"]>>[0]) => {
      const drag = mouseDragRef.current;
      if (!drag) return;

      const clientY = event.nativeEvent.clientY;
      const now = Date.now();
      const dt = Math.max(now - drag.lastTime, 1);

      // The content follows the pointer, so the offset moves against it. The smoothing
      // keeps one jittery frame from deciding the whole momentum scroll.
      const instantVelocity = -(clientY - drag.lastClientY) / dt;
      drag.velocity = 0.8 * instantVelocity + 0.2 * drag.velocity;
      drag.lastClientY = clientY;
      drag.lastTime = now;

      // Absolute mapping from the drag origin — per-frame deltas would accumulate the
      // error of `offsetY` lagging the DOM by an event.
      scrollViewRef.current?.scrollTo({
        y: drag.startOffset - (clientY - drag.startClientY),
        animated: false,
      });
    },
    [scrollViewRef],
  );

  const handlePointerUp = useCallback(() => {
    const drag = mouseDragRef.current;
    if (!drag) return;

    mouseDragRef.current = null;

    // If the parent moved `value` mid-drag, the deferred sync owns the wheel now —
    // starting a momentum scroll on top of it would fight the corrective scroll.
    const hadPendingSync = pendingSyncRef.current;
    onTouchEnd();
    if (!hadPendingSync) startMomentumScroll(drag.velocity);
  }, [onTouchEnd, pendingSyncRef, startMomentumScroll]);

  const handlePointerLeave = handlePointerUp;

  useEffect(() => cancelMomentumScroll, [cancelMomentumScroll]);

  return { handlePointerDown, handlePointerMove, handlePointerUp, handlePointerLeave } as const;
};
