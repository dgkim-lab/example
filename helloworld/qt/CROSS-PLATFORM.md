# Cross-platform builds

The application uses portable Qt Widgets APIs and can be built for Linux,
Windows, and macOS. Build separately for each target platform; a binary built
for one operating system cannot run directly on another.

The custom stylesheet is limited to the central content view. Window chrome,
menus, and dialogs use the Qt style and system palette available on the target
platform.

## Common requirements

- A C++17 compiler
- CMake
- Qt 6 Widgets, or Qt 5 Widgets as a fallback

Use a separate build directory for every platform, compiler, architecture, and
Qt version. Do not reuse a Linux CMake build directory on Windows or macOS.

## Linux

Install Qt development packages and CMake using the distribution package
manager, then run:

```sh
cmake -S . -B build
cmake --build build --parallel
./build/hello-world
```

See [BUILD-CACHYOS.md](BUILD-CACHYOS.md) for CachyOS-specific instructions.

## Windows

Install Qt for Windows with either the MSVC or MinGW toolchain. The compiler
used to build the application must be compatible with the selected Qt package.

For an MSVC Qt installation, run from a Visual Studio developer shell:

```powershell
cmake -S . -B build -DCMAKE_PREFIX_PATH=C:\Qt\6.x.x\msvc2022_64
cmake --build build --config Release
```

For a multi-configuration generator, the executable is normally produced at:

```text
build\Release\hello-world.exe
```

Before distributing it, copy its Qt runtime dependencies with the deployment
tool from the same Qt installation:

```powershell
C:\Qt\6.x.x\msvc2022_64\bin\windeployqt.exe build\Release\hello-world.exe
```

For a MinGW build, select the matching MinGW Qt package and toolchain. Do not
mix an MSVC Qt package with MinGW, or the reverse.

## macOS

Install Xcode command-line tools, CMake, and Qt for macOS, then run:

```sh
cmake -S . -B build -DCMAKE_PREFIX_PATH="$HOME/Qt/6.x.x/macos"
cmake --build build --parallel
./build/hello-world
```

The current CMake target produces a normal executable. For a distributable
macOS application bundle, raise the minimum CMake version to at least 3.21.1
and declare the target as a bundle:

```cmake
cmake_minimum_required(VERSION 3.21.1)

add_executable(hello-world
    WIN32
    MACOSX_BUNDLE
    main.cpp
)
```

The `WIN32` option also prevents a console window from appearing in a Windows
GUI build. Both options are ignored where they do not apply.

After building on macOS, bundle the required Qt frameworks and plugins:

```sh
"$HOME/Qt/6.x.x/macos/bin/macdeployqt" build/hello-world.app
```

Code signing and notarization are separate steps required for normal public
distribution outside a local development machine.

## Cross-compiling from Linux

### Windows target

Cross-compiling a Windows executable on Linux is possible, but requires all of
the following:

- A MinGW-w64 cross-compiler
- Qt libraries built for the Windows target
- Compatible Qt host tools for Linux
- A CMake toolchain file describing the Windows compiler and target paths

A typical configure command has this form:

```sh
cmake -S . -B build-windows \
  -DCMAKE_TOOLCHAIN_FILE=/path/to/windows-toolchain.cmake \
  -DCMAKE_PREFIX_PATH=/path/to/windows-qt
cmake --build build-windows --parallel
```

The exact paths and compiler names depend on how the Windows-targeting Qt SDK
was produced. Test the resulting executable on Windows, and package the Windows
Qt DLLs and plugins before distribution.

### macOS target

Building a production macOS application directly on Linux is not recommended.
It requires an Apple SDK and a nonstandard cross-toolchain, while signing,
notarization, deployment tooling, and reliable testing still require macOS.

Use a Mac or a macOS CI runner for the macOS build. In practice, the most
reliable release setup is a native build matrix:

- Linux runner for Linux artifacts
- Windows runner for Windows artifacts
- macOS runner for macOS artifacts

## References

- [Qt supported platforms](https://doc.qt.io/qt-6/supported-platforms.html)
- [Building Qt projects with CMake](https://doc.qt.io/qt-6/cmake-build-on-cmdline.html)
- [Cross-compiling Qt](https://doc.qt.io/qt-6/cross-compiling-qt.html)
- [Deploying Qt applications on Windows](https://doc.qt.io/qt-6/windows-deployment.html)
- [Deploying Qt applications on macOS](https://doc.qt.io/qt-6/macos-deployment.html)
