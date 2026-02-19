export type Flags = number;

export const NoFlags = 0b0000000;
export const Placement = 0b0000001;
export const Update = 0b0000010;
export const ChildDeletion = 0b0000100;

// 代表了commit-mutation阶段需要执行的操作，也就是说当前fiber的subtreeFlags或flags中包含了MutationMask中指定的flags,就代表需要执行mutation
export const MutationMask = Placement | Update | ChildDeletion;
