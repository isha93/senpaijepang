package com.senpaij.jepang.app

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.senpaij.jepang.core.navigation.AppRoute
import com.senpaij.jepang.core.navigation.AppRoutePattern
import com.senpaij.jepang.core.navigation.NavigationCommand
import com.senpaij.jepang.core.navigation.NavigationManager
import com.senpaij.jepang.features.auth.presentation.LoginScreen
import com.senpaij.jepang.features.auth.presentation.LoginViewModel
import com.senpaij.jepang.features.auth.presentation.RegisterScreen
import com.senpaij.jepang.features.auth.presentation.RegisterViewModel
import com.senpaij.jepang.features.feed.presentation.FeedListScreen
import com.senpaij.jepang.features.feed.presentation.FeedListViewModel
import com.senpaij.jepang.features.feed.presentation.SavedPostsScreen
import com.senpaij.jepang.features.feed.presentation.SavedPostsViewModel
import com.senpaij.jepang.features.jobs.presentation.ApplicationJourneyScreen
import com.senpaij.jepang.features.jobs.presentation.ApplicationJourneyViewModel
import com.senpaij.jepang.features.jobs.presentation.ApplicationsScreen
import com.senpaij.jepang.features.jobs.presentation.ApplicationsViewModel
import com.senpaij.jepang.features.jobs.presentation.JobDetailScreen
import com.senpaij.jepang.features.jobs.presentation.JobDetailViewModel
import com.senpaij.jepang.features.jobs.presentation.JobsListScreen
import com.senpaij.jepang.features.jobs.presentation.JobsListViewModel
import com.senpaij.jepang.features.jobs.presentation.SavedJobsScreen
import com.senpaij.jepang.features.jobs.presentation.SavedJobsViewModel
import com.senpaij.jepang.features.kyc.presentation.KycScreen
import com.senpaij.jepang.features.kyc.presentation.KycViewModel
import com.senpaij.jepang.features.profile.presentation.ProfileScreen
import com.senpaij.jepang.features.profile.presentation.ProfileViewModel

