import { createContext, useContext, useMemo, type ReactNode } from "react";
import * as defaultDbClient from "../lib/db";
import { createLocalRepositories, type AppRepositories } from "../lib/repositories";
import { createDomainServices, type AppServices } from "../lib/services";

export type DbClient = typeof defaultDbClient;

const DatabaseContext = createContext<DbClient>(defaultDbClient);
const defaultRepositories = createLocalRepositories(defaultDbClient);
const RepositoryContext = createContext<AppRepositories>(defaultRepositories);
const ServiceContext = createContext<AppServices>(createDomainServices(defaultRepositories));

export function DatabaseProvider({
  children,
  client = defaultDbClient,
}: {
  children: ReactNode;
  client?: DbClient;
}) {
  const repositories = useMemo(() => createLocalRepositories(client), [client]);
  const services = useMemo(() => createDomainServices(repositories), [repositories]);

  return (
    <DatabaseContext.Provider value={client}>
      <RepositoryContext.Provider value={repositories}>
        <ServiceContext.Provider value={services}>
          {children}
        </ServiceContext.Provider>
      </RepositoryContext.Provider>
    </DatabaseContext.Provider>
  );
}

export function useDbClient() {
  return useContext(DatabaseContext);
}

export function useRepositories() {
  return useContext(RepositoryContext);
}

export function useServices() {
  return useContext(ServiceContext);
}
