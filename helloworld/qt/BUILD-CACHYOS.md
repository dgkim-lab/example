# Building on CachyOS

This project is a Qt Widgets application built with CMake. CachyOS uses the
Arch Linux package manager, `pacman`.

## Install the required packages

Open a terminal and install the compiler toolchain, CMake, and Qt 6 Widgets:

```bash
sudo pacman -S --needed base-devel cmake qt6-base
```

The `base-devel` package provides the standard C/C++ build tools. `qt6-base`
provides the Qt 6 headers, libraries, CMake package files, and Qt build tools
needed by this application.

If the system has not been updated recently, update it first:

```bash
sudo pacman -Syu
```

## Configure and build

From this directory (`example/helloworld/qt`), run:

```bash
cmake -S . -B build
cmake --build build
```

## Run the application

```bash
./build/hello-world
```

The app has a **Help** menu with **About Hello World** and **About Qt**. The
About dialog can also be opened with `Ctrl+Shift+A`.

## Optional: use Ninja

For faster incremental builds, install Ninja and use it as the CMake
generator:

```bash
sudo pacman -S --needed ninja
cmake -S . -B build-ninja -G Ninja
cmake --build build-ninja
./build-ninja/hello-world
```

## Package references

- [`qt6-base`](https://archlinux.org/packages/extra/x86_64/qt6-base/)
- [`cmake`](https://archlinux.org/packages/extra/x86_64/cmake/)
- [`base-devel`](https://archlinux.org/packages/core/any/base-devel/)
