package com.senpaij.jepang.features.jobs.data

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface JobsApi {
    @GET("v1/jobs")
    suspend fun listJobs(
        @Query("q") query: String?,
        @Query("limit") limit: Int? = 20,
    ): JobListResponseDto

    @GET("v1/jobs/{jobId}")
    suspend fun getJobDetail(@Path("jobId") jobId: String): JobDetailResponseDto

    @POST("v1/jobs/{jobId}/applications")
    suspend fun applyToJob(
        @Path("jobId") jobId: String,
        @Body request: JobApplyRequestDto?,
    ): JobApplyResponseDto

    @GET("v1/users/me/saved-jobs")
    suspend fun listSavedJobs(@Query("limit") limit: Int? = 20): JobListResponseDto

    @POST("v1/users/me/saved-jobs")
    suspend fun saveJob(@Body request: SaveJobRequestDto): SaveJobResponseDto

    @DELETE("v1/users/me/saved-jobs/{jobId}")
    suspend fun unsaveJob(@Path("jobId") jobId: String): SaveJobResponseDto

    @GET("v1/users/me/applications")
    suspend fun listApplications(@Query("limit") limit: Int? = 20): ApplicationListResponseDto

    @GET("v1/users/me/applications/{applicationId}/journey")
    suspend fun getApplicationJourney(@Path("applicationId") applicationId: String): ApplicationJourneyResponseDto
}
