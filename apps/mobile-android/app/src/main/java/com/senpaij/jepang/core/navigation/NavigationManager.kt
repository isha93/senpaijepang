package com.senpaij.jepang.core.navigation

import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

class NavigationManager : NavigationHandler {
    private val _commands = MutableSharedFlow<NavigationCommand>(
        replay = 0,
        extraBufferCapacity = 32,
        onBufferOverflow = BufferOverflow.DROP_OLDEST,
    )
    val commands: SharedFlow<NavigationCommand> = _commands.asSharedFlow()

    override fun navigate(route: AppRoute) {
        _commands.tryEmit(NavigationCommand.Navigate(route.route))
    }

    override fun replace(route: AppRoute) {
        _commands.tryEmit(NavigationCommand.Replace(route.route))
    }

    override fun back() {
        _commands.tryEmit(NavigationCommand.Back)
    }

    override fun popToRoot() {
        _commands.tryEmit(NavigationCommand.PopToRoot)
    }
}
