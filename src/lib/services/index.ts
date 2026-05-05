import { createLocalRepositories, type AppRepositories } from "../repositories";
import { createCaregiverService, type CaregiverService } from "./caregiver-service";
import { createExportImportService, type ExportImportService } from "./export-import-service";
import { createHandoffService, type HandoffService } from "./handoff-service";
import { createPredictionService, type PredictionService } from "./prediction-service";
import { createReportService, type ReportService } from "./report-service";

export interface AppServices {
  caregivers: CaregiverService;
  report: ReportService;
  handoff: HandoffService;
  prediction: PredictionService;
  exportImport: ExportImportService;
}

export function createDomainServices(repositories: AppRepositories): AppServices {
  const handoff = createHandoffService(repositories);

  return {
    caregivers: createCaregiverService(repositories),
    report: createReportService(repositories.reportSource, handoff),
    handoff,
    prediction: createPredictionService(),
    exportImport: createExportImportService(repositories.exportImport),
  };
}

export const defaultServices = createDomainServices(createLocalRepositories());

export type { CaregiverService, ExportImportService, HandoffService, PredictionService, ReportService };
