import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { fr } from '../../i18n/fr.ts';

export type SwipeDirection = 'left' | 'right';

interface SwipeCardProps {
  children: ReactNode;
  /** Set while the card flies away after an answer (buttons, keyboard or swipe). */
  exit: SwipeDirection | null;
  onSwipe: (direction: SwipeDirection) => void;
}

/** Movement before a press becomes a drag: below it, a tap still flips a target card. */
const DRAG_START_PX = 8;
/** A swipe counts past this distance, or when the card is thrown fast enough. */
const SWIPE_DISTANCE_PX = 110;
const SWIPE_MIN_FLING_PX = 40;
const SWIPE_VELOCITY = 0.5; // px per ms

interface Drag {
  pointerId: number;
  startX: number;
  startY: number;
  startTime: number;
  active: boolean;
}

/**
 * Swipeable card, with Pointer Events so touch and mouse share one code path.
 * Right = "je connais", left = "à réviser". Vertical moves are left to the page
 * scroll (`touch-action: pan-y`). Buttons and keys offer the same actions.
 */
export function SwipeCard({ children, exit, onSwipe }: SwipeCardProps) {
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (exit || (event.pointerType === 'mouse' && event.button !== 0)) return;
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTime: event.timeStamp,
      active: false,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (current?.pointerId !== event.pointerId) return;
    const moveX = event.clientX - current.startX;
    const moveY = event.clientY - current.startY;
    if (!current.active) {
      if (Math.abs(moveX) < DRAG_START_PX) return;
      // A mostly vertical move is a scroll, not a swipe.
      if (Math.abs(moveY) > Math.abs(moveX)) {
        drag.current = null;
        return;
      }
      current.active = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    setDx(moveX);
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const current = drag.current;
    if (current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (!current.active) return;
    // The click that follows a drag must not flip the card under the pointer.
    suppressClick.current = true;
    setDragging(false);

    const moveX = event.clientX - current.startX;
    const velocity = Math.abs(moveX) / Math.max(1, event.timeStamp - current.startTime);
    const swiped =
      !cancelled &&
      (Math.abs(moveX) > SWIPE_DISTANCE_PX ||
        (Math.abs(moveX) > SWIPE_MIN_FLING_PX && velocity > SWIPE_VELOCITY));
    if (swiped) onSwipe(moveX > 0 ? 'right' : 'left');
    else setDx(0);
  };

  const offset = exit === 'right' ? window.innerWidth : exit === 'left' ? -window.innerWidth : dx;
  const hint = Math.min(1, Math.abs(offset) / SWIPE_DISTANCE_PX);

  return (
    <div
      className={`swipe-card${dragging ? ' dragging' : ''}`}
      style={{ transform: `translateX(${String(offset)}px) rotate(${String(offset / 25)}deg)` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => {
        endDrag(event, false);
      }}
      onPointerCancel={(event) => {
        endDrag(event, true);
      }}
      onClickCapture={(event) => {
        if (suppressClick.current) {
          suppressClick.current = false;
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      {children}
      <span
        className="swipe-hint swipe-hint-known"
        aria-hidden="true"
        style={{ opacity: offset > 0 ? hint : 0 }}
      >
        {fr.quiz.known}
      </span>
      <span
        className="swipe-hint swipe-hint-review"
        aria-hidden="true"
        style={{ opacity: offset < 0 ? hint : 0 }}
      >
        {fr.quiz.review}
      </span>
    </div>
  );
}