@Composable
fun SenpaiJepangApp(appContainer: AppContainer = rememberAppContainer()) {
    val navController = rememberNavController()
    val navigationManager = remember { NavigationManager() }

    LaunchedEffect(navigationManager, navController) {
        navigationManager.commands.collect { command ->
            when (command) {
                is NavigationCommand.Navigate -> {
                    navController.navigate(command.route) {
                        launchSingleTop = command.launchSingleTop
                    }
                }

                is NavigationCommand.Replace -> {
                    navController.navigate(command.route) {
                        popUpTo(navController.graph.id) {
                            inclusive = true
                        }
                        launchSingleTop = true
                    }
                }

                NavigationCommand.Back -> navController.popBackStack()
                NavigationCommand.PopToRoot -> navController.popBackStack(
                    route = AppRoutePattern.SPLASH,
                    inclusive = false,
                )
            }
        }
    }

    NavHost(
        navController = navController,
        startDestination = AppRoutePattern.SPLASH,
    ) {
        composable(route = AppRoutePattern.SPLASH) {
            val bootstrapViewModel: AppBootstrapViewModel = viewModel(
                factory = AppBootstrapViewModel.factory(
                    authService = appContainer.authService,
                    navigationHandler = navigationManager,
                ),
            )

            LaunchedEffect(Unit) {
                bootstrapViewModel.bootstrapIfNeeded()
            }

            SplashScreen()
        }

        composable(route = AppRoutePattern.LOGIN) {
            val viewModel: LoginViewModel = viewModel(
                factory = LoginViewModel.factory(
                    authService = appContainer.authService,
                    navigationHandler = navigationManager,
                ),
            )

            LoginScreen(
                state = viewModel.uiState,
                onIdentifierChanged = viewModel::onIdentifierChanged,
                onPasswordChanged = viewModel::onPasswordChanged,
                onLoginClicked = viewModel::onLoginClicked,
                onRegisterClicked = viewModel::onRegisterClicked,
            )
        }

        composable(route = AppRoutePattern.REGISTER) {
            val viewModel: RegisterViewModel = viewModel(
                factory = RegisterViewModel.factory(
                    authService = appContainer.authService,
                    navigationHandler = navigationManager,
                ),
            )

            RegisterScreen(
                state = viewModel.uiState,
                onFullNameChanged = viewModel::onFullNameChanged,
                onEmailChanged = viewModel::onEmailChanged,
                onPasswordChanged = viewModel::onPasswordChanged,
                onRegisterClicked = viewModel::onRegisterClicked,
                onBackToLoginClicked = viewModel::onBackToLoginClicked,
            )
        }

        composable(route = AppRoutePattern.JOBS_LIST) {
            val viewModel: JobsListViewModel = viewModel(
                factory = JobsListViewModel.factory(
                    authService = appContainer.authService,
                    jobService = appContainer.jobService,
                    navigationHandler = navigationManager,
                ),
            )

            LaunchedEffect(Unit) {
                viewModel.loadIfNeeded()
            }

            JobsListScreen(
                state = viewModel.uiState,
                onRefresh = viewModel::refresh,
                onJobTapped = { jobId ->
                    navigationManager.navigate(AppRoute.JobDetail(jobId))
                },
                onToggleSaved = viewModel::onToggleSaved,
                onApplicationsTapped = {
                    navigationManager.navigate(AppRoute.Applications)
                },
                onSavedJobsTapped = {
                    navigationManager.navigate(AppRoute.SavedJobs)
                },
                onFeedTapped = {
                    navigationManager.navigate(AppRoute.Feed)
                },
                onProfileTapped = {
                    navigationManager.navigate(AppRoute.Profile)
                },
                onLogoutTapped = viewModel::onLogoutClicked,
            )
        }

        composable(
            route = AppRoutePattern.JOB_DETAIL,
            arguments = listOf(navArgument(AppRoutePattern.ARG_JOB_ID) { type = NavType.StringType }),
        ) {
            val jobId = it.arguments?.getString(AppRoutePattern.ARG_JOB_ID).orEmpty()
            val viewModel: JobDetailViewModel = viewModel(
                key = "job-detail-$jobId",
                factory = JobDetailViewModel.factory(
                    jobId = jobId,
                    jobService = appContainer.jobService,
                    navigationHandler = navigationManager,
                ),
            )

            JobDetailScreen(
                state = viewModel.uiState,
                onToggleSaved = viewModel::onToggleSaved,
                onApply = viewModel::onApplyClicked,
                onBack = viewModel::onBackClicked,
            )
        }

        composable(route = AppRoutePattern.APPLICATIONS) {
            val viewModel: ApplicationsViewModel = viewModel(
                factory = ApplicationsViewModel.factory(
                    jobService = appContainer.jobService,
                    navigationHandler = navigationManager,
                ),
            )

            LaunchedEffect(Unit) {
                viewModel.loadIfNeeded()
            }

            ApplicationsScreen(
                state = viewModel.uiState,
                onRefresh = viewModel::refresh,
                onOpenJourney = { applicationId ->
                    navigationManager.navigate(AppRoute.ApplicationJourney(applicationId))
                },
                onBack = viewModel::onBackClicked,
            )
        }

        composable(route = AppRoutePattern.SAVED_JOBS) {
            val viewModel: SavedJobsViewModel = viewModel(
                factory = SavedJobsViewModel.factory(
                    jobService = appContainer.jobService,
                    navigationHandler = navigationManager,
                ),
            )

            LaunchedEffect(Unit) {
                viewModel.loadIfNeeded()
            }

            SavedJobsScreen(
                state = viewModel.uiState,
                onRefresh = viewModel::refresh,
                onOpenJob = { jobId -> navigationManager.navigate(AppRoute.JobDetail(jobId)) },
                onRemoveSaved = viewModel::onRemoveSaved,
                onBack = viewModel::onBackClicked,
            )
        }

        composable(route = AppRoutePattern.FEED) {
            val viewModel: FeedListViewModel = viewModel(
                factory = FeedListViewModel.factory(
                    feedService = appContainer.feedService,
                    navigationHandler = navigationManager,
                ),
            )

            LaunchedEffect(Unit) {
                viewModel.loadIfNeeded()
            }

            FeedListScreen(
                state = viewModel.uiState,
                onRefresh = viewModel::refresh,
                onOpenSavedPosts = { navigationManager.navigate(AppRoute.SavedPosts) },
                onToggleSaved = viewModel::onToggleSaved,
                onBack = viewModel::onBackClicked,
            )
        }

        composable(route = AppRoutePattern.SAVED_POSTS) {
            val viewModel: SavedPostsViewModel = viewModel(
                factory = SavedPostsViewModel.factory(
                    feedService = appContainer.feedService,
                    navigationHandler = navigationManager,
                ),
            )

            LaunchedEffect(Unit) {
                viewModel.loadIfNeeded()
            }

            SavedPostsScreen(
                state = viewModel.uiState,
                onRefresh = viewModel::refresh,
                onRemoveSaved = viewModel::onRemoveSaved,
                onBack = viewModel::onBackClicked,
            )
        }

        composable(route = AppRoutePattern.PROFILE) {
            val viewModel: ProfileViewModel = viewModel(
                factory = ProfileViewModel.factory(
                    profileService = appContainer.profileService,
                    navigationHandler = navigationManager,
                ),
            )

            LaunchedEffect(Unit) {
                viewModel.loadIfNeeded()
            }

            ProfileScreen(
                state = viewModel.uiState,
                onRefresh = viewModel::refresh,
                onFullNameChanged = viewModel::onFullNameChanged,
                onAvatarUrlChanged = viewModel::onAvatarUrlChanged,
                onFinalRequestNoteChanged = viewModel::onFinalRequestNoteChanged,
                onSaveProfileClicked = viewModel::onSaveProfileClicked,
                onSubmitFinalRequestClicked = viewModel::onSubmitFinalRequestClicked,
                onOpenKycClicked = { navigationManager.navigate(AppRoute.Kyc) },
                onBack = viewModel::onBackClicked,
            )
        }

        composable(route = AppRoutePattern.KYC) {
            val viewModel: KycViewModel = viewModel(
                factory = KycViewModel.factory(
                    kycService = appContainer.kycService,
                    navigationHandler = navigationManager,
                ),
            )

            LaunchedEffect(Unit) {
                viewModel.loadIfNeeded()
            }

            KycScreen(
                state = viewModel.uiState,
                onRefresh = viewModel::refresh,
                onStartSession = viewModel::onStartSessionClicked,
                onDocumentTypeChanged = viewModel::onDocumentTypeChanged,
                onFileNameChanged = viewModel::onFileNameChanged,
                onContentTypeChanged = viewModel::onContentTypeChanged,
                onContentLengthChanged = viewModel::onContentLengthChanged,
                onChecksumChanged = viewModel::onChecksumChanged,
                onRequestUploadUrl = viewModel::onRequestUploadUrlClicked,
                onRegisterDocument = viewModel::onRegisterDocumentClicked,
                onSubmitSession = viewModel::onSubmitSessionClicked,
                onRefreshHistory = viewModel::onRefreshHistoryClicked,
                onBack = viewModel::onBackClicked,
            )
        }

        composable(
            route = AppRoutePattern.APPLICATION_JOURNEY,
            arguments = listOf(
                navArgument(AppRoutePattern.ARG_APPLICATION_ID) { type = NavType.StringType },
            ),
        ) {
            val applicationId = it.arguments?.getString(AppRoutePattern.ARG_APPLICATION_ID).orEmpty()
            val viewModel: ApplicationJourneyViewModel = viewModel(
                key = "application-journey-$applicationId",
                factory = ApplicationJourneyViewModel.factory(
                    applicationId = applicationId,
                    jobService = appContainer.jobService,
                    navigationHandler = navigationManager,
                ),
            )

            ApplicationJourneyScreen(
                state = viewModel.uiState,
                onRefresh = viewModel::load,
                onBack = viewModel::onBackClicked,
            )
        }
    }
}
