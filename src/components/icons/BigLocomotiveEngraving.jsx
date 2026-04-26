import { useId } from 'react';
import { SPRITE_CROPS } from '../../data/spriteCrops.js';

export function BigLocomotiveEngraving({ color = '#c49a44', catalogId = 'americ' }) {
  const uid = useId();
  const crop = SPRITE_CROPS[catalogId] ?? SPRITE_CROPS.americ;
  const W = 360;
  const svgH = Math.round(W * crop.h / crop.w);
  const sx = W / crop.w;

  return (
    <svg
      width={W}
      height={svgH}
      viewBox={`0 0 ${W} ${svgH}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ isolation: 'isolate', display: 'block' }}
    >
      <defs>
        <clipPath id={`ble-${uid}`}>
          <rect x="0" y="0" width={W} height={svgH} />
        </clipPath>
      </defs>
      <rect width={W} height={svgH} fill="white" />
      <image
        href="/rail.jpeg"
        x={-crop.x * sx}
        y={-crop.y * sx}
        width={640 * sx}
        height={480 * sx}
        clipPath={`url(#ble-${uid})`}
      />
      <rect width={W} height={svgH} fill={color} style={{ mixBlendMode: 'multiply' }} />
    </svg>
  );
}
