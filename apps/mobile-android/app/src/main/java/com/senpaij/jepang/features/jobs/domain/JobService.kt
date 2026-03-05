package com.senpaij.jepang.features.jobs.domain

import com.senpaij.jepang.core.network.ApiResult

interface JobService {
    suspend fun listJobs(query: String? = null): ApiResult<List<JobSummary>>
    suspend fun getJobDetail(jobId: String): ApiResult<JobDetailEnvelope>
    suspend fun listSavedJobs(): ApiResult<List<JobSummary>>
    suspend fun saveJob(jobId: String): ApiResult<Boolean>
    suspend fun unsaveJob(jobId: String): ApiResult<Boolean>
    suspend fun applyToJob(jobId: String, note: String? = null): ApiResult<JobApplyResult>
    suspend fun listApplications(): ApiResult<List<JobApplicationSummary>>
    suspend fun getApplicationJourney(applicationId: String): ApiResult<ApplicationJourney>
}
