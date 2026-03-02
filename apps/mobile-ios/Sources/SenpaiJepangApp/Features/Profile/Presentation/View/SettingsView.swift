import SwiftUI

struct SettingsView: View {
    @ObservedObject private var langManager = LanguageManager.shared
    @State private var showLogoutConfirmation = false

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
                        Image(systemName: "globe")
                            .foregroundStyle(AppTheme.accent)
                            .frame(width: 28)
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

            Section {
                Button(role: .destructive) {
                    showLogoutConfirmation = true
                } label: {
                    HStack {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                            .foregroundStyle(.red)
                            .frame(width: 28)
                        LText("Log Out")
                            .foregroundStyle(.red)
                    }
                }
            } header: {
                LText("Account")
            }
        }
        .navigationTitle(langManager.localize(key: "Settings"))
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .tabBar)
        #endif
        .alert("Log Out", isPresented: $showLogoutConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Log Out", role: .destructive) {
                AuthStateManager.shared.logout()
            }
        } message: {
            Text("Are you sure you want to log out?")
        }
    }
}
