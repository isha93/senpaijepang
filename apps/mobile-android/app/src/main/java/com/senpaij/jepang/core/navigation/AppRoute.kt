package com.senpaij.jepang.core.navigation

sealed class AppRoute(val route: String) {
    data object Splash : AppRoute(AppRoutePattern.SPLASH)
    data object Login : AppRoute(AppRoutePattern.LOGIN)
    data object Register : AppRoute(AppRoutePattern.REGISTER)
    data object JobsList : AppRoute(AppRoutePattern.JOBS_LIST)
    data object Applications : AppRoute(AppRoutePattern.APPLICATIONS)
    data class JobDetail(val jobId: String) : AppRoute("jobs/$jobId")
    data object SavedJobs : AppRoute(AppRoutePattern.SAVED_JOBS)
    data object Feed : AppRoute(AppRoutePattern.FEED)
    data object SavedPosts : AppRoute(AppRoutePattern.SAVED_POSTS)
    data object Profile : AppRoute(AppRoutePattern.PROFILE)
    data object Kyc : AppRoute(AppRoutePattern.KYC)
    data class ApplicationJourney(val applicationId: String) : AppRoute("journey/$applicationId")
}

object AppRoutePattern {
    const val SPLASH = "splash"
    const val LOGIN = "login"
    const val REGISTER = "register"
    const val JOBS_LIST = "jobs"
    const val APPLICATIONS = "applications"

    const val ARG_JOB_ID = "jobId"
    const val JOB_DETAIL = "jobs/{$ARG_JOB_ID}"

    const val SAVED_JOBS = "saved-jobs"
    const val FEED = "feed"
    const val SAVED_POSTS = "saved-posts"
    const val PROFILE = "profile"
    const val KYC = "kyc"

    const val ARG_APPLICATION_ID = "applicationId"
    const val APPLICATION_JOURNEY = "journey/{$ARG_APPLICATION_ID}"
}
