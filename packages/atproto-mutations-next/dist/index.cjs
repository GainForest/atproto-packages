"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  AtprotoAgent: () => import_atproto_mutations_core2.AtprotoAgent,
  AudioRecordingNotFoundError: () => import_atproto_mutations_core11.AudioRecordingNotFoundError,
  AudioRecordingPdsError: () => import_atproto_mutations_core11.AudioRecordingPdsError,
  AudioRecordingValidationError: () => import_atproto_mutations_core11.AudioRecordingValidationError,
  BlobUploadError: () => import_atproto_mutations_core5.BlobUploadError,
  CertifiedLocationIsDefaultError: () => import_atproto_mutations_core8.CertifiedLocationIsDefaultError,
  CertifiedLocationNotFoundError: () => import_atproto_mutations_core8.CertifiedLocationNotFoundError,
  CertifiedLocationPdsError: () => import_atproto_mutations_core8.CertifiedLocationPdsError,
  CertifiedLocationValidationError: () => import_atproto_mutations_core8.CertifiedLocationValidationError,
  ClaimActivityNotFoundError: () => import_atproto_mutations_core7.ClaimActivityNotFoundError,
  ClaimActivityPdsError: () => import_atproto_mutations_core7.ClaimActivityPdsError,
  ClaimActivityValidationError: () => import_atproto_mutations_core7.ClaimActivityValidationError,
  CredentialLoginError: () => import_atproto_mutations_core4.CredentialLoginError,
  DefaultSiteLocationNotFoundError: () => import_atproto_mutations_core9.DefaultSiteLocationNotFoundError,
  DefaultSitePdsError: () => import_atproto_mutations_core9.DefaultSitePdsError,
  DefaultSiteValidationError: () => import_atproto_mutations_core9.DefaultSiteValidationError,
  FileConstraintError: () => import_atproto_mutations_core5.FileConstraintError,
  GeoJsonProcessingError: () => import_atproto_mutations_core12.GeoJsonProcessingError,
  GeoJsonValidationError: () => import_atproto_mutations_core12.GeoJsonValidationError,
  LayerNotFoundError: () => import_atproto_mutations_core10.LayerNotFoundError,
  LayerPdsError: () => import_atproto_mutations_core10.LayerPdsError,
  LayerValidationError: () => import_atproto_mutations_core10.LayerValidationError,
  MutationError: () => import_atproto_mutations_core2.MutationError,
  OrganizationInfoAlreadyExistsError: () => import_atproto_mutations_core6.OrganizationInfoAlreadyExistsError,
  OrganizationInfoNotFoundError: () => import_atproto_mutations_core6.OrganizationInfoNotFoundError,
  OrganizationInfoPdsError: () => import_atproto_mutations_core6.OrganizationInfoPdsError,
  OrganizationInfoValidationError: () => import_atproto_mutations_core6.OrganizationInfoValidationError,
  adapt: () => import_atproto_mutations_core2.adapt,
  computePolygonMetrics: () => import_atproto_mutations_core12.computePolygonMetrics,
  err: () => import_atproto_mutations_core2.err,
  formatMutationError: () => import_atproto_mutations_core3.formatMutationError,
  formatMutationErrorMessage: () => import_atproto_mutations_core3.formatMutationErrorMessage,
  makeCredentialAgentLayer: () => import_atproto_mutations_core4.makeCredentialAgentLayer,
  mutations: () => import_atproto_mutations_core.mutations,
  ok: () => import_atproto_mutations_core2.ok,
  parseAtUri: () => import_internal_utils.parseAtUri,
  toSerializableFile: () => import_atproto_mutations_core5.toSerializableFile,
  validateGeojsonOrThrow: () => import_atproto_mutations_core12.validateGeojsonOrThrow
});
module.exports = __toCommonJS(src_exports);
var import_atproto_mutations_core = require("@gainforest/atproto-mutations-core");
var import_atproto_mutations_core2 = require("@gainforest/atproto-mutations-core");
var import_atproto_mutations_core3 = require("@gainforest/atproto-mutations-core");
var import_atproto_mutations_core4 = require("@gainforest/atproto-mutations-core");
var import_atproto_mutations_core5 = require("@gainforest/atproto-mutations-core");
var import_atproto_mutations_core6 = require("@gainforest/atproto-mutations-core");
var import_atproto_mutations_core7 = require("@gainforest/atproto-mutations-core");
var import_atproto_mutations_core8 = require("@gainforest/atproto-mutations-core");
var import_atproto_mutations_core9 = require("@gainforest/atproto-mutations-core");
var import_atproto_mutations_core10 = require("@gainforest/atproto-mutations-core");
var import_atproto_mutations_core11 = require("@gainforest/atproto-mutations-core");
var import_atproto_mutations_core12 = require("@gainforest/atproto-mutations-core");
var import_internal_utils = require("@gainforest/internal-utils");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AtprotoAgent,
  AudioRecordingNotFoundError,
  AudioRecordingPdsError,
  AudioRecordingValidationError,
  BlobUploadError,
  CertifiedLocationIsDefaultError,
  CertifiedLocationNotFoundError,
  CertifiedLocationPdsError,
  CertifiedLocationValidationError,
  ClaimActivityNotFoundError,
  ClaimActivityPdsError,
  ClaimActivityValidationError,
  CredentialLoginError,
  DefaultSiteLocationNotFoundError,
  DefaultSitePdsError,
  DefaultSiteValidationError,
  FileConstraintError,
  GeoJsonProcessingError,
  GeoJsonValidationError,
  LayerNotFoundError,
  LayerPdsError,
  LayerValidationError,
  MutationError,
  OrganizationInfoAlreadyExistsError,
  OrganizationInfoNotFoundError,
  OrganizationInfoPdsError,
  OrganizationInfoValidationError,
  adapt,
  computePolygonMetrics,
  err,
  formatMutationError,
  formatMutationErrorMessage,
  makeCredentialAgentLayer,
  mutations,
  ok,
  parseAtUri,
  toSerializableFile,
  validateGeojsonOrThrow
});
//# sourceMappingURL=index.cjs.map