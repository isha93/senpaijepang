import { apiRequest, withAdminHeaders } from './api';

type QueryValue = string | number | boolean | null | undefined;

export type JobPageInfo = {
  cursor: string;
  nextCursor: string | null;
  limit: number;
  total: number;
};

export type HealthResponse = {
  status: string;
  service: string;
  version: string;
};

export type MetricsRoute = {
  method: string;
  route: string;
  count: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
};

export type MetricsResponse = {
  uptimeSec: number;
  totalRequests: number;
  totalErrors: number;
  byStatus: Record<string, number>;
  routes: MetricsRoute[];
};

export type KycRawStatus = 'CREATED' | 'SUBMITTED' | 'MANUAL_REVIEW' | 'VERIFIED' | 'REJECTED';
export type KycTrustStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'MANUAL_REVIEW' | 'VERIFIED' | 'REJECTED';

export type KycSession = {
  id: string;
  status: KycRawStatus;
  provider: string;
  providerRef: string | null;
  providerMetadata?: Record<string, unknown>;
  submittedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KycDocument = {
  id: string;
  kycSessionId: string;
  documentType: string;
  objectKey?: string | null;
  fileUrl: string;
  checksumSha256: string;
  metadata?: Record<string, unknown>;
  verifiedAt?: string | null;
  createdAt: string;
};

export type KycStatusEvent = {
  id: string;
  kycSessionId: string;
  fromStatus?: KycRawStatus | null;
  toStatus: KycRawStatus;
  actorType: 'USER' | 'ADMIN' | 'SYSTEM';
  actorId?: string | null;
  reason?: string | null;
  createdAt: string;
};

export type AdminKycReviewQueueItem = {
  session: KycSession;
  trustStatus: KycTrustStatus;
  user?: {
    id?: string;
    fullName?: string;
    email?: string;
  } | null;
  documents: KycDocument[];
  events: KycStatusEvent[];
  lastEvent?: KycStatusEvent | null;
  documentCount: number;
  riskFlags: string[];
};

export type AdminKycReviewQueueResponse = {
  count: number;
  filters: {
    status: KycRawStatus[];
  };
  items: AdminKycReviewQueueItem[];
};

export type AdminKycReviewDecision = 'MANUAL_REVIEW' | 'VERIFIED' | 'REJECTED';

export type KycSessionEnvelope = {
  status: KycTrustStatus;
  session: KycSession;
};

export type AdminFeedPost = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  imageUrl?: string | null;
  publishedAt: string;
};

export type AdminFeedPostListResponse = {
  items: AdminFeedPost[];
  pageInfo: JobPageInfo;
};

export type FeedPost = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  imageUrl?: string | null;
  publishedAt: string;
  viewerState: {
    authenticated: boolean;
    saved: boolean;
  };
};

export type FeedListResponse = {
  items: FeedPost[];
  pageInfo: JobPageInfo;
};

export type JobEmployer = {
  id: string;
  name: string;
  logoUrl: string | null;
  isVerifiedEmployer: boolean;
};

export type JobLocationDetail = {
  countryCode: string;
  city: string;
  displayLabel: string;
  latitude: number;
  longitude: number;
};

export type AdminJob = {
  id: string;
  title: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
  visaSponsorship: boolean;
  description: string;
  requirements: string[];
  location: JobLocationDetail;
  employer: JobEmployer;
};

export type AdminJobListResponse = {
  items: AdminJob[];
  pageInfo: JobPageInfo;
};

export type OrganizationVerificationStatus = 'PENDING' | 'VERIFIED' | 'MISMATCH' | 'NOT_FOUND' | 'REJECTED';

export type OrganizationVerification = {
  id: string;
  orgId: string;
  status: OrganizationVerificationStatus;
  reasonCodes?: string[];
  lastCheckedAt?: string;
};

export type AdminOrganizationListItem = {
  organization: {
    id: string;
    name: string;
    orgType: 'TSK' | 'LPK' | 'EMPLOYER';
    countryCode: string;
  };
  verification: OrganizationVerification | null;
  owner:
    | {
        id: string;
        fullName: string;
        email: string;
      }
    | null;
};

export type AdminOrganizationListResponse = {
  items: AdminOrganizationListItem[];
  pageInfo: JobPageInfo;
};

function buildQuery(params: Record<string, QueryValue>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    query.set(key, String(value));
  }
  const value = query.toString();
  return value ? `?${value}` : '';
}

function adminRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
) {
  return apiRequest<T>(path, {
    method: options.method,
    body: options.body,
    auth: true,
    headers: withAdminHeaders(options.headers || {})
  });
}

export function getHealth() {
  return apiRequest<HealthResponse>('/health');
}

export function getMetrics() {
  return apiRequest<MetricsResponse>('/metrics');
}

export function getAdminKycReviewQueue(params: {
  status?: 'DEFAULT' | 'ALL' | KycRawStatus;
  limit?: number;
} = {}) {
  const query = buildQuery(params);
  return adminRequest<AdminKycReviewQueueResponse>(`/admin/kyc/review-queue${query}`);
}

export function submitAdminKycReview(body: {
  sessionId: string;
  decision: AdminKycReviewDecision;
  reviewedBy?: string;
  reason?: string;
}) {
  return adminRequest<KycSessionEnvelope>('/admin/kyc/review', {
    method: 'POST',
    body
  });
}

export function getAdminFeedPosts(params: {
  q?: string;
  category?: string;
  cursor?: number;
  limit?: number;
} = {}) {
  const query = buildQuery(params);
  return adminRequest<AdminFeedPostListResponse>(`/admin/feed/posts${query}`);
}

export function getPublicFeedPosts(params: {
  q?: string;
  category?: string;
  cursor?: number;
  limit?: number;
} = {}) {
  const query = buildQuery(params);
  return apiRequest<FeedListResponse>(`/feed/posts${query}`);
}

export function getAdminJobs(params: {
  q?: string;
  cursor?: number;
  limit?: number;
} = {}) {
  const query = buildQuery(params);
  return adminRequest<AdminJobListResponse>(`/admin/jobs${query}`);
}

export function getAdminOrganizations(params: {
  cursor?: string | number;
  limit?: number;
  orgType?: 'TSK' | 'LPK' | 'EMPLOYER';
  verificationStatus?: OrganizationVerificationStatus;
} = {}) {
  const query = buildQuery(params);
  return adminRequest<AdminOrganizationListResponse>(`/admin/organizations${query}`);
}

export function updateAdminOrganizationVerification(
  orgId: string,
  body: {
    status: OrganizationVerificationStatus;
    reasonCodes?: string[];
  }
) {
  return adminRequest<OrganizationVerification>(`/admin/organizations/${orgId}/verification`, {
    method: 'PATCH',
    body
  });
}
