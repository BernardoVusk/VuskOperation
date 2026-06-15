import { createContext, useContext } from "react";

export const OperatorContext = createContext<string>("Bernardo");

export function useOperator() {
  return useContext(OperatorContext);
}
