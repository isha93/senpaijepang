package com.senpaij.jepang.features.kyc.presentation

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.senpaij.jepang.core.navigation.NavigationHandler
import com.senpaij.jepang.core.network.ApiResult
import com.senpaij.jepang.features.kyc.domain.KycDocument
import com.senpaij.jepang.features.kyc.domain.KycService
import com.senpaij.jepang.features.kyc.domain.KycSession
import com.senpaij.jepang.features.kyc.domain.KycStatusEvent
import com.senpaij.jepang.features.kyc.domain.KycTrustStatus
import com.senpaij.jepang.features.kyc.domain.KycUploadUrlResult
import kotlinx.coroutines.launch

class KycViewModel(
    private val kycService: KycService,
    private val navigationHandler: NavigationHandler,
) : ViewModel() {
    private var initialized = false

    var uiState by mutableStateOf(KycUiState())
        private set

    fun loadIfNeeded() {
        if (initialized) return
        initialized = true
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            uiState = uiState.copy(
                isLoading = true,
                errorMessage = null,
                successMessage = null,
            )

            var nextStatus: KycTrustStatus = uiState.status
            var nextSession: KycSession? = uiState.session
            var nextEvents = uiState.historyEvents
            var nextError: String? = null

            when (val statusResult = kycService.getStatus()) {
                is ApiResult.Success -> {
                    nextStatus = statusResult.data.status
                    nextSession = statusResult.data.session
                }

                is ApiResult.Failure -> {
                    nextError = statusResult.error.message
                }
            }

            if (nextSession != null) {
                when (val historyResult = kycService.getHistory(sessionId = nextSession.id)) {
                    is ApiResult.Success -> {
                        nextEvents = historyResult.data.events
                    }

                    is ApiResult.Failure -> {
                        if (nextError == null) {
                            nextError = historyResult.error.message
                        }
                    }
                }
            }

            uiState = uiState.copy(
                isLoading = false,
                status = nextStatus,
                session = nextSession,
                historyEvents = nextEvents,
                errorMessage = nextError,
            )
        }
    }

    fun onDocumentTypeChanged(value: String) {
        uiState = uiState.copy(documentType = value, errorMessage = null, successMessage = null)
    }

    fun onFileNameChanged(value: String) {
        uiState = uiState.copy(fileName = value, errorMessage = null, successMessage = null)
    }

    fun onContentTypeChanged(value: String) {
        uiState = uiState.copy(contentType = value, errorMessage = null, successMessage = null)
    }

    fun onContentLengthChanged(value: String) {
        uiState = uiState.copy(contentLength = value, errorMessage = null, successMessage = null)
    }

    fun onChecksumChanged(value: String) {
        uiState = uiState.copy(checksumSha256 = value, errorMessage = null, successMessage = null)
    }

    fun onStartSessionClicked() {
        if (uiState.isStartingSession) return

        viewModelScope.launch {
            uiState = uiState.copy(
                isStartingSession = true,
                errorMessage = null,
                successMessage = null,
            )

            when (val result = kycService.startSession(provider = "manual")) {
                is ApiResult.Success -> {
                    uiState = uiState.copy(
                        isStartingSession = false,
                        status = result.data.status,
                        session = result.data.session,
                        successMessage = "KYC session started.",
                    )
                    loadHistoryForSession(result.data.session?.id)
                }

                is ApiResult.Failure -> {
                    uiState = uiState.copy(
                        isStartingSession = false,
                        errorMessage = result.error.message,
                    )
                }
            }
        }
    }

    fun onRequestUploadUrlClicked() {
        if (uiState.isRequestingUploadUrl) return

        val documentType = uiState.documentType.trim()
        val fileName = uiState.fileName.trim()
        val contentType = uiState.contentType.trim()
        val contentLength = uiState.contentLength.trim().toIntOrNull()
        val checksum = uiState.checksumSha256.trim().lowercase()

        when {
            documentType.isBlank() -> {
                uiState = uiState.copy(errorMessage = "Document type is required.")
                return
            }

            fileName.isBlank() -> {
                uiState = uiState.copy(errorMessage = "File name is required.")
                return
            }

            contentType.isBlank() -> {
                uiState = uiState.copy(errorMessage = "Content type is required.")
                return
            }

            contentLength == null || contentLength <= 0 -> {
                uiState = uiState.copy(errorMessage = "Content length must be a positive number.")
                return
            }

            !checksum.matches(CHECKSUM_REGEX) -> {
                uiState = uiState.copy(errorMessage = "Checksum must be 64 lowercase hex characters.")
                return
            }
        }

        viewModelScope.launch {
            uiState = uiState.copy(
                isRequestingUploadUrl = true,
                errorMessage = null,
                successMessage = null,
            )

            when (
                val result = kycService.requestUploadUrl(
                    sessionId = uiState.session?.id,
                    documentType = documentType,
                    fileName = fileName,
                    contentType = contentType,
                    contentLength = contentLength,
                    checksumSha256 = checksum,
                )
            ) {
                is ApiResult.Success -> {
                    uiState = uiState.copy(
                        isRequestingUploadUrl = false,
                        status = result.data.status,
                        session = result.data.session,
                        lastUpload = result.data,
                        checksumSha256 = checksum,
                        successMessage = "Upload URL generated. Continue with upload and metadata submit.",
                    )
                }

                is ApiResult.Failure -> {
                    uiState = uiState.copy(
                        isRequestingUploadUrl = false,
                        errorMessage = result.error.message,
                    )
                }
            }
        }
    }

    fun onRegisterDocumentClicked() {
        if (uiState.isRegisteringDocument) return

        val sessionId = uiState.session?.id
        val upload = uiState.lastUpload
        val documentType = uiState.documentType.trim()
        val checksum = uiState.checksumSha256.trim().lowercase()

        when {
            upload == null -> {
                uiState = uiState.copy(errorMessage = "Request upload URL first.")
                return
            }

            documentType.isBlank() -> {
                uiState = uiState.copy(errorMessage = "Document type is required.")
                return
            }

            !checksum.matches(CHECKSUM_REGEX) -> {
                uiState = uiState.copy(errorMessage = "Checksum must be 64 lowercase hex characters.")
                return
            }
        }

        viewModelScope.launch {
            uiState = uiState.copy(
                isRegisteringDocument = true,
                errorMessage = null,
                successMessage = null,
            )

            when (
                val result = kycService.uploadDocumentMetadata(
                    sessionId = sessionId,
                    documentType = documentType,
                    objectKey = upload.upload.objectKey,
                    checksumSha256 = checksum,
                    metadata = mapOf("source" to "android-app"),
                )
            ) {
                is ApiResult.Success -> {
                    uiState = uiState.copy(
                        isRegisteringDocument = false,
                        status = result.data.status,
                        session = result.data.session,
                        lastDocument = result.data.document,
                        successMessage = "Document metadata uploaded.",
                    )
                    loadHistoryForSession(result.data.session.id)
                }

                is ApiResult.Failure -> {
                    uiState = uiState.copy(
                        isRegisteringDocument = false,
                        errorMessage = result.error.message,
                    )
                }
            }
        }
    }

    fun onSubmitSessionClicked() {
        if (uiState.isSubmittingSession) return

        val sessionId = uiState.session?.id
        if (sessionId.isNullOrBlank()) {
            uiState = uiState.copy(errorMessage = "KYC session not found. Start session first.")
            return
        }

        viewModelScope.launch {
            uiState = uiState.copy(
                isSubmittingSession = true,
                errorMessage = null,
                successMessage = null,
            )

            when (val result = kycService.submitSession(sessionId = sessionId)) {
                is ApiResult.Success -> {
                    uiState = uiState.copy(
                        isSubmittingSession = false,
                        status = result.data.status,
                        session = result.data.session,
                        successMessage = "KYC session submitted.",
                    )
                    loadHistoryForSession(sessionId)
                }

                is ApiResult.Failure -> {
                    uiState = uiState.copy(
                        isSubmittingSession = false,
                        errorMessage = result.error.message,
                    )
                }
            }
        }
    }

    fun onRefreshHistoryClicked() {
        loadHistoryForSession(uiState.session?.id)
    }

    private fun loadHistoryForSession(sessionId: String?) {
        if (sessionId.isNullOrBlank()) return

        viewModelScope.launch {
            uiState = uiState.copy(isLoadingHistory = true)

            when (val result = kycService.getHistory(sessionId = sessionId)) {
                is ApiResult.Success -> {
                    uiState = uiState.copy(
                        isLoadingHistory = false,
                        historyEvents = result.data.events,
                    )
                }

                is ApiResult.Failure -> {
                    uiState = uiState.copy(
                        isLoadingHistory = false,
                        errorMessage = result.error.message,
                    )
                }
            }
        }
    }

    fun onBackClicked() {
        navigationHandler.back()
    }

    companion object {
        private val CHECKSUM_REGEX = Regex("^[a-f0-9]{64}$")

        fun factory(
            kycService: KycService,
            navigationHandler: NavigationHandler,
        ): ViewModelProvider.Factory {
            return viewModelFactory {
                initializer {
                    KycViewModel(
                        kycService = kycService,
                        navigationHandler = navigationHandler,
                    )
                }
            }
        }
    }
}

data class KycUiState(
    val isLoading: Boolean = false,
    val isStartingSession: Boolean = false,
    val isRequestingUploadUrl: Boolean = false,
    val isRegisteringDocument: Boolean = false,
    val isSubmittingSession: Boolean = false,
    val isLoadingHistory: Boolean = false,
    val status: KycTrustStatus = KycTrustStatus.NOT_STARTED,
    val session: KycSession? = null,
    val historyEvents: List<KycStatusEvent> = emptyList(),
    val documentType: String = "PASSPORT",
    val fileName: String = "passport-front.jpg",
    val contentType: String = "image/jpeg",
    val contentLength: String = "512000",
    val checksumSha256: String = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    val lastUpload: KycUploadUrlResult? = null,
    val lastDocument: KycDocument? = null,
    val errorMessage: String? = null,
    val successMessage: String? = null,
)
