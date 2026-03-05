package com.senpaij.jepang.core.navigation

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class NavigationManagerTest {

    @Test
    fun `navigate emits expected route`() = runTest {
        val manager = NavigationManager()
        val commandDeferred = async { manager.commands.first() }
        runCurrent()

        manager.navigate(AppRoute.JobsList)

        val command = commandDeferred.await()
        assertTrue(command is NavigationCommand.Navigate)
        assertEquals(AppRoutePattern.JOBS_LIST, (command as NavigationCommand.Navigate).route)
    }

    @Test
    fun `replace emits replace command`() = runTest {
        val manager = NavigationManager()
        val commandDeferred = async { manager.commands.first() }
        runCurrent()

        manager.replace(AppRoute.Login)

        val command = commandDeferred.await()
        assertTrue(command is NavigationCommand.Replace)
        assertEquals(AppRoutePattern.LOGIN, (command as NavigationCommand.Replace).route)
    }
}
