import Combine
import Foundation

@MainActor
final class JobDetailViewModel: ObservableObject, ManagedTask {
    @Published var detail: JobDetail?
    @Published var isLoading: Bool
    @Published var errorMessage: String?

    let jobId: String
    private let jobService: JobServiceProtocol
    private let navigation: NavigationHandling

    init(
        jobId: String,
        jobService: JobServiceProtocol,
        navigation: NavigationHandling
    ) {
        self.jobId = jobId
        self.jobService = jobService
        self.navigation = navigation
        self.detail = nil
        self.isLoading = false
        self.errorMessage = nil
    }

    func loadDetail() async {
        if let result = await executeTask({
            try await self.jobService.fetchJobDetail(jobId: self.jobId)
        }) {
            detail = result
        } else {
            detail = Self.mockDetails[jobId] ?? Self.fallbackDetail(jobId: jobId)
        }
    }

    func applyJob() {
        if let job = detail?.job {
            navigation.presentApplication(for: job)
        }
    }

    func goBack() {
        navigation.pop()
    }

    // MARK: - Fallback for unknown IDs
    private static func fallbackDetail(jobId: String) -> JobDetail {
        let job = JobsListViewModel.mockJobs.first(where: { $0.id == jobId })
        return JobDetail(
            job: job ?? Job(id: jobId, title: "Job Position", companyName: "Company", location: "Japan"),
            description: "This position is currently accepting applications. Contact the employer for more details about the role, requirements, and benefits.",
            requirements: ["Valid work visa or SSW certification", "Basic Japanese proficiency (JLPT N4+)"],
            employmentType: "Full-time",
            isVisaSponsored: true,
            locationDetail: job?.location ?? "Japan"
        )
    }

