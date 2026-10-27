/**
 * Gateway'in döndüğü tipler. Kaynak: backend `libs/proto/src/lib/*.proto`
 * ve `libs/common/src/lib/base/base.response.ts`.
 *
 * - Alan adları camelCase gelir (proto-loader varsayılanı).
 * - Proto enum'ları SAYI olarak gelir (proto-loader'da `enums: String` yok).
 * - Boş string alanlar "değer yok" anlamındadır (`defaults: true`).
 */

/** Tüm gateway yanıtlarının zarfı. Hatada `data = null`, `message` = hata kodu. */
export interface BaseResponse<T> {
  data: T;
  message: string;
  success: boolean;
  correlationId?: string;
}

export interface ErrorResponseBody {
  data: null;
  message: string;
  success: false;
  correlationId?: string;
}

// ---- auth ----

export interface TokenResponse {
  /** Opaque erişim token'ı — yalnızca bellekte tutulur. */
  accessToken: string;
  tokenType: string;
  /** Saniye. */
  expiresIn: number;
  refreshExpiresIn: number;
  userId: string;
  clinicId?: string;
}

export interface LogoutResponse {
  success: boolean;
}

// ---- users ----

export interface GetMeResponse {
  userId: string;
  email: string;
  fullName: string;
  /** E.164: `+905551234567` */
  phone: string;
  role: UserRole;
  /** Klinik hesabı değilse boş string. */
  clinicId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  userId: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  clinicId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserResponse {
  user: User;
}

export interface UpdateMeRequest {
  fullName?: string;
  phone?: string;
}

export interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  sex: PetSex;
  birthDate: string;
  isBirthDateEstimated: boolean;
  isNeutered: boolean;
  ownerUserId: string;
  chipNumberMasked: string;
  chipNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface PetResponse {
  pet: Pet;
}

export interface ListMyPetsResponse {
  pets: Pet[];
}

export interface CreatePetRequest {
  name: string;
  species: string;
  breed: string;
  sex: PetSex;
  birthDate?: string;
  isBirthDateEstimated?: boolean;
  isNeutered?: boolean;
  chipNumber?: string;
  ownerUserId: string;
}

export interface UpdatePetRequest {
  name?: string;
  breed?: string;
  birthDate?: string;
  isBirthDateEstimated?: boolean;
  isNeutered?: boolean;
  chipNumber?: string;
}

export interface Clinic {
  id: string;
  name: string;
  taxNumber: string;
  phone: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicResponse {
  clinic: Clinic;
}

export interface Consent {
  consentId: string;
  status: ConsentStatus;
  ownerUserId: string;
  clinicId: string;
  petId: string;
  scopes: string[];
  grantedAt: string;
  expiresAt: string;
  revokedAt: string;
}

export interface ListMyConsentsResponse {
  consents: Consent[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GrantConsentRequest {
  clinicId: string;
  petId: string;
  scopes: string[];
  expiresAt: string;
}

export interface PetSummary {
  id: string;
  name: string;
  species: string;
  breed: string;
  sex: PetSex;
  birthDate: string;
  isBirthDateEstimated: boolean;
  chipNumberMasked: string;
}

export interface SearchClinicPetsResponse {
  pets: PetSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StockItem {
  id: string;
  clinicId: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  criticalLevel: number;
  isBelowCritical: boolean;
  expiresAt: string;
  updatedAt: string;
  purchasePrice?: number;
  salePrice?: number;
}

export interface StockItemResponse {
  item: StockItem;
}

export interface ListStockItemsResponse {
  items: StockItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AddStockItemRequest {
  name: string;
  category: string;
  unit: string;
  quantity: number;
  criticalLevel: number;
  expiresAt?: string;
  purchasePrice: number;
  salePrice: number;
}

export interface UpdateStockItemRequest {
  name?: string;
  quantity?: number;
  criticalLevel?: number;
  expiresAt?: string | null;
  purchasePrice?: number;
  salePrice?: number;
}

export interface StockSale {
  id: string;
  clinicId: string;
  stockItemId: string;
  itemName: string;
  category: string;
  unit: string;
  quantity: number;
  unitSalePrice: number;
  unitPurchasePrice: number;
  totalSale: number;
  totalCost: number;
  profit: number;
  soldAt: string;
  cancelledAt: string;
}

export interface CreateStockSaleRequest {
  quantity: number;
  unitPrice?: number;
}

export interface StockSaleResponse {
  sale: StockSale;
  item?: StockItem | null;
}

export interface ListStockSalesResponse {
  sales: StockSale[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SalesFigures {
  revenue: number;
  cost: number;
  profit: number;
  salesCount: number;
  quantity: number;
}

export interface DailySales extends SalesFigures {
  date: string;
}

export interface WeeklySales extends SalesFigures {
  weekStart: string;
  weekEnd: string;
}

export interface ProductSales extends SalesFigures {
  stockItemId: string;
  itemName: string;
  unit: string;
}

export interface StockSalesSummary {
  month: string;
  totals: SalesFigures;
  daily: DailySales[];
  weekly: WeeklySales[];
  products: ProductSales[];
}

export interface ClinicPetSummary {
  petId: string;
  name: string;
  species: string;
  breed: string;
  birthDate: string;
  chipNumberMasked: string;
  ownerUserId: string;
}

export interface ClinicOwnerSummary {
  userId: string;
  fullName: string;
  phone: string;
}

export interface ClinicRecordSummary {
  recordId: string;
  type: string;
  title: string;
  recordedAt: string;
}

export interface ClinicPetOverview {
  pet: ClinicPetSummary;
  owner?: ClinicOwnerSummary | null;
  recentRecords: ClinicRecordSummary[];
  pendingDraftReviewCount: number;
  unavailableSources: string[];
}

// ---- health (BaseResponse zarfı YOK) ----

// ---- proto enum'ları (sayısal) ----

export const UserRole = {
  UNSPECIFIED: 0,
  CLINIC: 1,
  PET_OWNER: 2,
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const PetSex = {
  UNSPECIFIED: 0,
  MALE: 1,
  FEMALE: 2,
} as const;
export type PetSex = (typeof PetSex)[keyof typeof PetSex];

export const ConsentStatus = {
  UNSPECIFIED: 0,
  ACTIVE: 1,
  REVOKED: 2,
  EXPIRED: 3,
  NOT_FOUND: 4,
} as const;
export type ConsentStatus = (typeof ConsentStatus)[keyof typeof ConsentStatus];

export const RecordType = {
  UNSPECIFIED: 0,
  EXAMINATION: 1,
  VACCINATION: 2,
  PRESCRIPTION: 3,
  LAB_RESULT: 4,
  SURGERY: 5,
} as const;
export type RecordType = (typeof RecordType)[keyof typeof RecordType];

export const LabResultFlag = {
  UNSPECIFIED: 0,
  NORMAL: 1,
  LOW: 2,
  HIGH: 3,
} as const;
export type LabResultFlag = (typeof LabResultFlag)[keyof typeof LabResultFlag];

export const DraftReviewStatus = {
  UNSPECIFIED: 0,
  PENDING: 1,
  APPROVED: 2,
  REJECTED: 3,
} as const;
export type DraftReviewStatus =
  (typeof DraftReviewStatus)[keyof typeof DraftReviewStatus];

export const DocumentStatus = {
  UNSPECIFIED: 0,
  QUEUED: 1,
  PROCESSING: 2,
  DRAFT_READY: 3,
  FAILED: 4,
} as const;
export type DocumentStatus =
  (typeof DocumentStatus)[keyof typeof DocumentStatus];

// ---- medical records ----

export interface FileReference {
  documentId: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface VaccinationDetails {
  vaccineName: string;
  batchNumber: string;
  administeredAt: string;
  nextDueAt: string;
}

export interface PrescriptionDetails {
  medicationName: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions: string;
  prescribedAt: string;
}

export interface LabResultItem {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: LabResultFlag;
}

export interface LabResultDetails {
  items: LabResultItem[];
  sampledAt: string;
}

export interface RecordContent {
  type: RecordType;
  title: string;
  notes: string;
  recordedAt: string;
  vaccination?: VaccinationDetails | null;
  prescription?: PrescriptionDetails | null;
  labResult?: LabResultDetails | null;
}

export interface MedicalRecord extends RecordContent {
  id: string;
  petId: string;
  clinicId: string;
  attachments: FileReference[];
  sourceDraftReviewId: string;
  createdAt: string;
}

export interface ListRecordsResponse {
  records: MedicalRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateRecordRequest {
  content: RecordContent;
  attachments?: Array<{ documentId: string }>;
}

export interface RecordResponse {
  record: MedicalRecord;
}

export interface Vaccination {
  id: string;
  recordId: string;
  petId: string;
  vaccineName: string;
  batchNumber: string;
  administeredAt: string;
  nextDueAt: string;
  clinicId: string;
}

export interface ListVaccinationsResponse {
  vaccinations: Vaccination[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Prescription {
  id: string;
  recordId: string;
  petId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions: string;
  prescribedAt: string;
  clinicId: string;
}

export interface ListPrescriptionsResponse {
  prescriptions: Prescription[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LabResult {
  id: string;
  recordId: string;
  petId: string;
  clinicId: string;
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: LabResultFlag;
  sampledAt: string;
}

export interface ListLabResultsResponse {
  labResults: LabResult[];
  total: number;
  page: number;
  pageSize: number;
}

export const LabExplanationStatus = {
  PENDING: 1,
  READY: 2,
  FAILED: 3,
} as const;
export type LabExplanationStatus =
  (typeof LabExplanationStatus)[keyof typeof LabExplanationStatus];

export interface LabExplanationItem {
  testName: string;
  explanation: string;
}

export interface LabExplanationResponse {
  status: LabExplanationStatus;
  summary: string;
  items: LabExplanationItem[];
  confidence: number;
  generatedAt: string;
}

export interface MedicalDocument {
  id: string;
  petId: string;
  clinicId: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  note: string;
  status: DocumentStatus;
  failureReason: string;
  draftReviewId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentResponse {
  document: MedicalDocument;
}

export interface ListDocumentsResponse {
  documents: MedicalDocument[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UploadPetResultResponse {
  documentId: string;
  uploadedAt: string;
  status: string;
}

export interface DraftReview {
  id: string;
  petId: string;
  clinicId: string;
  sourceFiles: FileReference[];
  status: DraftReviewStatus;
  reviewNote: string;
  createdRecordId: string;
  createdAt: string;
  reviewedAt: string;
  reviewedByClinicId: string;
  documentId: string;
  proposal?: RecordContent | null;
  approvedContent?: RecordContent | null;
  modelVersion: string;
  confidence: number;
}

export interface ListDraftReviewsResponse {
  draftReviews: DraftReview[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ReviewDraftRequest {
  approved: boolean;
  reviewNote?: string;
  editedContent?: RecordContent;
}

export interface DraftReviewResponse {
  draftReview: DraftReview;
}
