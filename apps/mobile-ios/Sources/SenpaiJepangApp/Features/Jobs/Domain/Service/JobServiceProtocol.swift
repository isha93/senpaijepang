import Foundation

struct Job: Equatable, Sendable, Identifiable {
    let id: String
    let title: String
    let companyName: String
    let location: String
    let salaryRange: String?
    let isSaved: Bool
    let sector: String?
    let postedAt: Date?
    let companyLogoInitial: String?
    let isVerifiedEmployer: Bool

    init(
        id: String,
        title: String,
        companyName: String,
        location: String,
        salaryRange: String? = nil,
        isSaved: Bool = false,
        sector: String? = nil,
        postedAt: Date? = nil,
        companyLogoInitial: String? = nil,
        isVerifiedEmployer: Bool = false
    ) {
        self.id = id
        self.title = title
        self.companyName = companyName
        self.location = location
        self.salaryRange = salaryRange
        self.isSaved = isSaved
        self.sector = sector
        self.postedAt = postedAt
        self.companyLogoInitial = companyLogoInitial
        self.isVerifiedEmployer = isVerifiedEmployer
    }
}

struct JobDetail: Equatable, Sendable {
    let job: Job
    let description: String
    let requirements: [String]
    let benefits: [String]
    let employmentType: String?
    let isVisaSponsored: Bool
    let locationDetail: String?

    init(
        job: Job,
        description: String,
        requirements: [String] = [],
        benefits: [String] = [],
        employmentType: String? = nil,
        isVisaSponsored: Bool = false,
        locationDetail: String? = nil
    ) {
        self.job = job
        self.description = description
        self.requirements = requirements
        self.benefits = benefits
        self.employmentType = employmentType
        self.isVisaSponsored = isVisaSponsored
        self.locationDetail = locationDetail
    }
}

@MainActor
protocol JobServiceProtocol {
    func fetchJobs() async throws -> [Job]
    func fetchJobDetail(jobId: String) async throws -> JobDetail
    func toggleSaveJob(jobId: String) async throws -> Job
    func fetchSavedJobs() async throws -> [Job]
}
