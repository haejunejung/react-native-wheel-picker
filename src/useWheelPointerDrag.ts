const noop = () => {};

export const useWheelPointerDrag = (props: any) => {
  return {
    handlePointerDown: noop,
    handlePointerMove: noop,
    handlePointerUp: noop,
    handlePointerLeave: noop,
  };
};
