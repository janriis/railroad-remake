import { useId } from 'react';
import { SPRITE_CROPS } from '../../data/spriteCrops.js';

export function LocomotiveIcon({ color = '#c49a44', size = 40, catalogId = 'americ' }) {
  const uid = useId();
  const crop = SPRITE_CROPS[catalogId] ?? SPRITE_CROPS.americ;
  const svgH = Math.round(size * crop.h / crop.w);
  const sx = size / crop.w;

  return (
    <svg
      width={size}
      height={svgH}
      viewBox={`0 0 ${size} ${svgH}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ isolation: 'isolate', display: 'block', flexShrink: 0 }}
    >
      <defs>
        <clipPath id={`lc-${uid}`}>
          <rect x="0" y="0" width={size} height={svgH} />
        </clipPath>
      </defs>
      <rect width={size} height={svgH} fill="white" />
      <image
        href="/rail.jpeg"
        x={-crop.x * sx}
        y={-crop.y * sx}
        width={640 * sx}
        height={480 * sx}
        clipPath={`url(#lc-${uid})`}
      />
      <rect width={size} height={svgH} fill={color} style={{ mixBlendMode: 'multiply' }} />
    </svg>
  );
}
