// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "SenpaiMobileCore",
    platforms: [
        .iOS(.v17),
        .macOS(.v15)
    ],
    products: [
        .library(
            name: "SenpaiMobileCore",
            targets: ["SenpaiMobileCore"]
        )
    ],
    targets: [
        .target(
            name: "SenpaiMobileCore",
            path: "Sources/SenpaiMobileCore"
        ),
        .testTarget(
            name: "SenpaiMobileCoreTests",
            dependencies: ["SenpaiMobileCore"],
            path: "Tests/SenpaiMobileCoreTests"
        )
    ]
)
