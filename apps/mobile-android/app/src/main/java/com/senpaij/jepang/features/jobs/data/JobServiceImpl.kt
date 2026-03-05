package com.senpaij.jepang.features.jobs.data

import com.senpaij.jepang.core.network.ApiClient
import com.senpaij.jepang.core.network.ApiErrorMapper
import com.senpaij.jepang.core.network.ApiResult
import com.senpaij.jepang.features.jobs.domain.ApplicationJourney
import com.senpaij.jepang.features.jobs.domain.JobApplyResult
import com.senpaij.jepang.features.jobs.domain.JobApplicationSummary
import com.senpaij.jepang.features.jobs.domain.JobDetailEnvelope
import com.senpaij.jepang.features.jobs.domain.JobService
import com.senpaij.jepang.features.jobs.domain.JobSummary

class JobServiceImpl(apiClient: ApiClient) : JobService {
    private val jobsApi = apiClient.create(JobsApi::class.java)

    override suspend fun listJobs(query: String?): ApiResult<List<JobSummary>> {
        return safeCall {
            jobsApi.listJobs(query = query).items.map { it.toDomain() }
        }
    }

    override suspend fun getJobDetail(jobId: String): ApiResult<JobDetailEnvelope> {
        return safeCall {
            jobsApi.getJobDetail(jobId = jobId).toDomain()
        }
    }

    override suspend fun listSavedJobs(): ApiResult<List<JobSummary>> {
        return safeCall {
            jobsApi.listSavedJobs().items.map { it.toDomain() }
        }
    }

    override suspend fun saveJob(jobId: String): ApiResult<Boolean> {
        return safeCall {
            jobsApi.saveJob(SaveJobRequestDto(jobId = jobId)).saved
        }
    }

    override suspend fun unsaveJob(jobId: String): ApiResult<Boolean> {
        return safeCall {
            jobsApi.unsaveJob(jobId = jobId).saved
        }
    }

    override suspend fun applyToJob(jobId: String, note: String?): ApiResult<JobApplyResult> {
        return safeCall {
            jobsApi.applyToJob(
                jobId = jobId,
                request = JobApplyRequestDto(note = note),
            ).toDomain()
        }
    }

    override suspend fun listApplications(): ApiResult<List<JobApplicationSummary>> {
        return safeCall {
            jobsApi.listApplications().items.map { it.toDomain() }
        }
    }

    override suspend fun getApplicationJourney(applicationId: String): ApiResult<ApplicationJourney> {
        return safeCall {
            jobsApi.getApplicationJourney(applicationId = applicationId).toDomain()
        }
    }

    private suspend fun <T> safeCall(block: suspend () -> T): ApiResult<T> {
        return try {
            ApiResult.Success(block())
        } catch (throwable: Throwable) {
            ApiResult.Failure(ApiErrorMapper.fromThrowable(throwable))
        }
    }
}
