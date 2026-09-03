# Hello World Qt

A small modern Qt Widgets desktop app for Linux. It includes a centered greeting, an interactive **Say hello** button, and a Help menu with About dialogs.

## Build

Install Qt development packages and CMake, then run:

```sh
cmake -S . -B build
cmake --build build
./build/hello-world
```

The project supports Qt 6 and falls back to Qt 5 when Qt 6 is unavailable.

For CachyOS package installation and build instructions, see
[BUILD-CACHYOS.md](BUILD-CACHYOS.md).

For Windows, macOS, deployment, and cross-compilation guidance, see
[CROSS-PLATFORM.md](CROSS-PLATFORM.md).
