import { createLocalRepositories, type AppRepositories } from "../repositories";
import { createHandoffService, type HandoffService } from "./handoff-service";
import { createPredictionService, type PredictionService } from "./prediction-service";
import { createReportService, type ReportService } from "./report-service";

export interface AppServices {
  report: ReportService;
  handoff: HandoffService;
  prediction: PredictionService;
}

export function createDomainServices(repositories: AppRepositories): AppServices {
  return {
    report: createReportService(repositories.reportSource),
    handoff: createHandoffService(repositories),
    prediction: createPredictionService(),
  };
}

export const defaultServices = createDomainServices(createLocalRepositories());

export type { HandoffService, PredictionService, ReportService };
