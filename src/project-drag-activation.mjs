import { PointerActivationConstraints } from '@dnd-kit/dom';

export const projectDragActivationConstraints = () => [new PointerActivationConstraints.Distance({ value: 6 })];
