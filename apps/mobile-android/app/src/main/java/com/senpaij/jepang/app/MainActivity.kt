package com.senpaij.jepang.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.senpaij.jepang.core.theme.SenpaiJepangTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            SenpaiJepangTheme {
                SenpaiJepangApp()
            }
        }
    }
}
