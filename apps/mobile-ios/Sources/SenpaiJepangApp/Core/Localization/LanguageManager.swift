import Foundation
import SwiftUI

enum AppLanguage: String, CaseIterable, Identifiable {
    case indonesian = "id"
    case english = "en"
    
    var id: String { rawValue }
    
    var displayName: String {
        switch self {
        case .indonesian: return "Bahasa Indonesia"
        case .english: return "English"
        }
    }
}

@MainActor
final class LanguageManager: ObservableObject {
    static let shared = LanguageManager()
    
    @AppStorage("selected_app_language") private var storedLanguage: String = AppLanguage.indonesian.rawValue
    
    @Published var currentLanguage: AppLanguage {
        didSet {
            storedLanguage = currentLanguage.rawValue
        }
    }
    
    private init() {
        self.currentLanguage = AppLanguage(rawValue: UserDefaults.standard.string(forKey: "selected_app_language") ?? AppLanguage.indonesian.rawValue) ?? .indonesian
    }
    
    func setLanguage(_ language: AppLanguage) {
        withAnimation {
            currentLanguage = language
        }
    }
    
    func localize(key: String) -> String {
        guard let dict = translations[currentLanguage], let translated = dict[key] else {
            return key // Fallback to key if translation missing
        }
        return translated
    }
}

// Global dictionary for translations to avoid messing with Localizable.strings and project file UUIDs
private let translations: [AppLanguage: [String: String]] = [
    .indonesian: [
        // Tabs
        "Home": "Beranda",
        "Jobs": "Pekerjaan",
        "Journey": "Perjalanan",
        "Profile": "Profil",
        
        // Home Feed
        "Updates for Japan": "Info Seputar Jepang",
        "Search news, visa info...": "Cari berita, info visa...",
        "%@ articles": "%@ artikel",
        "Trending": "Sedang Hangat",
        "Complete your profile": "Lengkapi profil Anda",
        "Get verified to apply for high-salary jobs": "Verifikasi profil untuk melamar pekerjaan gaji tinggi",
        "%@% Completed": "%@% Selesai",
        "All": "Semua",
        "Visa Info": "Info Visa",
        "Safety": "Keamanan",
        "Job Market": "Pasar Kerja",
        "Living Guide": "Panduan Hidup",
        "Community": "Komunitas",
        
        // Feed Card
        "Saved": "Tersimpan",
        "Login to save": "Masuk untuk simpan",
        
        // Jobs
        "Search jobs, companies...": "Cari pekerjaan, perusahaan...",
        "%@ jobs": "%@ pekerjaan",
        "View Detail": "Lihat Detail",
        "Posted %@ ago": "Diposting %@ yang lalu",
        
        // Saved Jobs
        "Saved Jobs": "Pekerjaan Tersimpan",
        
        // Job Detail
        "Verified Employer": "Pemberi Kerja Terverifikasi",
        "Overview": "Ringkasan",
        "Requirements": "Persyaratan",
        "Apply Now": "Lamar Sekarang",
        
        // Profile
        "My Profile": "Profil Saya",
        "Trust Score": "Nilai Kepercayaan",
        "Status": "Status",
        "Profile Completion": "Kelengkapan Profil",
        "Complete your profile to apply for jobs": "Lengkapi profil Anda untuk melamar pekerjaan",
        "Verification Documents": "Dokumen Verifikasi",
        "Verify your identity": "Verifikasi identitas Anda",
        "Complete all steps to apply for high-salary jobs in Japan.": "Selesaikan semua tahapan untuk melamar pekerjaan bergaji tinggi di Jepang.",
        "Request Final Verification": "Ajukan Verifikasi Akhir",
        "Settings": "Pengaturan",
        
        // Document Status
        "Verified": "Terverifikasi",
        "Pending Review": "Menunggu Ulasan",
        "Upload": "Unggah",
        "Upload Required": "Wajib Diunggah",
        
        // Settings
        "Language": "Bahasa",
        "App Settings": "Pengaturan Aplikasi"
    ],
    
    .english: [
        // Tabs
        "Home": "Home",
        "Jobs": "Jobs",
        "Journey": "Journey",
        "Profile": "Profile",
        
        // Home Feed
        "Updates for Japan": "Updates for Japan",
        "Search news, visa info...": "Search news, visa info...",
        "%@ articles": "%@ articles",
        "Trending": "Trending",
        "Complete your profile": "Complete your profile",
        "Get verified to apply for high-salary jobs": "Get verified to apply for high-salary jobs",
        "%@% Completed": "%@% Completed",
        "All": "All",
        "Visa Info": "Visa Info",
        "Safety": "Safety",
        "Job Market": "Job Market",
        "Living Guide": "Living Guide",
        "Community": "Community",
        
        // Feed Card
        "Saved": "Saved",
        "Login to save": "Login to save",
        
        // Jobs
        "Search jobs, companies...": "Search jobs, companies...",
        "%@ jobs": "%@ jobs",
        "View Detail": "View Detail",
        "Posted %@ ago": "Posted %@ ago",
        
        // Saved Jobs
        "Saved Jobs": "Saved Jobs",
        
        // Job Detail
        "Verified Employer": "Verified Employer",
        "Overview": "Overview",
        "Requirements": "Requirements",
        "Apply Now": "Apply Now",
        
        // Profile
        "My Profile": "My Profile",
        "Trust Score": "Trust Score",
        "Status": "Status",
        "Profile Completion": "Profile Completion",
        "Complete your profile to apply for jobs": "Complete your profile to apply for jobs",
        "Verification Documents": "Verification Documents",
        "Verify your identity": "Verify your identity",
        "Complete all steps to apply for high-salary jobs in Japan.": "Complete all steps to apply for high-salary jobs in Japan.",
        "Request Final Verification": "Request Final Verification",
        "Settings": "Settings",
        
        // Document Status
        "Verified": "Verified",
        "Pending Review": "Pending Review",
        "Upload": "Upload",
        "Upload Required": "Upload Required",
        
        // Settings
        "Language": "Language",
        "App Settings": "App Settings"
    ]
]

// String extension for easy localization
extension String {
    @MainActor
    func localized() -> String {
        return LanguageManager.shared.localize(key: self)
    }
}

// SwiftUI View wrapper for automatic updates
struct LText: View {
    let key: String
    @ObservedObject private var langManager = LanguageManager.shared
    
    init(_ key: String) {
        self.key = key
    }
    
    var body: some View {
        Text(langManager.localize(key: key))
    }
}
