import { noop } from "./utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
export const useWheelPointerDrag = (_: any) => {
  return {
    handlePointerDown: noop,
    handlePointerMove: noop,
    handlePointerUp: noop,
    handlePointerLeave: noop,
  };
};
