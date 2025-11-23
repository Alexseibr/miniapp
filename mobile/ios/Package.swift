// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "KufarCodeIOS",
    platforms: [
        .iOS(.v16)
    ],
    products: [
        .library(name: "KufarCodeIOS", targets: ["KufarCodeIOS"])
    ],
    targets: [
        .target(
            name: "KufarCodeIOS",
            path: "Sources"
        )
    ]
)
