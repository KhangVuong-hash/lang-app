import { Headphones, Mic, PenLine, BookOpen, type LucideIcon } from 'lucide-react';
import type { SkillKey } from './constants';

/** Icon lucide cho từng kỹ năng (tách khỏi constants.ts vì file đó được middleware import). */
export const SKILL_ICON: Record<SkillKey, LucideIcon> = {
  listening: Headphones,
  speaking: Mic,
  writing: PenLine,
  reading: BookOpen,
};
