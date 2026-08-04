import { useCallback, useState } from "react";

export type UseControllableStateProps<T> = {
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
};

export const useControllableState = <T>({
  value: valueProp,
  defaultValue,
  onChange,
}: UseControllableStateProps<T>) => {
  const [uncontrolledState, setUncontrolledState] = useState<T>(defaultValue as T);

  const isControlled = valueProp !== undefined;
  const value = isControlled ? valueProp : uncontrolledState;

  const setValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      const nextValue = isSetStateAction(newValue) ? newValue(value) : newValue;

      if (value === nextValue) return;
      if (isControlled === false) setUncontrolledState(nextValue);
      if (isControlled === true && value === undefined) setUncontrolledState(nextValue);
      onChange?.(nextValue);
    },
    [isControlled, value, onChange],
  );

  return [value, setValue] as const;
};

const isSetStateAction = <T>(value: T | ((prevValue: T) => T)): value is (prevValue: T) => T =>
  typeof value === "function";
