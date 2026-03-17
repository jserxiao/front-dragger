import React from 'react';
import { AlignmentLine } from '@/types';
import styles from './Canvas.module.css';

interface AlignmentGuidesProps {
  lines: AlignmentLine[];
  scale: number;
  offset: { x: number; y: number };
}

/**
 * 对齐辅助线组件
 */
const AlignmentGuides: React.FC<AlignmentGuidesProps> = ({
  lines,
  scale,
  offset,
}) => {
  if (lines.length === 0) return null;

  return (
    <div className={styles.alignmentGuides}>
      {lines.map((line, index) => {
        if (line.type === 'horizontal') {
          return (
            <div
              key={`h-${index}`}
              className={styles.alignmentLineHorizontal}
              style={{
                top: line.position * scale + offset.y,
                left: line.start * scale + offset.x,
                width: (line.end - line.start) * scale,
              }}
            />
          );
        } else {
          return (
            <div
              key={`v-${index}`}
              className={styles.alignmentLineVertical}
              style={{
                left: line.position * scale + offset.x,
                top: line.start * scale + offset.y,
                height: (line.end - line.start) * scale,
              }}
            />
          );
        }
      })}
    </div>
  );
};

export default AlignmentGuides;