    // MARK: - Mock Details (keyed by job ID)
    static let mockDetails: [String: JobDetail] = [

        // 1 — Construction Skilled Worker
        "1": JobDetail(
            job: JobsListViewModel.mockJobs[0],
            description: """
            Tokyo Build Corp is seeking experienced construction workers for large-scale infrastructure \
            projects across the Tokyo metropolitan area. You will work on commercial buildings, bridges, \
            and public facilities alongside a multicultural team. We value safety, precision, and teamwork. \
            Full relocation support and on-the-job training provided for international hires.
            """,
            requirements: [
                "Minimum 2 years of construction experience (concrete, formwork, or reinforcement).",
                "SSW Type 1 visa or equivalent work authorization.",
                "Basic Japanese language ability (JLPT N4 or conversational).",
                "Physical fitness and ability to work outdoors in various weather conditions.",
                "Willingness to relocate to Tokyo for a minimum of 2 years.",
            ],
            benefits: [
                "Visa sponsorship & renewal support",
                "Company housing (¥20,000/mo subsidized rent)",
                "Free Japanese language classes twice a week",
                "Health insurance & pension enrollment",
                "Overtime pay at 1.25× base rate",
                "Annual return flight to home country",
            ],
            employmentType: "Full-time",
            isVisaSponsored: true,
            locationDetail: "Shinjuku, Tokyo"
        ),

        // 2 — Scaffolding & Steel Frame
        "2": JobDetail(
            job: JobsListViewModel.mockJobs[1],
            description: """
            Kansai Construction Co. is hiring scaffolding and steel frame workers for ongoing projects \
            in the Osaka-Kobe corridor. Our team handles high-rise construction and industrial plant \
            renovations. We offer a structured career path from technician to site supervisor. \
            International workers are welcome — we have staff from 8 different countries.
            """,
            requirements: [
                "Experience with scaffolding assembly (Kumiage) or steel frame installation.",
                "Height work certification (高所作業) preferred, training available.",
                "JLPT N5 or basic Japanese communication skills.",
                "Physical stamina for demanding construction environments.",
            ],
            benefits: [
                "Visa sponsorship provided",
                "Shared company dormitory (furnished, Wi-Fi included)",
                "Skill certification support (会社負担)",
                "Performance bonuses every 6 months",
                "Transportation allowance up to ¥15,000/mo",
            ],
            employmentType: "Full-time",
            isVisaSponsored: true,
            locationDetail: "Osaka, Kansai Region"
        ),

        // 3 — Food Processing Staff
        "3": JobDetail(
            job: JobsListViewModel.mockJobs[2],
            description: """
            Join Osaka Foods Ltd., one of Kansai's leading food manufacturers. You will work in our \
            HACCP-certified processing facility handling ingredient preparation, quality inspection, \
            and packaging operations. Our facility produces ready-to-eat meals for major convenience \
            store chains. Clean, temperature-controlled environment with regular working hours.
            """,
            requirements: [
                "Food handling experience preferred (not required — full training provided).",
                "Attention to detail and hygiene awareness.",
                "Ability to stand for extended periods (8-hour shifts).",
                "Basic Japanese communication (N5 level sufficient).",
                "No criminal record / clean background check.",
            ],
            benefits: [
                "Visa sponsorship & SSW transition support",
                "Company cafeteria (free meals during shifts)",
                "Uniform and safety equipment provided",
                "Night shift premium: +25% pay",
                "Social insurance (health, pension, unemployment)",
                "Paid annual leave: 10 days from year 1",
            ],
            employmentType: "Full-time",
            isVisaSponsored: true,
            locationDetail: "Namba, Osaka"
        ),

        // 4 — Restaurant Kitchen Staff
        "4": JobDetail(
            job: JobsListViewModel.mockJobs[3],
            description: """
            Ichiban Ramen Chain is expanding! We're looking for kitchen staff across our Shibuya \
            locations. You'll learn authentic ramen preparation techniques from our head chef while \
            serving hundreds of happy customers daily. This is a great opportunity to build a career \
            in Japan's vibrant food service industry. Fast-paced, fun, and rewarding work environment.
            """,
            requirements: [
                "Passion for Japanese food culture.",
                "Restaurant or kitchen experience is a plus (training provided).",
                "Ability to work in a fast-paced environment.",
                "Flexible schedule including weekends and holidays.",
                "Basic Japanese or willingness to learn (we provide support).",
            ],
            benefits: [
                "Free ramen every shift 🍜",
                "Tips shared among kitchen team",
                "Cross-training opportunity (kitchen → management track)",
                "Staff discount at all chain locations",
                "2 days off per week (rotating schedule)",
            ],
            employmentType: "Full-time",
            isVisaSponsored: false,
            locationDetail: "Shibuya, Tokyo"
        ),

        // 5 — Care Worker (Kaigo)
        "5": JobDetail(
            job: JobsListViewModel.mockJobs[4],
            description: """
            Kyoto Care Home is a warm, family-style elderly care facility in the heart of Kyoto. \
            We are looking for compassionate care workers to support our residents' daily lives \
            including meals, bathing assistance, recreational activities, and emotional support. \
            Japan's aging society makes this one of the most stable and rewarding career paths. \
            We provide Kaigo certification training and a clear path to permanent residency.
            """,
            requirements: [
                "Genuine compassion for elderly care (experience not required).",
                "EPA or SSW (Nursing Care) visa qualification, or willingness to obtain.",
                "JLPT N4 or higher (N3 preferred for patient communication).",
                "Physical ability to assist with mobility and daily living activities.",
                "Clean health check and TB screening.",
            ],
            benefits: [
                "Visa sponsorship + kaigo certification (介護福祉士) support",
                "Private room in staff housing (¥15,000/mo)",
                "Pathway to permanent residency (永住権) after 3 years",
                "Kaigo worker allowance: +¥8,000/mo government subsidy",
                "Night shift premium: +30% pay",
                "Annual health checkup covered",
                "Free JLPT preparation classes",
            ],
            employmentType: "Full-time",
            isVisaSponsored: true,
            locationDetail: "Kyoto"
        ),

        // 6 — Elderly Care Support Staff
        "6": JobDetail(
            job: JobsListViewModel.mockJobs[5],
            description: """
            Sakura Senior Living operates a modern assisted living facility in Yokohama. We provide \
            holistic care combining medical support, rehabilitation, and community activities. \
            As a care support staff, you'll work alongside nurses and therapists to ensure our \
            residents maintain their independence and quality of life. Multicultural team with \
            staff from Indonesia, Vietnam, and the Philippines.
            """,
            requirements: [
                "Interest in healthcare and elderly support.",
                "Physical fitness for assisting residents with transfers and mobility.",
                "JLPT N4 minimum (daily communication with residents and staff).",
                "Willingness to work rotating shifts (day and night).",
            ],
            benefits: [
                "Visa sponsorship provided",
                "Company apartment (shared, fully furnished)",
                "Certification support (初任者研修 paid by company)",
                "Monthly team dinners and cultural events",
                "Overtime pay at 1.25× rate",
            ],
            employmentType: "Full-time",
            isVisaSponsored: true,
            locationDetail: "Yokohama, Kanagawa"
        ),

        // 7 — Agriculture Worker
        "7": JobDetail(
            job: JobsListViewModel.mockJobs[6],
            description: """
            Green Fields Co. manages over 50 hectares of farmland in Hokkaido, Japan's agricultural \
            heartland. We grow vegetables, rice, and dairy products using a mix of traditional and \
            modern farming techniques. Seasonal work with beautiful natural surroundings. Perfect \
            for those who love the outdoors and want to experience rural Japan. Housing and meals \
            provided on-site.
            """,
            requirements: [
                "Physical fitness for outdoor labor (planting, harvesting, greenhouse work).",
                "Previous agricultural experience preferred but not required.",
                "Willingness to live in a rural area with limited public transport.",
                "Team player attitude — small crew, close community.",
            ],
            benefits: [
                "On-site housing provided (rent-free)",
                "Three meals per day during work season",
                "Fresh farm produce for personal use",
                "Contract renewal with salary increase after each season",
                "Explore Hokkaido during off-season",
            ],
            employmentType: "Seasonal / Contract",
            isVisaSponsored: false,
            locationDetail: "Tokachi, Hokkaido"
        ),

        // 8 — Greenhouse Cultivation
        "8": JobDetail(
            job: JobsListViewModel.mockJobs[7],
            description: """
            Aichi Farm Group operates high-tech greenhouse facilities producing tomatoes, strawberries, \
            and herbs year-round. We use IoT monitoring, hydroponic systems, and climate-controlled \
            environments. This is modern agriculture — clean, technical, and innovative. We're looking \
            for staff who are curious about agricultural technology and willing to learn.
            """,
            requirements: [
                "Interest in modern agriculture and greenhouse technology.",
                "Basic understanding of plant cultivation (training provided).",
                "Comfortable working in controlled greenhouse environments.",
                "Basic Japanese (N5 level) — multilingual team supports learning.",
                "SSW Agricultural visa or equivalent.",
            ],
            benefits: [
                "Visa sponsorship and transition support",
                "Company housing (modern share house, ¥18,000/mo)",
                "IoT/AgriTech training and certification",
                "Regular working hours (no heavy outdoor labor)",
                "Social insurance package",
                "Annual bonus based on harvest performance",
            ],
            employmentType: "Full-time",
            isVisaSponsored: true,
            locationDetail: "Nagoya, Aichi"
        ),

        // 9 — Hotel Front Desk
        "9": JobDetail(
            job: JobsListViewModel.mockJobs[8],
            description: """
            Ginza Grand Hotel is a premium business hotel in Tokyo's most prestigious district. \
            We welcome guests from around the world and pride ourselves on exceptional Japanese \
            hospitality (おもてなし). As front desk staff, you'll handle check-in/check-out, \
            guest inquiries, concierge services, and coordination with housekeeping. Multilingual \
            ability is highly valued. Career growth from staff to supervisor to manager.
            """,
            requirements: [
                "Fluent in English + basic Japanese (N3 preferred).",
                "Hotel or customer service experience (1+ year preferred).",
                "Professional appearance and excellent communication skills.",
                "Computer literacy (PMS systems — training provided).",
                "Flexible schedule including weekends, holidays, and night shifts.",
            ],
            benefits: [
                "Visa sponsorship for SSW Hospitality",
                "Staff meals during shifts",
                "Uniform provided and laundered",
                "Hotel industry certification support",
                "Staff rate at partner hotels nationwide (70% discount)",
                "Annual performance bonus",
                "Career path: Staff → Supervisor → Front Office Manager",
            ],
            employmentType: "Full-time",
            isVisaSponsored: true,
            locationDetail: "Ginza, Tokyo"
        ),

        // 10 — Housekeeping Supervisor
        "10": JobDetail(
            job: JobsListViewModel.mockJobs[9],
            description: """
            Nara Ryokan Heritage is a traditional Japanese inn (旅館) offering guests an authentic \
            cultural experience. As Housekeeping Supervisor, you'll lead a small team maintaining \
            our tatami rooms, gardens, and common areas to the highest standards. This is a unique \
            opportunity to work in Japan's cultural hospitality sector while living in the historic \
            city of Nara, surrounded by temples and deer parks.
            """,
            requirements: [
                "Housekeeping or cleaning experience (hotel/ryokan preferred).",
                "Leadership skills — will supervise 3-5 team members.",
                "Understanding of Japanese cleanliness standards.",
                "Basic Japanese communication (N4+ for team coordination).",
                "Eye for detail and pride in creating perfect environments.",
            ],
            benefits: [
                "Staff accommodation at the ryokan",
                "Traditional Japanese meals on duty",
                "Cultural immersion (tea ceremony, flower arrangement classes)",
                "2 days off per week",
                "Annual kimono allowance for special occasions",
            ],
            employmentType: "Full-time",
            isVisaSponsored: false,
            locationDetail: "Nara"
        ),

        // 11 — Auto Parts Assembly
        "11": JobDetail(
            job: JobsListViewModel.mockJobs[10],
            description: """
            Aichi Motors Manufacturing is a tier-1 auto parts supplier for major Japanese car \
            manufacturers. You'll work on our assembly line producing precision engine components \
            and transmission parts. Our Toyota City facility is state-of-the-art with robotics-assisted \
            production. We follow kaizen (continuous improvement) methodology and invest heavily in \
            worker skill development. Strong career path in Japan's biggest industry.
            """,
            requirements: [
                "Manufacturing or factory experience (1+ year preferred).",
                "Understanding of assembly line operations and quality control.",
                "Ability to follow standard operating procedures precisely.",
                "JLPT N4 or basic Japanese (safety instruction comprehension).",
                "Clean driving license is a plus (factory is suburban).",
            ],
            benefits: [
                "Visa sponsorship (SSW Manufacturing)",
                "Company dormitory (single room, ¥12,000/mo)",
                "Comprehensive training program (3 months on-boarding)",
                "Regular raises based on skill certification (技能検定)",
                "Overtime available (1.25× base, 1.5× on holidays)",
                "Company shuttle bus from dormitory",
                "Health checkup every 6 months",
            ],
            employmentType: "Full-time",
            isVisaSponsored: true,
            locationDetail: "Toyota City, Aichi"
        ),

        // 12 — Electronics Assembly
        "12": JobDetail(
            job: JobsListViewModel.mockJobs[11],
            description: """
            Fukuoka Tech Industries produces semiconductor components and electronic circuit boards \
            for consumer electronics. Our cleanroom facility requires precision and attention to \
            detail. You'll perform micro-assembly, soldering, visual inspection, and quality testing. \
            This is highly skilled work in a comfortable indoor environment. Fukuoka is known for \
            great food, reasonable cost of living, and a growing tech ecosystem.
            """,
            requirements: [
                "Experience with electronic assembly or precision manufacturing.",
                "Steady hands and excellent visual acuity.",
                "Ability to work in cleanroom conditions (gowning, no jewelry).",
                "Basic understanding of ESD (electrostatic discharge) protocols.",
                "JLPT N4+ for safety and quality documentation.",
            ],
            benefits: [
                "Visa sponsorship provided",
                "Cleanroom work (comfortable temperature year-round)",
                "Company apartments (modern, near Hakata station area)",
                "Technical certification support and career advancement",
                "Profit-sharing bonus (annual)",
                "Paid training on latest electronics manufacturing techniques",
            ],
            employmentType: "Full-time",
            isVisaSponsored: true,
            locationDetail: "Fukuoka"
        ),

        // 13 — Welding & Metal Fabrication
        "13": JobDetail(
            job: JobsListViewModel.mockJobs[12],
            description: """
            Kobe Steel Works is one of the most respected metal fabrication companies in the Kansai \
            region. We produce structural steel components for bridges, buildings, and marine vessels. \
            As a welding and fabrication staff member, you'll work with MIG, TIG, and arc welding on \
            high-grade steel and aluminum. Our welders are among the highest-paid skilled workers in \
            Japan. Experienced welders can earn significantly above the posted range.
            """,
            requirements: [
                "Minimum 3 years of professional welding experience (MIG/TIG/Arc).",
                "JIS welding certification or equivalent international qualification.",
                "Ability to read technical drawings and blueprints.",
                "JLPT N4 or conversational Japanese for team communication.",
                "Willingness to work with heavy materials in industrial settings.",
                "Safety-first mindset — strict adherence to protocols.",
            ],
            benefits: [
                "Visa sponsorship + JIS certification support",
                "Company housing (private room, ¥10,000/mo)",
                "Highest pay range for SSW skilled workers",
                "Welding equipment and safety gear provided",
                "Quarterly performance bonuses",
                "Annual skills competition with cash prizes",
                "Pathway to SSW Type 2 (indefinite renewal)",
            ],
            employmentType: "Full-time",
            isVisaSponsored: true,
            locationDetail: "Kobe, Hyogo"
        ),
    ]
}
