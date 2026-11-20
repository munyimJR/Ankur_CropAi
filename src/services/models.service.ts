import { apiFetch } from "./http";
import type { LocalizedText } from "./types";

export interface RegisteredModel {
  id: string;
  name: string;
  version: string;
  cropType: string;
  framework: string;
  inputShape: string;
  supportedClasses: LocalizedText[];
  provenance: {
    sourceRepository?: string;
    sourceUrl?: string;
    license?: string;
    baseArchitecture?: string;
    trainingDataset?: string;
    validationAccuracy?: string;
    macroF1?: string;
    supportedCrops?: string[];
    supportedDiseases?: string[];
    limitations?: string;
  };
  isActive: boolean;
  createdAt: string;
  activeForCrops?: string[];
}

export interface ModelsRegistryResponse {
  models: RegisteredModel[];
  activeMappings: Record<string, string>;
}

export interface TopPrediction {
  className: string;
  probability: number;
}

export interface ModelTestResult {
  modelId: string;
  latencyMs: number;
  topClass: string;
  confidence: number;
  topPredictions: TopPrediction[];
}

export async function getModelsRegistry(): Promise<ModelsRegistryResponse> {
  return await apiFetch<ModelsRegistryResponse>("/models");
}

export async function uploadModel(formData: FormData): Promise<RegisteredModel> {
  return await apiFetch<RegisteredModel>("/models/upload", {
    method: "POST",
    body: formData,
  });
}

export async function activateModel(
  modelId: string,
  crop: string
): Promise<{ status: string; message: string; activeMappings: Record<string, string> }> {
  return await apiFetch(`/models/${modelId}/activate?crop=${encodeURIComponent(crop)}`, {
    method: "POST",
  });
}

export async function testModelInference(
  modelId: string,
  imageFile: File
): Promise<ModelTestResult> {
  const fd = new FormData();
  fd.append("file", imageFile);
  return await apiFetch<ModelTestResult>(`/models/${modelId}/test`, {
    method: "POST",
    body: fd,
  });
}

export async function deleteModel(
  modelId: string
): Promise<{ status: string; message: string; activeMappings: Record<string, string> }> {
  return await apiFetch(`/models/${modelId}`, {
    method: "DELETE",
  });
}
