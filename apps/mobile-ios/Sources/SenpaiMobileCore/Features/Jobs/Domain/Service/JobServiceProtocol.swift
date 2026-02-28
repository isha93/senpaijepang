import Foundation

public struct Job: Equatable, Sendable, Identifiable {
    public let id: String
    public let title: String
    public let companyName: String
    public let location: String
    public let salaryRange: String?
    public let isSaved: Bool
    public let sector: String?
    public let postedAt: Date?
    public let companyLogoInitial: String?
    public let isVerifiedEmployer: Bool

    public init(
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

public struct JobDetail: Equatable, Sendable {
    public let job: Job
    public let description: String
    public let requirements: [String]
    public let benefits: [String]
    public let employmentType: String?
    public let isVisaSponsored: Bool
    public let locationDetail: String?

    public init(
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
public protocol JobServiceProtocol {
    func fetchJobs() async throws -> [Job]
    func fetchJobDetail(jobId: String) async throws -> JobDetail
    func toggleSaveJob(jobId: String) async throws -> Job
    func fetchSavedJobs() async throws -> [Job]
}
