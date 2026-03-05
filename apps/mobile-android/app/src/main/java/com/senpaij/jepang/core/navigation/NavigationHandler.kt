package com.senpaij.jepang.core.navigation

interface NavigationHandler {
    fun navigate(route: AppRoute)
    fun replace(route: AppRoute)
    fun back()
    fun popToRoot()
}
