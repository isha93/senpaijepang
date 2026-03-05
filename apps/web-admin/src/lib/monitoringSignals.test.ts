import { describe, expect, it } from 'vitest';
import {
  buildActivitySignals,
  buildMetricSignals,
  buildOperationalSignals,
  buildQueueSignals,
  calculateErrorRate,
  pickSlowestRoute
} from './monitoringSignals';

describe('monitoringSignals', () => {
  it('calculates error rate from metrics', () => {
    expect(
      calculateErrorRate({
        uptimeSec: 100,
        totalRequests: 200,
        totalErrors: 10,
        byStatus: {},
        routes: []
      })
    ).toBe(5);
  });

  it('returns highest latency route', () => {
    const slowest = pickSlowestRoute({
      uptimeSec: 100,
      totalRequests: 10,
      totalErrors: 0,
      byStatus: {},
      routes: [
        { method: 'GET', route: '/a', count: 2, avgDurationMs: 100, minDurationMs: 50, maxDurationMs: 200 },
        { method: 'POST', route: '/b', count: 2, avgDurationMs: 900, minDurationMs: 300, maxDurationMs: 1200 }
      ]
    });

    expect(slowest?.route).toBe('/b');
    expect(slowest?.avgDurationMs).toBe(900);
  });

  it('emits metric warnings for error rate and slow route', () => {
    const signals = buildMetricSignals({
      uptimeSec: 100,
      totalRequests: 100,
      totalErrors: 4,
      byStatus: {},
      routes: [
        {
          method: 'GET',
          route: '/slow',
          count: 5,
          avgDurationMs: 800,
          minDurationMs: 700,
          maxDurationMs: 900
        }
      ]
    });

    expect(signals.some((signal) => signal.id === 'error-rate-warning')).toBe(true);
    expect(signals.some((signal) => signal.id === 'latency-warning')).toBe(true);
  });

  it('emits queue pressure warnings when backlog is high', () => {
    const signals = buildQueueSignals({
      pendingKyc: 45,
      manualReviewKyc: 21,
      verifiedToday: 1,
      rejectedToday: 1,
      pendingOrganizationVerification: 20,
      activeJobs: 10,
      publishedFeedPosts: 10,
      activeApplications: 10,
      submittedApplications: 4,
      inReviewApplications: 2,
      interviewApplications: 2,
      offeredApplications: 1,
      hiredApplications: 1,
      rejectedApplications: 1,
      lastUpdatedAt: '2026-03-05T00:00:00.000Z'
    });

    expect(signals.some((signal) => signal.id === 'kyc-backlog-critical')).toBe(true);
    expect(signals.some((signal) => signal.id === 'manual-review-warning')).toBe(true);
    expect(signals.some((signal) => signal.id === 'org-verification-warning')).toBe(true);
  });

  it('flags stale activity timeline', () => {
    const signals = buildActivitySignals(
      {
        count: 1,
        filters: { type: 'ALL', actorId: null, from: null, to: null },
        pageInfo: { cursor: '0', nextCursor: null, limit: 10, total: 1 },
        items: [
          {
            id: 'ev-1',
            type: 'KYC',
            action: 'STATUS_CHANGED',
            entityType: 'KYC_SESSION',
            entityId: 's-1',
            actorType: 'ADMIN',
            actorId: 'admin-1',
            statusFrom: 'SUBMITTED',
            statusTo: 'VERIFIED',
            title: 'Verified',
            description: 'Status changed',
            createdAt: '2026-03-05T00:00:00.000Z'
          }
        ]
      },
      Date.parse('2026-03-05T02:30:00.000Z')
    );

    expect(signals.length).toBe(1);
    expect(signals[0].id).toBe('activity-stale');
  });

  it('returns info signal when system is stable', () => {
    const signals = buildOperationalSignals({
      metrics: {
        uptimeSec: 100,
        totalRequests: 20,
        totalErrors: 0,
        byStatus: {},
        routes: [{ method: 'GET', route: '/ok', count: 20, avgDurationMs: 120, minDurationMs: 50, maxDurationMs: 200 }]
      },
      summary: {
        pendingKyc: 2,
        manualReviewKyc: 1,
        verifiedToday: 3,
        rejectedToday: 0,
        pendingOrganizationVerification: 1,
        activeJobs: 10,
        publishedFeedPosts: 10,
        activeApplications: 12,
        submittedApplications: 3,
        inReviewApplications: 2,
        interviewApplications: 1,
        offeredApplications: 1,
        hiredApplications: 1,
        rejectedApplications: 0,
        lastUpdatedAt: '2026-03-05T00:00:00.000Z'
      },
      activity: {
        count: 1,
        filters: { type: 'ALL', actorId: null, from: null, to: null },
        pageInfo: { cursor: '0', nextCursor: null, limit: 10, total: 1 },
        items: [
          {
            id: 'ev-1',
            type: 'KYC',
            action: 'STATUS_CHANGED',
            entityType: 'KYC_SESSION',
            entityId: 's-1',
            actorType: 'ADMIN',
            actorId: 'admin-1',
            statusFrom: 'SUBMITTED',
            statusTo: 'VERIFIED',
            title: 'Verified',
            description: 'Status changed',
            createdAt: '2026-03-05T02:25:00.000Z'
          }
        ]
      },
      nowMs: Date.parse('2026-03-05T02:30:00.000Z')
    });

    expect(signals).toHaveLength(1);
    expect(signals[0].id).toBe('ops-normal');
  });
});
