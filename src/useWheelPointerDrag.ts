const noop = () => {};

export const useWheelPointerDrag = () => {
  return {
    handlePointerDown: noop,
    handlePointerMove: noop,
    handlePointerUp: noop,
    handlePointerLeave: noop,
  };
};
