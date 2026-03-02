import Foundation

// MARK: - Shared sub-DTOs

struct JobLocationDTO: Decodable {
    let countryCode: String
    let city: String
    let displayLabel: String
}

struct JobEmployerDTO: Decodable {
    let id: String
    let name: String
    let logoUrl: String?
    let isVerifiedEmployer: Bool
}

struct JobViewerStateDTO: Decodable {
    let authenticated: Bool
    let saved: Bool
    let canApply: Bool
    let applyCta: String?
}

struct PageInfoDTO: Decodable {
    let cursor: String?
    let nextCursor: String?
    let limit: Int
    let total: Int
}

// MARK: - Job list

struct JobListResponseDTO: Decodable {
    let items: [JobListItemDTO]
    let pageInfo: PageInfoDTO
}

struct JobListItemDTO: Decodable {
    let id: String
    let title: String
    let employmentType: String
    let visaSponsorship: Bool
    let location: JobLocationDTO
    let employer: JobEmployerDTO
    let viewerState: JobViewerStateDTO?

    func toJob() -> Job {
        Job(
            id: id,
            title: title,
            companyName: employer.name,
            location: location.displayLabel,
            salaryRange: nil,
            isSaved: viewerState?.saved ?? false,
            sector: nil,
            postedAt: nil,
            companyLogoInitial: employer.name.first.map(String.init),
            isVerifiedEmployer: employer.isVerifiedEmployer
        )
    }
}

// MARK: - Job detail

struct JobDetailResponseDTO: Decodable {
    struct DetailJobDTO: Decodable {
        let id: String
        let title: String
        let employmentType: String
        let visaSponsorship: Bool
        let description: String
        let requirements: [String]
        let location: JobLocationDTO
        let employer: JobEmployerDTO
    }

    let job: DetailJobDTO
    let viewerState: JobViewerStateDTO?

    func toJobDetail(isSavedOverride: Bool? = nil) -> JobDetail {
        let saved = isSavedOverride ?? viewerState?.saved ?? false
        let domainJob = Job(
            id: job.id,
            title: job.title,
            companyName: job.employer.name,
            location: job.location.displayLabel,
            salaryRange: nil,
            isSaved: saved,
            sector: nil,
            postedAt: nil,
            companyLogoInitial: job.employer.name.first.map(String.init),
            isVerifiedEmployer: job.employer.isVerifiedEmployer
        )
        let employmentLabel = job.employmentType
            .replacingOccurrences(of: "_", with: " ")
            .capitalized
        return JobDetail(
            job: domainJob,
            description: job.description,
            requirements: job.requirements,
            benefits: [],
            employmentType: employmentLabel,
            isVisaSponsored: job.visaSponsorship,
            locationDetail: job.location.displayLabel
        )
    }
}

// MARK: - Save / unsave

struct SavedJobResponseDTO: Decodable {
    let saved: Bool
    let jobId: String
}

// MARK: - Apply

struct ApplyJobResponseDTO: Decodable {
    struct ApplicationDTO: Decodable {
        let id: String
        let jobId: String
        let status: String
        let note: String?
        let createdAt: String
        let updatedAt: String
    }

    let created: Bool
    let application: ApplicationDTO
}
