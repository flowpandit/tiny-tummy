import { createContext, useContext, type ReactNode } from "react";
import * as defaultDbClient from "../lib/db";

export type DbClient = typeof defaultDbClient;

const DatabaseContext = createContext<DbClient>(defaultDbClient);

export function DatabaseProvider({
  children,
  client = defaultDbClient,
}: {
  children: ReactNode;
  client?: DbClient;
}) {
  return (
    <DatabaseContext.Provider value={client}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDbClient() {
  return useContext(DatabaseContext);
}
