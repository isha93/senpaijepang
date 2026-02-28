import SwiftUI

struct SettingsView: View {
    @ObservedObject private var langManager = LanguageManager.shared
    
    var body: some View {
        List {
            Section {
                Menu {
                    ForEach(AppLanguage.allCases) { language in
                        Button {
                            langManager.setLanguage(language)
                        } label: {
                            HStack {
                                Text(language.displayName)
                                if langManager.currentLanguage == language {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }
                } label: {
                    HStack {
                        LText("Language")
                            .foregroundStyle(AppTheme.textPrimary)
                        Spacer()
                        Text(langManager.currentLanguage.displayName)
                            .foregroundStyle(AppTheme.textSecondary)
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textTertiary)
                    }
                }
            } header: {
                LText("App Settings")
            }
        }
        .navigationTitle(langManager.localize(key: "Settings"))
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .tabBar)
        #endif
    }
}
