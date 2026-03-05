package com.senpaij.jepang.core.navigation

sealed interface NavigationCommand {
    data class Navigate(
        val route: String,
        val launchSingleTop: Boolean = true,
    ) : NavigationCommand

    data class Replace(val route: String) : NavigationCommand
    data object Back : NavigationCommand
    data object PopToRoot : NavigationCommand
}
