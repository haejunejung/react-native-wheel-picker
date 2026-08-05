import { useCallback, useEffect, useRef } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function usePreservedCallback<Arguments extends any[] = any[], ReturnValue = unknown>(
  callback: (...args: Arguments) => ReturnValue,
) {
  const callbackRef = useRef(callback);

  useEffect(
    function syncCallbackRef() {
      callbackRef.current = callback;
    },
    [callback],
  );

  return useCallback((...args: Arguments) => {
    return callbackRef.current(...args);
  }, []);
}
